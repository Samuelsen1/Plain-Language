/**
 * AI Assistant & Navitoir (Navigator)
 * - AI: answers questions from course content (keyword-based search over extracted text)
 * - Navitoir: lesson/block navigation + accessibility control
 */
(function() {
  'use strict';

  const PANEL_W = 360;
  const NAV_PANEL_W = 340;

  function stripHtml(html) {
    if (!html || typeof html !== 'string') return '';
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function tokenize(t) {
    return (t || '').toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function scoreMatch(queryTokens, text) {
    const words = tokenize(text);
    const set = new Set(words);
    let n = 0;
    for (const q of queryTokens) {
      if (set.has(q)) n++;
      else if (words.some(w => w.indexOf(q) >= 0 || q.indexOf(w) >= 0)) n += 0.5;
    }
    return queryTokens.length ? n / queryTokens.length : 0;
  }

  // --- Course index & TOC ---
  var courseIndex = [];  // { text, lessonId, blockId, lessonTitle, type }
  var courseToc = [];    // { lessonId, lessonTitle, blocks: [{ blockId, title }] }

  function extractFromBlock(block, acc, lessonTitle, lessonId) {
    if (!block || !block.items) return;
    const blockId = block.id || '';
    function walk(o) {
      if (!o) return;
      if (o.heading) acc.push({ text: stripHtml(o.heading), lessonId, blockId, lessonTitle, type: 'heading' });
      if (o.paragraph) acc.push({ text: stripHtml(o.paragraph), lessonId, blockId, lessonTitle, type: 'paragraph' });
      if (o.caption) acc.push({ text: stripHtml(o.caption), lessonId, blockId, lessonTitle, type: 'caption' });
      if (o.title && (o.answers || o.type === 'knowledgeCheck' || o.type === 'MULTIPLE_RESPONSE')) acc.push({ text: stripHtml(o.title), lessonId, blockId, lessonTitle, type: 'question' });
      if (o.answers) for (const a of o.answers) if (a.title) acc.push({ text: stripHtml(a.title), lessonId, blockId, lessonTitle, type: 'answer', correct: a.correct });
      if (Array.isArray(o.items)) o.items.forEach(walk);
      if (Array.isArray(o.slides)) o.slides.forEach(s => { if (s.description) acc.push({ text: stripHtml(s.description), lessonId, blockId, lessonTitle, type: 'slide' }); walk(s); });
    }
    block.items.forEach(walk);
  }

  function getBlockTitle(block) {
    if (!block || !block.items) return 'Section';
    for (const it of block.items) {
      if (it.heading) return stripHtml(it.heading).slice(0, 80) || 'Section';
      if (it.paragraph) return stripHtml(it.paragraph).slice(0, 60) || 'Section';
      if (it.title) return stripHtml(it.title).slice(0, 60) || 'Section';
    }
    return 'Section';
  }

  function buildFromCourse(course) {
    courseIndex = [];
    courseToc = [];
    const lessons = (course && course.lessons) || [];
    lessons.forEach(function(les) {
      const lessonId = les.id || '';
      const lessonTitle = stripHtml(les.title) || 'Lesson';
      const blocks = (les.items || []).map(function(bl) {
        extractFromBlock(bl, courseIndex, lessonTitle, lessonId);
        return { blockId: bl.id || '', title: getBlockTitle(bl) };
      });
      courseToc.push({ lessonId, lessonTitle, blocks });
    });
  }

  function answerFromCourse(q) {
    if (courseIndex.length === 0) return { ok: false, message: 'Course content is still loading. Please try again in a moment.' };
    const tokens = tokenize(q);
    if (!tokens.length) return { ok: false, message: 'Please ask a question about the course.' };
    var scored = courseIndex.map(function(entry) {
      return { entry: entry, score: scoreMatch(tokens, entry.text) };
    }).filter(function(x) { return x.score > 0; }).sort(function(a, b) { return b.score - a.score; });
    var top = scored.slice(0, 4);
    if (top.length === 0) {
      var topics = courseToc.slice(0, 5).map(function(t) { return t.lessonTitle; }).filter(Boolean);
      return { ok: false, message: 'I couldn\'t find that in the course. Try rephrasing or ask about: ' + (topics.join(', ') || 'plain language, inclusive communication.') + '.' };
    }
    var parts = [];
    parts.push('According to the course:');
    top.forEach(function(t) {
      var e = t.entry;
      var excerpt = (e.text || '').slice(0, 320);
      if (excerpt.length < (e.text || '').length) excerpt += '…';
      if (excerpt) parts.push('• ' + excerpt);
    });
    return { ok: true, message: parts.join('\n\n') };
  }

  // --- Navigate to lesson/block ---
  function tryNavigate(lessonId, blockId) {
    // 1) Try Rise nav link
    var sel = 'a[href*="' + (lessonId || '').replace(/["\\]/g, '\\$&') + '"]';
    try {
      var a = document.querySelector(sel);
      if (a) { a.click(); return true; }
    } catch (e) {}
    // 2) Try data / id elements and scroll
    var ids = [
      blockId && ('[data-block-id="' + blockId + '"], [id="block-' + blockId + '"], [id="' + blockId + '"]'),
      lessonId && ('[data-lesson-id="' + lessonId + '"], [id="lesson-' + lessonId + '"], [id="' + lessonId + '"]')
    ].filter(Boolean);
    for (var i = 0; i < ids.length; i++) {
      try {
        var el = document.querySelector(ids[i]);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
      } catch (e) {}
    }
    // 3) Fallback: scroll app into view
    var app = document.getElementById('app');
    if (app) { app.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    return false;
  }

  // --- DOM: buttons and panels ---
  var aiOpen = false, navOpen = false;
  var aiBtn, aiPanel, navBtn, navPanel;
  var aiMessages, aiInput, aiSend;
  var navTocEl, navA11yEl;

  function createIcon(name) {
    var svg = '';
    if (name === 'nav') {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';
    } else {
      return null;
    }
    var div = document.createElement('div');
    div.innerHTML = svg;
    var el = div.firstElementChild;
    if (el) { el.setAttribute('aria-hidden', 'true'); el.style.width = '24px'; el.style.height = '24px'; el.style.flexShrink = '0'; }
    return el || document.createElement('span');
  }

  function createAIButton() {
    var btn = document.createElement('button');
    btn.id = 'ai-assistant-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'AI Assistant');
    btn.setAttribute('aria-expanded', 'false');
    btn.className = 'ai-nav-fab';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#10b981 0%,#059669 100%);box-shadow:0 10px 40px rgba(16,185,129,0.4);color:#fff;transition:transform .2s,box-shadow .2s;z-index:50;';
    var img = document.createElement('img');
    img.src = 'images/ai.png';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.style.cssText = 'width:28px;height:28px;object-fit:contain;filter:brightness(0) invert(1);';
    btn.appendChild(img);
    btn.addEventListener('click', function(e) { e.stopPropagation(); toggleAIPanel(); });
    return btn;
  }

  function createNavButton() {
    var btn = document.createElement('button');
    btn.id = 'navitoir-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Navitoir - Navigation Assistant');
    btn.setAttribute('aria-expanded', 'false');
    btn.className = 'ai-nav-fab';
    btn.style.cssText = 'position:fixed;bottom:92px;right:24px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);box-shadow:0 10px 40px rgba(99,102,241,0.4);color:#fff;transition:transform .2s,box-shadow .2s;z-index:50;';
    btn.appendChild(createIcon('nav'));
    btn.addEventListener('click', function(e) { e.stopPropagation(); toggleNavPanel(); });
    return btn;
  }

  function toggleAIPanel() {
    aiOpen = !aiOpen;
    if (aiPanel) aiPanel.classList.toggle('hidden', !aiOpen);
    if (aiBtn) aiBtn.setAttribute('aria-expanded', String(aiOpen));
    if (aiOpen && aiInput) { aiInput.focus(); }
  }

  function toggleNavPanel() {
    navOpen = !navOpen;
    if (navPanel) navPanel.classList.toggle('hidden', !navOpen);
    if (navBtn) navBtn.setAttribute('aria-expanded', String(navOpen));
    if (navOpen) { renderNavToc(); renderNavA11y(); }
  }

  function createAIPanel() {
    var wrap = document.createElement('div');
    wrap.id = 'ai-assistant-panel';
    wrap.className = 'hidden';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'AI Assistant');
    wrap.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:' + PANEL_W + 'px;max-width:96vw;max-height:80vh;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);z-index:10000;display:flex;flex-direction:column;background:rgba(255,255,255,0.98);border:3px solid #10b981;';

    var head = document.createElement('div');
    head.style.cssText = 'flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:linear-gradient(to right,#ecfdf5,#d1fae5);border-bottom:1px solid #d1fae5;';
    var headLeft = document.createElement('div');
    headLeft.style.cssText = 'display:flex;align-items:center;gap:12px;';
    var iconCircle = document.createElement('div');
    iconCircle.style.cssText = 'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    iconCircle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:20px;height:20px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    headLeft.appendChild(iconCircle);
    var txt = document.createElement('div');
    var h3 = document.createElement('h3');
    h3.style.cssText = 'margin:0;font-size:16px;font-weight:600;color:#065f46;';
    h3.textContent = 'Ask about the course';
    var sub = document.createElement('p');
    sub.style.cssText = 'margin:2px 0 0;font-size:12px;color:#047857;';
    sub.textContent = 'AI Assistant';
    txt.appendChild(h3); txt.appendChild(sub);
    headLeft.appendChild(txt);
    head.appendChild(headLeft);
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'width:32px;height:32px;border:0;background:transparent;color:#065f46;font-size:20px;cursor:pointer;border-radius:50%;';
    closeBtn.addEventListener('click', toggleAIPanel);
    head.appendChild(closeBtn);
    wrap.appendChild(head);

    aiMessages = document.createElement('div');
    aiMessages.style.cssText = 'flex:1;overflow-y:auto;padding:16px;font-size:14px;line-height:1.5;';
    var welcome = document.createElement('p');
    welcome.style.cssText = 'color:#4b5563;margin:0 0 12px;';
    welcome.textContent = 'Ask anything about the course. I answer from the course content only.';
    aiMessages.appendChild(welcome);
    wrap.appendChild(aiMessages);

    var foot = document.createElement('div');
    foot.style.cssText = 'flex-shrink:0;display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e5e7eb;';
    aiInput = document.createElement('input');
    aiInput.type = 'text';
    aiInput.placeholder = 'Ask a question...';
    aiInput.style.cssText = 'flex:1;padding:10px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;';
    aiSend = document.createElement('button');
    aiSend.type = 'button';
    aiSend.textContent = 'Send';
    aiSend.style.cssText = 'padding:10px 16px;border:0;border-radius:8px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;font-weight:500;cursor:pointer;';
    foot.appendChild(aiInput);
    foot.appendChild(aiSend);
    wrap.appendChild(foot);

    function send() {
      var q = (aiInput.value || '').trim();
      if (!q) return;
      aiInput.value = '';
      var userP = document.createElement('p');
      userP.style.cssText = 'margin:0 0 8px;padding:8px 12px;background:#059669;border-radius:8px;color:#fff;';
      userP.textContent = q;
      aiMessages.appendChild(userP);
      var res = answerFromCourse(q);
      var botP = document.createElement('p');
      botP.style.cssText = 'margin:0 0 12px;padding:8px 12px;background:#f3f4f6;border-radius:8px;color:#1f2937;white-space:pre-wrap;';
      botP.textContent = (res.ok ? '' : '') + res.message;
      aiMessages.appendChild(botP);
      aiMessages.scrollTop = aiMessages.scrollHeight;
    }
    aiSend.addEventListener('click', send);
    aiInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') send(); });

    return wrap;
  }

  function createNavPanel() {
    var wrap = document.createElement('div');
    wrap.id = 'navitoir-panel';
    wrap.className = 'hidden';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Navitoir');
    wrap.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:' + NAV_PANEL_W + 'px;max-width:96vw;max-height:80vh;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);z-index:10000;display:flex;flex-direction:column;background:rgba(255,255,255,0.98);border:2px solid rgba(216,180,254,0.3);';

    var head = document.createElement('div');
    head.style.cssText = 'flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#fff;';
    var h3 = document.createElement('h3');
    h3.style.cssText = 'margin:0;font-size:16px;font-weight:600;';
    h3.textContent = 'Navitoir';
    head.appendChild(h3);
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'width:32px;height:32px;border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer;border-radius:50%;';
    closeBtn.addEventListener('click', toggleNavPanel);
    head.appendChild(closeBtn);
    wrap.appendChild(head);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';

    var navLabel = document.createElement('div');
    navLabel.style.cssText = 'font-size:12px;font-weight:600;color:#4f46e5;margin-bottom:8px;text-transform:uppercase;';
    navLabel.textContent = 'Navigate';
    body.appendChild(navLabel);
    navTocEl = document.createElement('div');
    navTocEl.style.cssText = 'margin-bottom:16px;';
    body.appendChild(navTocEl);

    var a11yLabel = document.createElement('div');
    a11yLabel.style.cssText = 'font-size:12px;font-weight:600;color:#4f46e5;margin-bottom:8px;text-transform:uppercase;';
    a11yLabel.textContent = 'Accessibility';
    body.appendChild(a11yLabel);
    navA11yEl = document.createElement('div');
    navA11yEl.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
    body.appendChild(navA11yEl);

    wrap.appendChild(body);

    // Open full panel
    var openFull = document.createElement('button');
    openFull.textContent = 'Open full accessibility options';
    openFull.style.cssText = 'margin-top:12px;width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;background:#f9fafb;font-size:13px;cursor:pointer;';
    openFull.addEventListener('click', function() {
      if (window.A11yPortfolio && window.A11yPortfolio.openPanel) window.A11yPortfolio.openPanel();
    });
    body.appendChild(openFull);

    return wrap;
  }

  function renderNavToc() {
    if (!navTocEl) return;
    navTocEl.innerHTML = '';
    courseToc.forEach(function(les) {
      var lesDiv = document.createElement('div');
      lesDiv.style.cssText = 'margin-bottom:8px;';
      var lesTitle = document.createElement('div');
      lesTitle.style.cssText = 'font-weight:600;font-size:14px;color:#1f2937;margin-bottom:4px;';
      lesTitle.textContent = les.lessonTitle;
      lesDiv.appendChild(lesTitle);
      (les.blocks || []).forEach(function(b) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'display:block;width:100%;text-align:left;padding:6px 10px;margin:2px 0;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:13px;cursor:pointer;color:#374151;';
        btn.textContent = (b.title || 'Section').slice(0, 50) + (b.title && b.title.length > 50 ? '…' : '');
        btn.addEventListener('click', function() {
          tryNavigate(les.lessonId, b.blockId);
          toggleNavPanel();
        });
        lesDiv.appendChild(btn);
      });
      navTocEl.appendChild(lesDiv);
    });
    if (courseToc.length === 0) {
      var empty = document.createElement('p');
      empty.style.cssText = 'color:#6b7280;font-size:13px;';
      empty.textContent = 'Course outline will appear when the course has loaded.';
      navTocEl.appendChild(empty);
    }
  }

  function renderNavA11y() {
    if (!navA11yEl) return;
    navA11yEl.innerHTML = '';
    var a11y = window.A11yPortfolio;
    var cfg = (a11y && a11y.getConfig && a11y.getConfig()) || {};
    var st = (a11y && a11y.getState && a11y.getState()) || {};
    var keys = ['contrast','largeText','textSpacing','focusIndicator','textToSpeech','dyslexia','hideImages','blueLightFilter'];
    keys.forEach(function(k) {
      var c = cfg[k];
      if (!c) return;
      var v = st[k] || 0;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'padding:8px;border:1px solid #e5e7eb;border-radius:6px;background:' + (v > 0 ? '#eef2ff' : '#fff') + ';font-size:12px;cursor:pointer;color:#374151;';
      btn.textContent = (c.label || k) + (v > 0 ? ' On' : '');
      btn.addEventListener('click', function() {
        if (a11y && a11y.toggle) a11y.toggle(k);
        setTimeout(renderNavA11y, 50);
      });
      navA11yEl.appendChild(btn);
    });
  }

  function closePanelsOnClickOutside(e) {
    if (aiOpen && aiPanel && !aiPanel.contains(e.target) && aiBtn && !aiBtn.contains(e.target)) toggleAIPanel();
    if (navOpen && navPanel && !navPanel.contains(e.target) && navBtn && !navBtn.contains(e.target)) toggleNavPanel();
  }

  function init() {
    aiBtn = createAIButton();
    navBtn = createNavButton();
    aiPanel = createAIPanel();
    navPanel = createNavPanel();
    document.body.appendChild(aiBtn);
    document.body.appendChild(navBtn);
    document.body.appendChild(aiPanel);
    document.body.appendChild(navPanel);

    document.addEventListener('click', closePanelsOnClickOutside);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { if (aiOpen) toggleAIPanel(); if (navOpen) toggleNavPanel(); }
    });

    var fetch = window.__fetchCourse;
    if (typeof fetch === 'function') {
      fetch().then(function(data) {
        var course = (data && data.course) ? data.course : data;
        if (course) buildFromCourse(course);
      }).catch(function() {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
