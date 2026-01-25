/**
 * AI Assistant & Navitoir
 * - AI: answers from course content only
 * - Navitoir: navigate to lessons + accessibility control
 * Both open only when their FAB is clicked; X, backdrop, and Escape close them.
 */
(function() {
  'use strict';

  const PANEL_W = 360;
  const NAV_PANEL_W = 400;

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

  function tryNavigate(lessonId, blockId) {
    var sel = 'a[href*="' + (lessonId || '').replace(/["\\]/g, '\\$&') + '"]';
    try {
      var a = document.querySelector(sel);
      if (a) { a.click(); return true; }
    } catch (e) {}
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
    var app = document.getElementById('app');
    if (app) { app.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    return false;
  }

  function handleNavitoirSubmit(raw) {
    var q = (raw || '').toLowerCase().trim();
    if (!q) return { message: 'Type a request or use a chip.', closePanel: false };
    var any = function(terms) { return terms.some(function(t) { return t && q.includes(t); }); };
    if (any(['accessibility', 'a11y', 'open accessibility', 'open a11y'])) {
      if (window.A11yPortfolio && window.A11yPortfolio.openPanel) window.A11yPortfolio.openPanel();
      return { message: '✅ Opening accessibility panel…', closePanel: true };
    }
    var a11yMap = [
      { terms: ['contrast'], key: 'contrast', name: 'Contrast' },
      { terms: ['text size', 'large text', 'font size', 'bigger text'], key: 'largeText', name: 'Large Text' },
      { terms: ['text spacing', 'spacing', 'letter spacing'], key: 'textSpacing', name: 'Text Spacing' },
      { terms: ['dyslexia', 'dyslexia font'], key: 'dyslexia', name: 'Dyslexia Friendly' },
      { terms: ['focus', 'focus indicator', 'focus ring'], key: 'focusIndicator', name: 'Focus Indicator' },
      { terms: ['hide images', 'images'], key: 'hideImages', name: 'Hide Images' },
      { terms: ['text to speech', 'tts', 'read aloud'], key: 'textToSpeech', name: 'Text to Speech' },
      { terms: ['blue light', 'blue light filter', 'bluelight'], key: 'blueLightFilter', name: 'Blue Light Filter' }
    ];
    var a11y = window.A11yPortfolio;
    var cfg = (a11y && a11y.getConfig && a11y.getConfig()) || {};
    var st = (a11y && a11y.getState && a11y.getState()) || {};
    for (var i = 0; i < a11yMap.length; i++) {
      var m = a11yMap[i];
      if (!m.terms.some(function(t) { return q.includes(t); })) continue;
      var key = m.key;
      if (!cfg[key] || !(key in st)) continue;
      var cur = st[key] || 0;
      var binary = cfg[key].binary;
      var maxL = (cfg[key].levels || 2);
      var levelMatch = q.match(/(?:level|stufe|auf|lvl|to)\s*(\d+)/i);
      var wantUp = any(['increase', 'max', 'up', 'more', 'on', 'turn on', 'enable']);
      var wantDown = any(['decrease', 'reduce', 'lower', 'less', 'off', 'turn off', 'disable']);
      var v = cur;
      if (levelMatch) { v = Math.max(0, Math.min(binary ? 1 : maxL, parseInt(levelMatch[1], 10))); if (binary) v = v ? 1 : 0; }
      else if (wantDown) v = binary ? 0 : Math.max(0, cur - 1);
      else if (wantUp || cur === 0) v = binary ? 1 : Math.min(maxL, cur + 1);
      if (v !== cur && a11y && a11y.set) { a11y.set(key, v); return { message: '✅ ' + m.name + ' ' + (v === 0 ? 'off' : 'on'), closePanel: false }; }
      return { message: 'ℹ️ ' + m.name + ' is already ' + (cur === 0 ? 'off' : 'on') + '.', closePanel: false };
    }
    for (var li = 0; li < courseToc.length; li++) {
      var les = courseToc[li];
      var lt = (les.lessonTitle || '').toLowerCase();
      if (lt && q.includes(lt)) { tryNavigate(les.lessonId, null); return { message: '✅ Navigating to ' + les.lessonTitle + '…', closePanel: true }; }
      var bls = les.blocks || [];
      for (var bi = 0; bi < bls.length; bi++) {
        var b = bls[bi];
        var bt = (b.title || '').toLowerCase();
        if (bt && q.includes(bt)) { tryNavigate(les.lessonId, b.blockId); return { message: '✅ Navigating to ' + (b.title || 'section') + '…', closePanel: true }; }
      }
    }
    var first = courseToc[0];
    return { message: 'I can navigate to a lesson or control accessibility. Try: "Go to ' + (first ? first.lessonTitle : 'Introduction') + '", "Open accessibility", "Increase text size".', closePanel: false };
  }

  // --- DOM: buttons and panels ---
  var aiOpen = false, navOpen = false;
  var aiBtn, aiPanel, aiModalRoot, navBtn, navPanel, navModalRoot;
  var aiMessages, aiInput, aiSend;
  var navMsgEl, navChipsEl, navInputEl, navOnNavitoirSend;
  var Z_MODAL = 999999;
  var Z_FAB = 999998;

  function createIcon(name) {
    if (name !== 'nav') return null;
    var div = document.createElement('div');
    div.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';
    var el = div.firstElementChild;
    if (el) { el.setAttribute('aria-hidden', 'true'); el.style.cssText = 'width:24px;height:24px;flex-shrink:0;'; }
    return el || document.createElement('span');
  }

  function createAIButton() {
    var btn = document.createElement('button');
    btn.id = 'ai-assistant-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'AI Assistant');
    btn.setAttribute('aria-expanded', 'false');
    btn.className = 'ai-nav-fab';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#10b981 0%,#059669 100%);box-shadow:0 10px 40px rgba(16,185,129,0.4);color:#fff;transition:transform .2s,box-shadow .2s;z-index:' + Z_FAB + ';';
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
    btn.style.cssText = 'position:fixed;bottom:92px;right:24px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);box-shadow:0 10px 40px rgba(99,102,241,0.4);color:#fff;transition:transform .2s,box-shadow .2s;z-index:' + Z_FAB + ';';
    btn.appendChild(createIcon('nav'));
    btn.addEventListener('click', function(e) { e.stopPropagation(); toggleNavPanel(); });
    return btn;
  }

  function toggleAIPanel() {
    aiOpen = !aiOpen;
    if (aiModalRoot) aiModalRoot.style.display = aiOpen ? 'flex' : 'none';
    if (aiBtn) aiBtn.setAttribute('aria-expanded', String(aiOpen));
    if (aiOpen && aiInput) { aiInput.focus(); }
  }

  function toggleNavPanel() {
    navOpen = !navOpen;
    if (navModalRoot) navModalRoot.style.display = navOpen ? 'flex' : 'none';
    if (navBtn) navBtn.setAttribute('aria-expanded', String(navOpen));
    if (navOpen) {
      renderNavitoirChips();
      if (navMsgEl && navMsgEl.children.length === 0) addNavitoirGreeting();
    }
  }

  function createAIPanel() {
    var wrap = document.createElement('div');
    wrap.id = 'ai-assistant-panel';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'AI Assistant');
    wrap.style.cssText = 'width:' + PANEL_W + 'px;max-width:96vw;max-height:80vh;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);display:flex;flex-direction:column;background:rgba(255,255,255,0.98);border:3px solid #10b981;position:relative;z-index:1;';

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
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleAIPanel(); });
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

    aiPanel = wrap;
    var root = document.createElement('div');
    root.id = 'ai-modal-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:' + Z_MODAL + ';display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.35);cursor:pointer;';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', function(e) { e.stopPropagation(); toggleAIPanel(); });
    root.appendChild(backdrop);
    root.appendChild(wrap);
    return root;
  }

  function createNavPanel() {
    var card = document.createElement('div');
    card.id = 'navitoir-panel';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Navitoir');
    card.style.cssText = 'width:min(' + NAV_PANEL_W + 'px,96vw);max-height:90vh;border-radius:24px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);display:flex;flex-direction:column;background:#fff;border:3px solid #6366f1;position:relative;z-index:1;';

    var head = document.createElement('div');
    head.style.cssText = 'flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #e5e7eb;background:linear-gradient(to right,#eef2ff,#f3e8ff);';
    var headLeft = document.createElement('div');
    headLeft.style.cssText = 'display:flex;align-items:center;gap:12px;';
    var iconCircle = document.createElement('div');
    iconCircle.style.cssText = 'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    iconCircle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:20px;height:20px"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';
    headLeft.appendChild(iconCircle);
    var txt = document.createElement('div');
    var h3 = document.createElement('h3');
    h3.style.cssText = 'margin:0;font-size:16px;font-weight:700;color:#1f2937;';
    h3.textContent = 'Navitoir';
    var sub = document.createElement('p');
    sub.style.cssText = 'margin:2px 0 0;font-size:12px;color:#6b7280;';
    sub.textContent = 'Navigation Assistant';
    txt.appendChild(h3); txt.appendChild(sub);
    headLeft.appendChild(txt);
    head.appendChild(headLeft);
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close Navitoir');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    closeBtn.style.cssText = 'padding:8px;border:0;background:transparent;color:#4b5563;cursor:pointer;border-radius:8px;';
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleNavPanel(); });
    head.appendChild(closeBtn);
    card.appendChild(head);

    navMsgEl = document.createElement('div');
    navMsgEl.style.cssText = 'flex:1;overflow-y:auto;padding:16px;min-height:120px;max-height:40vh;background:#f9fafb;';
    card.appendChild(navMsgEl);

    var chipsWrap = document.createElement('div');
    chipsWrap.style.cssText = 'flex-shrink:0;padding:0 16px 8px;';
    navChipsEl = document.createElement('div');
    navChipsEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    chipsWrap.appendChild(navChipsEl);
    card.appendChild(chipsWrap);

    var form = document.createElement('form');
    form.style.cssText = 'flex-shrink:0;padding:16px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px;align-items:center;';
    navInputEl = document.createElement('input');
    navInputEl.type = 'text';
    navInputEl.placeholder = 'Search or navigate to a section...';
    navInputEl.style.cssText = 'flex:1;padding:12px 16px;border:1px solid #d1d5db;border-radius:12px;font-size:14px;';
    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.setAttribute('aria-label', 'Submit');
    submitBtn.style.cssText = 'padding:12px 16px;border:0;border-radius:12px;background:#6366f1;color:#fff;cursor:pointer;';
    submitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
    form.appendChild(navInputEl);
    form.appendChild(submitBtn);
    card.appendChild(form);

    function onNavitoirSend(val) {
      var r = (val || '').trim();
      if (!r) return;
      if (navInputEl) navInputEl.value = '';
      var userD = document.createElement('div');
      userD.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:8px;';
      var userB = document.createElement('div');
      userB.style.cssText = 'max-width:80%;padding:12px 16px;border-radius:16px;background:#6366f1;color:#fff;font-size:14px;';
      userB.textContent = r;
      userD.appendChild(userB);
      navMsgEl.appendChild(userD);
      var res = handleNavitoirSubmit(r);
      var asstD = document.createElement('div');
      asstD.style.cssText = 'display:flex;justify-content:flex-start;margin-bottom:8px;';
      var asstB = document.createElement('div');
      asstB.style.cssText = 'max-width:80%;padding:12px 16px;border-radius:16px;background:#fff;border:1px solid #e5e7eb;font-size:14px;color:#1f2937;';
      asstB.textContent = res.message;
      asstD.appendChild(asstB);
      navMsgEl.appendChild(asstD);
      navMsgEl.scrollTop = navMsgEl.scrollHeight;
      if (res.closePanel) setTimeout(toggleNavPanel, 500);
    }
    form.addEventListener('submit', function(e) { e.preventDefault(); onNavitoirSend(navInputEl.value); });
    navOnNavitoirSend = onNavitoirSend;

    navPanel = card;
    var root = document.createElement('div');
    root.id = 'nav-modal-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:' + Z_MODAL + ';display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.35);cursor:pointer;';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', function(e) { e.stopPropagation(); toggleNavPanel(); });
    root.appendChild(backdrop);
    root.appendChild(card);
    return root;
  }

  function renderNavitoirChips() {
    if (!navChipsEl) return;
    navChipsEl.innerHTML = '';
    var chips = [];
    for (var i = 0; i < Math.min(2, courseToc.length); i++) {
      var les = courseToc[i];
      chips.push({ v: 'go to ' + (les.lessonTitle || ''), l: (les.lessonTitle || 'Lesson').slice(0, 30) });
    }
    if (courseToc[0] && (courseToc[0].blocks || []).length) {
      var bls = courseToc[0].blocks;
      for (var j = 0; j < Math.min(2, bls.length); j++) { chips.push({ v: 'show me ' + (bls[j].title || ''), l: (bls[j].title || 'Section').slice(0, 28) }); }
    }
    chips.push({ v: 'open accessibility', l: 'Open accessibility' }, { v: 'increase text size', l: 'Increase text size' }, { v: 'increase contrast', l: 'Increase contrast' });
    chips.forEach(function(c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = c.l;
      btn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:12px;cursor:pointer;color:#374151;';
      btn.addEventListener('click', function() { if (navOnNavitoirSend) navOnNavitoirSend(c.v); });
      navChipsEl.appendChild(btn);
    });
  }

  function addNavitoirGreeting() {
    if (!navMsgEl) return;
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:flex-start;margin-bottom:8px;';
    var b = document.createElement('div');
    b.style.cssText = 'max-width:85%;padding:12px 16px;border-radius:16px;background:#fff;border:1px solid #e5e7eb;font-size:14px;color:#374151;line-height:1.5;';
    b.textContent = "👋 Hi! I'm Navitoir, your navigation assistant. Say 'go to' or 'show me' to jump to a lesson. Say 'open accessibility' for options. Try the chips or type below.";
    d.appendChild(b);
    navMsgEl.appendChild(d);
  }

  function closePanelsOnClickOutside(e) {
    if (aiModalRoot && aiModalRoot.contains(e.target)) return;
    if (navModalRoot && navModalRoot.contains(e.target)) return;
    if (aiOpen && aiPanel && !aiPanel.contains(e.target) && aiBtn && !aiBtn.contains(e.target)) toggleAIPanel();
    if (navOpen && navPanel && !navPanel.contains(e.target) && navBtn && !navBtn.contains(e.target)) toggleNavPanel();
  }

  function init() {
    aiBtn = createAIButton();
    navBtn = createNavButton();
    aiModalRoot = createAIPanel();
    navModalRoot = createNavPanel();
    document.body.appendChild(aiBtn);
    document.body.appendChild(navBtn);
    document.body.appendChild(aiModalRoot);
    document.body.appendChild(navModalRoot);

    document.addEventListener('click', closePanelsOnClickOutside);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { if (aiOpen) { toggleAIPanel(); return; } if (navOpen) toggleNavPanel(); }
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
