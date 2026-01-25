/**
 * AI Assistant
 * - Answers questions from course content (keyword-based search over extracted text)
 */
(function() {
  'use strict';

  const PANEL_W = 360;

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

  // --- DOM: buttons and panels ---
  var aiOpen = false;
  var aiBtn, aiPanel, aiModalRoot;
  var aiMessages, aiInput, aiSend;
  var Z_MODAL = 999999;
  var Z_FAB = 999998;

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

  function toggleAIPanel() {
    aiOpen = !aiOpen;
    if (aiModalRoot) aiModalRoot.hidden = !aiOpen;
    if (aiBtn) aiBtn.setAttribute('aria-expanded', String(aiOpen));
    if (aiOpen && aiInput) { aiInput.focus(); }
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

    aiPanel = wrap;
    var root = document.createElement('div');
    root.id = 'ai-modal-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:' + Z_MODAL + ';display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    root.hidden = true;
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.35);cursor:pointer;';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', toggleAIPanel);
    root.appendChild(backdrop);
    root.appendChild(wrap);
    return root;
  }

  function closePanelsOnClickOutside(e) {
    if (aiModalRoot && aiModalRoot.contains(e.target)) return;
    if (aiOpen && aiPanel && !aiPanel.contains(e.target) && aiBtn && !aiBtn.contains(e.target)) toggleAIPanel();
  }

  function init() {
    aiBtn = createAIButton();
    aiModalRoot = createAIPanel();
    document.body.appendChild(aiBtn);
    document.body.appendChild(aiModalRoot);

    document.addEventListener('click', closePanelsOnClickOutside);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && aiOpen) toggleAIPanel();
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
