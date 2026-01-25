/**
 * AI Assistant
 * Answers from course content only. Opens when FAB is clicked; X, backdrop, and Escape close it.
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
      // Only partial when the doc word contains the query (e.g. "inclusive" in "inclusively");
      // avoid "objectives" matching doc "object" (q contains w would give false positive)
      else if (words.some(function(w) { return w.length >= 3 && w.indexOf(q) >= 0; })) n += 0.5;
    }
    return queryTokens.length ? n / queryTokens.length : 0;
  }

  /** Clean text: fix spaces, punctuation, and capitalization. */
  function cleanText(s) {
    if (!s || typeof s !== 'string') return '';
    var t = s.replace(/\s+/g, ' ').trim();
    t = t.replace(/\s+([.,;:!?])/g, '$1');
    if (t && !/[.?!]$/.test(t) && !/…$/.test(t)) t = t.replace(/\s*$/, '.');
    if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
    if (t && /[.?!]$/.test(t)) t = t.replace(/[.?!]+$/, function(m) { return m.charAt(0); });
    // Ensure space after .?! when followed by letter (fixes "language.Apply", "strategies.Use")
    t = t.replace(/([.?!])([A-Za-z])/g, '$1 $2');
    // Fix run-together like "you'llRecognise" (contraction directly followed by capital)
    t = t.replace(/([a-z]'[a-z]*)([A-Z])/g, '$1 $2');
    return t;
  }

  /**
   * Simplify content before showing as answer: remove parentheticals, fix run-together, trim to essentials.
   * No external API; pure local simplification for concise, readable answers.
   */
  function simplifyForAnswer(text, intent) {
    if (!text || typeof text !== 'string') return '';
    var t = text.replace(/\s+/g, ' ').trim();
    // Remove parenthetical asides: (…), (X = Y), (47 words — …)
    t = t.replace(/\s*\([^)]*\)\s*/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    // Fix run-together list items: "LanguageShort Sentences", "SentencesActive Voice", "VoiceFamiliar Words"
    // (lowercase letter immediately followed by uppercase word/phrase) -> newline + bullet
    t = t.replace(/([a-z])([A-Z][a-z]+(?:\s+[\w&]+)*)/g, '$1\n• $2');
    // Key Principles list: "Short SentencesActive VoiceFamiliar Words" -> proper bullets
    t = t.replace(/Key Principles of Plain Language(?=\s*Short Sentences)/i, 'Key Principles of Plain Language\n• ');
    t = t.replace(/Short Sentences(?=[A-Z])/g, 'Short Sentences\n• ');
    t = t.replace(/Active Voice(?=[A-Z])/g, 'Active Voice\n• ');
    // Remove trailing unclosed parenthetical (e.g. "(British expression." when cut mid-sentence)
    t = t.replace(/\s*\([^)]*$/g, '');
    t = t.replace(/\s+/g, ' ').trim();
    if (intent === 'objectives') {
      // Extract the 3 objectives: Recognise…, Apply…, Use…
      var re = /(Recognise\s+[^.!?]+[.!?]|Apply\s+[^.!?]+[.!?]|Use\s+[^.!?]+[.!?])/gi;
      var ms = t.match(re);
      if (ms && ms.length >= 1) {
        return ms.slice(0, 3).map(function(s) { return '• ' + cleanText(s); }).join('\n');
      }
      // Fallback: find sentences containing Recognise/Apply/Use and take the objective phrase
      var sents = t.split(/(?<=[.!?])\s+/);
      var taken = [];
      for (var i = 0; i < sents.length && taken.length < 3; i++) {
        var s = sents[i];
        if (/(Recognise|Apply|Use)\s+/i.test(s) && s.length < 130) {
          var m = s.match(/(Recognise|Apply|Use)\s+[^.!?]+[.!?]/i);
          taken.push(m ? m[0] : s);
        }
      }
      if (taken.length) return taken.map(function(s) { return '• ' + cleanText(s); }).join('\n');
    }
    // If run-together fix produced list lines, keep them (up to 6 lines) and return
    if (/\n• /.test(t)) {
      var lines = t.split('\n').filter(function(l) { return l.trim().length > 0; });
      return lines.slice(0, 6).join('\n');
    }
    // General: first 1–2 sentences, max ~220 chars (was 140; definitions need room to be complete)
    var sep = t.replace(/([.?!])\s+/g, '$1\n').split('\n');
    var taken = [];
    var len = 0;
    for (var i = 0; i < sep.length && len < 220 && taken.length < 2; i++) {
      var s = sep[i].trim();
      if (s.length >= 10) { taken.push(s); len += s.length; }
    }
    return cleanText(taken.length ? taken.join(' ') : t.slice(0, 200));
  }

  /**
   * Get the 1–2 most relevant sentences from text (by query token overlap and optional focus).
   * opts.focusTerm: 'passive' = only sentences about passive voice; 'active' = only about active voice.
   */
  function pickRelevantSentences(text, queryTokens, maxLen, opts) {
    maxLen = maxLen || 200;
    opts = opts || {};
    if (!text || !queryTokens.length) return '';
    // Split on [.?!] followed by space, and on [.?!] directly before uppercase (e.g. "language.Apply")
    var block = text.replace(/([.?!])([A-Z])/g, '$1\n$2').replace(/([.?!])\s+/g, '$1\n');
    var sentences = block.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length >= 12; });
    if (sentences.length === 0) {
      var z = text.slice(0, maxLen);
      return cleanText(z + (text.length > maxLen ? '…' : ''));
    }
    // When user asks only about passive or only about active voice, keep just those sentences (avoid irrelevant half).
    if (opts.focusTerm === 'passive') {
      var p = sentences.filter(function(s) { return /Passive voice|passive voice/i.test(s); });
      if (p.length > 0) sentences = p;
    } else if (opts.focusTerm === 'active') {
      var a = sentences.filter(function(s) { return /Active voice|active voice/i.test(s); });
      if (a.length > 0) sentences = a;
    }
    // When asking about familiar words: exclude table example cells (British, Bob's your uncle, Egress, etc.).
    if (opts.excludeTableExamples) {
      var fam = sentences.filter(function(s) { return !/British|your uncle|Egress|Bob's|Not Recommended/i.test(s); });
      if (fam.length > 0) sentences = fam;
    }
    var withScore = [];
    for (var i = 0; i < sentences.length; i++) {
      var sc = scoreMatch(queryTokens, sentences[i]);
      if (sc > 0) withScore.push({ s: sentences[i], sc: sc });
    }
    withScore.sort(function(a, b) { return b.sc - a.sc; });
    var taken = withScore.slice(0, 2).map(function(x) { return x.s; });
    if (taken.length === 0) {
      var fall = text.slice(0, maxLen);
      return cleanText(fall + (text.length > maxLen ? '…' : ''));
    }
    var out = taken.join(' ').trim();
    // Prefer cutting at a sentence boundary; only truncate with … when necessary
    if (out.length > maxLen) {
      var at = out.lastIndexOf('. ', maxLen);
      if (at > maxLen * 0.6) out = out.slice(0, at + 1);
      else out = out.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
    }
    return cleanText(out);
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
    var tokens = tokenize(q);
    if (!tokens.length) return { ok: false, message: 'Please ask a question about the course.' };
    var MIN_SCORE = 0.35;
    var isDefinitional = /what is|define|meaning of|what does .+ mean/i.test(q);
    var isObjectives = /objectives?|goals?|learning outcomes?|what will I learn|what are the objectives/i.test(q);
    var wantExamples = /example|quiz|question|practice/i.test(q);
    // Exclude quiz items (question/answer) unless user asks for examples
    var typeOk = function(e) { return wantExamples || (e.type !== 'question' && e.type !== 'answer'); };
    // --- Objectives: explicit block match only ---
    if (isObjectives) {
      var obj = courseIndex.filter(function(e) {
        return typeOk(e) && (e.type === 'paragraph' || e.type === 'heading') &&
          /At the end of the course|Objectives\b/i.test(e.text) &&
          /Recognise|Apply|Use inclusive/i.test(e.text);
      })[0];
      if (obj) {
        var simple = simplifyForAnswer(obj.text, 'objectives');
        return { ok: true, message: 'According to the course, the objectives are:\n' + simple };
      }
    }
    // --- Inclusive language vs Plain language: require "inclusive" in the entry when the query asks about inclusive ---
    var askInclusive = /\binclusive\b/i.test(q);
    var pool = courseIndex.filter(function(e) { return typeOk(e); });
    if (askInclusive) {
      var inclusiveOnly = pool.filter(function(e) { return /inclusive/i.test(e.text); });
      if (inclusiveOnly.length === 0) {
        return { ok: false, message: 'I couldn\'t find a definition of inclusive language in the course. Try the "Inclusive Language" section, or ask "what is plain language" for the difference.' };
      }
      pool = inclusiveOnly;
    }
    // When asking about "plain language" (and not inclusive), restrict to entries that discuss plain language
    if (/\bplain\b/i.test(q) && /\blanguage\b/i.test(q) && !/\binclusive\b/i.test(q)) {
      var plainOnly = pool.filter(function(e) { return /plain\s+language|plain\s+language\s+means/i.test(e.text); });
      if (plainOnly.length > 0) pool = plainOnly;
    }
    // --- Topic-specific pool filters: active/passive, short sentences, key principles, familiar words, introduction ---
    if (/\b(active\s+voice|passive\s+voice)\b/i.test(q)) {
      var voiceOnly = pool.filter(function(e) { return /active\s+voice|passive\s+voice/i.test(e.text); });
      if (voiceOnly.length > 0) pool = voiceOnly;
    }
    if (/\bshort\s+sentences\b/i.test(q)) {
      var shortOnly = pool.filter(function(e) { return /short\s+sentences/i.test(e.text); });
      if (shortOnly.length > 0) pool = shortOnly;
    }
    if (/\b(key\s+principles?|principles\s+of\s+plain)\b/i.test(q)) {
      var princOnly = pool.filter(function(e) { return /key\s+principles|Short\s+Sentences|Active\s+Voice|Familiar\s+Words/i.test(e.text); });
      if (princOnly.length > 0) pool = princOnly;
    }
    if (/\b(familiar\s+words?|everyday\s+words?|common\s+words?)\b/i.test(q)) {
      var famOnly = pool.filter(function(e) { return /familiar\s+words|Familiar\s+Words|everyday|common\s+words/i.test(e.text); });
      if (famOnly.length > 0) pool = famOnly;
    }
    if (/\b(introduction|intro|what is this course|course about)\b/i.test(q)) {
      var introOnly = pool.filter(function(e) { return /In this course, you'll learn|workplace communication|Words shape/i.test(e.text); });
      if (introOnly.length > 0) pool = introOnly;
    }
    var defBoost = / (\b(?:is|means|refers to|avoids|helps create|involves)\b) /i;
    var isConceptQuery = /\b(short sentences|active voice|familiar words|key principles)\b/i.test(q);
    var scored = pool.map(function(entry) {
      var s = scoreMatch(tokens, entry.text);
      if (isDefinitional && defBoost.test(entry.text)) s += 0.35;
      // Prefer paragraph over heading for "Short Sentences", "Active Voice", etc. (avoids "Using X." only)
      if ((isDefinitional || isConceptQuery) && entry.type === 'paragraph') s += 0.25;
      return { entry: entry, score: s };
    }).filter(function(x) { return x.score >= MIN_SCORE; }).sort(function(a, b) { return b.score - a.score; });
    if (scored.length === 0) {
      var topics = courseToc.slice(0, 4).map(function(t) { return t.lessonTitle; }).filter(Boolean);
      return { ok: false, message: 'I couldn\'t find that in the course. Try: ' + (topics.join(', ') || 'plain language, inclusive communication') + '.' };
    }
    var best = scored[0];
    // Use only the best match to avoid mixing different blocks (e.g. Key Principles + objectives)
    var use = [best];
    // For "what is passive voice" vs "what is active voice": return only the asked‑for definition (no irrelevant half).
    var focusTerm = null;
    if (/\bpassive\s+voice\b/i.test(q) && !/\bactive\s+voice\b/i.test(q)) focusTerm = 'passive';
    else if (/\bactive\s+voice\b/i.test(q) && !/\bpassive\s+voice\b/i.test(q)) focusTerm = 'active';
    // For "familiar words (and expressions)": exclude table example cells (British, Bob's your uncle, etc.).
    var excludeTable = /\b(familiar\s+words?|familiar\s+words?\s+and\s+expressions?)\b/i.test(q);
    var pickOpts = { focusTerm: focusTerm, excludeTableExamples: excludeTable };
    var maxPick = (isDefinitional || isConceptQuery) ? 260 : 150;
    var frags = [];
    for (var i = 0; i < use.length; i++) {
      var ex = pickRelevantSentences(use[i].entry.text, tokens, maxPick, pickOpts);
      if (ex) ex = simplifyForAnswer(ex, '');
      if (ex && frags.indexOf(ex) === -1) frags.push(ex);
    }
    if (frags.length === 0) {
      var fall = pickRelevantSentences(best.entry.text, tokens, (isDefinitional || isConceptQuery) ? 260 : 160, pickOpts);
      frags = [simplifyForAnswer(fall || (best.entry.text || '').slice(0, 200), '')];
    }
    var msg = 'According to the course: ' + frags.join(' ');
    // Preserve newlines (list formatting); clean each line
    var final = (msg.indexOf('\n') >= 0)
      ? msg.split('\n').map(function(line) { return cleanText(line); }).join('\n')
      : cleanText(msg);
    return { ok: true, message: final };
  }

  // --- DOM: button and panel ---
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
    img.src = 'images/teacher.png';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.style.cssText = 'width:52px;height:52px;object-fit:contain;image-rendering:-webkit-optimize-contrast;';
    btn.appendChild(img);
    btn.addEventListener('click', function(e) { e.stopPropagation(); toggleAIPanel(); });
    return btn;
  }

  function toggleAIPanel() {
    aiOpen = !aiOpen;
    if (aiModalRoot) aiModalRoot.style.display = aiOpen ? 'flex' : 'none';
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
      // Render lists cleanly: " • " between items becomes a newline so each bullet is on its own line
      var display = (res.message || '').replace(/ • /g, '\n• ');
      botP.textContent = display;
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
