// Portfolio-Style Accessibility & Language Features
(function() {
  'use strict';

  // ============ STATE MANAGEMENT ============
  const state = {
    contrast: 0,
    largeText: 0,
    textSpacing: 0,
    dyslexia: 0,
    focusIndicator: 0,
    hideImages: 0,
    theme: 'light' // 'light' or 'dark'
  };

  // Settings configuration for e-learning
  const settingsConfig = {
    contrast: { levels: 2, binary: false },
    largeText: { levels: 2, binary: false },
    textSpacing: { levels: 2, binary: false },
    dyslexia: { levels: 2, binary: false },
    focusIndicator: { levels: 2, binary: false },
    hideImages: { levels: 1, binary: true },
    theme: { levels: 1, binary: true }
  };

  // ============ LOAD FROM LOCALSTORAGE ============
  function loadSettings() {
    try {
      const saved = localStorage.getItem('accessibilitySettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }

  // ============ SAVE TO LOCALSTORAGE ============
  function saveSettings() {
    try {
      localStorage.setItem('accessibilitySettings', JSON.stringify(state));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  // ============ TOGGLE SETTING ============
  function toggleSetting(setting) {
    const config = settingsConfig[setting];
    if (!config) return;

    if (setting === 'theme') {
      // Theme toggle: light ↔ dark
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    } else if (config.binary) {
      // Binary toggle: 0 → 1 → 0
      state[setting] = state[setting] === 0 ? 1 : 0;
    } else {
      // Gradual toggle: 0 → 1 → 2 → 0
      state[setting] = (state[setting] + 1) % (config.levels + 1);
    }

    saveSettings();
    applyAllSettings();
    updateUI();
  }

  // ============ APPLY ALL SETTINGS ============
  function applyAllSettings() {
    const root = document.documentElement;
    const body = document.body;
    const appContent = document.getElementById('app') || body;

    // Reset filters first
    let filters = [];

    // Contrast - apply to learning content
    if (state.contrast === 1) {
      filters.push('contrast(1.3)');
    } else if (state.contrast === 2) {
      filters.push('contrast(1.6)', 'brightness(1.15)');
    }

    // Apply contrast filter to app content
    if (filters.length > 0) {
      appContent.style.filter = filters.join(' ');
    } else {
      appContent.style.filter = '';
    }

    // Large Text - inject CSS to affect everything except accessibility panel
    const largeTextStyle = document.getElementById('large-text-style') || document.createElement('style');
    largeTextStyle.id = 'large-text-style';
    if (state.largeText > 0) {
      const baseFontPercent = state.largeText === 1 ? 110 : 124;
      const globalLineHeight = state.largeText === 1 ? 1.55 : 1.7;
      const paragraphLineHeight = state.largeText === 1 ? 1.65 : 1.85;
      largeTextStyle.textContent = `
        html {
          font-size: ${baseFontPercent}% !important;
        }
        body, #app {
          overflow-wrap: break-word !important;
          word-wrap: break-word !important;
        }
        body, body *:not(#accessibility-container):not(#accessibility-container *) {
          line-height: ${globalLineHeight} !important;
        }
        body p,
        body li,
        body span,
        body a,
        body button,
        body input,
        body textarea,
        body td,
        body th,
        body div,
        body section,
        body article {
          line-height: ${paragraphLineHeight} !important;
        }
        #accessibility-container {
          font-size: 14px !important;
          line-height: 1.5 !important;
        }
        #accessibility-container * {
          font-size: inherit !important;
          line-height: inherit !important;
        }
      `;
      if (!largeTextStyle.parentNode) {
        document.head.appendChild(largeTextStyle);
      }
    } else {
      const style = document.getElementById('large-text-style');
      if (style) style.remove();
    }

    // Text Spacing - apply to learning content
    if (state.textSpacing === 1) {
      appContent.style.letterSpacing = '0.08em';
      appContent.style.wordSpacing = '0.15em';
      appContent.style.lineHeight = '1.6';
    } else if (state.textSpacing === 2) {
      appContent.style.letterSpacing = '0.12em';
      appContent.style.wordSpacing = '0.25em';
      appContent.style.lineHeight = '1.8';
    } else {
      appContent.style.letterSpacing = '';
      appContent.style.wordSpacing = '';
      appContent.style.lineHeight = '';
    }

    // Dyslexia Friendly Font - inject CSS to affect everything except accessibility panel
    const dyslexiaStyle = document.getElementById('dyslexia-style') || document.createElement('style');
    dyslexiaStyle.id = 'dyslexia-style';
    if (state.dyslexia === 1) {
      dyslexiaStyle.textContent = `
        body, body * {
          font-family: Arial, Verdana, Helvetica, sans-serif !important;
          line-height: 1.6 !important;
          letter-spacing: 0.08em !important;
          word-spacing: 0.2em !important;
          text-align: left !important;
          font-weight: 400 !important;
        }
        #accessibility-container, #accessibility-container * {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          line-height: 1.5 !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }
        /* Prevent justified text */
        body p, body div {
          text-align: left !important;
        }
        /* Emphasis - bold not italics */
        body em, body i {
          font-style: normal !important;
          font-weight: bold !important;
        }
      `;
      if (!document.getElementById('dyslexia-style')) {
        document.head.appendChild(dyslexiaStyle);
      }
    } else if (state.dyslexia === 2) {
      dyslexiaStyle.textContent = `
        body, body * {
          font-family: Verdana, Arial, Helvetica, sans-serif !important;
          line-height: 1.8 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.32em !important;
          text-align: left !important;
          font-weight: 500 !important;
        }
        #accessibility-container, #accessibility-container * {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          line-height: 1.5 !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }
        /* Prevent justified text */
        body p, body div {
          text-align: left !important;
        }
        /* Emphasis - bold not italics */
        body em, body i {
          font-style: normal !important;
          font-weight: bold !important;
        }
        /* Additional spacing for paragraphs */
        body p {
          margin-bottom: 1em !important;
        }
      `;
      if (!document.getElementById('dyslexia-style')) {
        document.head.appendChild(dyslexiaStyle);
      }
    } else {
      const style = document.getElementById('dyslexia-style');
      if (style) style.remove();
    }

    // Hide Images - inject CSS to hide all images except accessibility panel
    const hideImagesStyle = document.getElementById('hide-images-style') || document.createElement('style');
    hideImagesStyle.id = 'hide-images-style';
    if (state.hideImages === 1) {
      hideImagesStyle.textContent = `
        body img:not(#accessibility-container img):not(#accessibility-container *),
        #app img,
        img[src*=".png"],
        img[src*=".jpg"],
        img[src*=".jpeg"],
        img[src*=".gif"],
        img[src*=".svg"],
        img[src*=".webp"],
        [style*="background-image"] {
          opacity: 0.1 !important;
          filter: blur(5px) !important;
          visibility: visible !important;
        }
        #accessibility-container,
        #accessibility-container img,
        #accessibility-container * {
          opacity: 1 !important;
          filter: none !important;
          visibility: visible !important;
        }
      `;
      if (!document.getElementById('hide-images-style')) {
        document.head.appendChild(hideImagesStyle);
      }
    } else {
      const style = document.getElementById('hide-images-style');
      if (style) style.remove();
    }

    // Focus Indicator - keyboard navigation
    if (state.focusIndicator === 1) {
      const style = document.getElementById('focus-indicator-style') || document.createElement('style');
      style.id = 'focus-indicator-style';
      style.textContent = `
        *:focus {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 3px !important;
        }
        button:focus, a:focus, input:focus, select:focus, textarea:focus {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        }
      `;
      if (!document.getElementById('focus-indicator-style')) {
        document.head.appendChild(style);
      }
    } else if (state.focusIndicator === 2) {
      const style = document.getElementById('focus-indicator-style') || document.createElement('style');
      style.id = 'focus-indicator-style';
      style.textContent = `
        *:focus {
          outline: 5px solid #3b82f6 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.3) !important;
        }
        button:focus, a:focus, input:focus, select:focus, textarea:focus {
          outline: 5px solid #3b82f6 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.4) !important;
        }
      `;
      if (!document.getElementById('focus-indicator-style')) {
        document.head.appendChild(style);
      }
    } else {
      const style = document.getElementById('focus-indicator-style');
      if (style) style.remove();
    }

    // Theme - apply to entire page
    applyTheme();
  }

  // ============ APPLY THEME ============
  function applyTheme() {
    const root = document.documentElement;
    const body = document.body;
    
    // Update theme button icon and label
    const themeButton = document.querySelector('[data-setting="theme"]');
    if (themeButton) {
      const icon = themeButton.querySelector('span:first-child');
      const label = themeButton.querySelector('.text-xs');
      
      if (state.theme === 'dark') {
        if (icon) icon.textContent = '☀️';
        if (label) label.textContent = 'Light Theme';
      } else {
        if (icon) icon.textContent = '🌙';
        if (label) label.textContent = 'Dark Theme';
      }
    }
    
    if (state.theme === 'dark') {
      // Dark theme colors
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--text-primary', '#e5e5e5');
      root.style.setProperty('--text-secondary', '#a3a3a3');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--accent-color', '#60a5fa');
      
      body.style.backgroundColor = '#1a1a1a';
      body.style.color = '#e5e5e5';
      
      // Apply dark theme to app content
      const appContent = document.getElementById('app') || body;
      appContent.style.backgroundColor = '#1a1a1a';
      appContent.style.color = '#e5e5e5';
      
      // Inject dark theme styles
      const darkThemeStyle = document.getElementById('dark-theme-style') || document.createElement('style');
      darkThemeStyle.id = 'dark-theme-style';
      darkThemeStyle.textContent = `
        body, body *, #app, #app * {
          background-color: #1a1a1a !important;
          color: #e5e5e5 !important;
          border-color: #404040 !important;
        }
        body h1, body h2, body h3, body h4, body h5, body h6 {
          color: #ffffff !important;
        }
        body a {
          color: #60a5fa !important;
        }
        body a:hover {
          color: #93c5fd !important;
        }
        body button {
          background-color: #2d2d2d !important;
          color: #e5e5e5 !important;
          border-color: #404040 !important;
        }
        body button:hover {
          background-color: #404040 !important;
        }
        body input, body textarea, body select {
          background-color: #2d2d2d !important;
          color: #e5e5e5 !important;
          border-color: #404040 !important;
        }
        /* Preserve accessibility panel styling */
        #accessibility-container,
        #accessibility-container * {
          background-color: #ffffff !important;
          color: #1f2937 !important;
          border-color: #e5e7eb !important;
        }
        #accessibility-container .accessibility-option img {
          filter: brightness(0.5) !important;
        }
        #accessibility-container .accessibility-option[data-active="true"] {
          background-color: #dbeafe !important;
          border-color: #93c5fd !important;
        }
        #accessibility-container .accessibility-option[data-active="true"] img {
          filter: brightness(0) invert(1) !important;
        }
        /* Exclude video players and interactive scenarios from dark theme */
        video, video *, 
        iframe, iframe *,
        [class*="video"], [class*="video"] *,
        [class*="player"], [class*="player"] *,
        [class*="scenario"], [class*="scenario"] *,
        [class*="interactive"], [class*="interactive"] *,
        [data-block-type="multimedia"], [data-block-type="multimedia"] *,
        [data-block-type="interactive"], [data-block-type="interactive"] * {
          background-color: initial !important;
          color: initial !important;
          border-color: initial !important;
        }
      `;
      if (!darkThemeStyle.parentNode) {
        document.head.appendChild(darkThemeStyle);
      }
    } else {
      // Light theme (default)
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f9fafb');
      root.style.setProperty('--text-primary', '#1f2937');
      root.style.setProperty('--text-secondary', '#6b7280');
      root.style.setProperty('--border-color', '#e5e7eb');
      root.style.setProperty('--accent-color', '#3b82f6');
      
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#1f2937';
      
      const appContent = document.getElementById('app') || body;
      appContent.style.backgroundColor = '#ffffff';
      appContent.style.color = '#1f2937';
      
      // Remove dark theme styles
      const darkThemeStyle = document.getElementById('dark-theme-style');
      if (darkThemeStyle) darkThemeStyle.remove();
    }
  }

  // ============ UPDATE UI ============
  function updateUI() {
    const options = document.querySelectorAll('.accessibility-option');
    
    options.forEach(option => {
      const setting = option.dataset.setting;
      const currentLevel = state[setting];
      const config = settingsConfig[setting];
      const indicators = option.querySelectorAll('.level-indicator');
      const img = option.querySelector('img');
      
      // Special handling for theme toggle
      if (setting === 'theme') {
        const isActive = state.theme === 'dark';
        option.setAttribute('data-active', isActive);
        if (isActive) {
          option.style.borderColor = 'rgba(147, 197, 253, 1)';
          option.style.background = 'rgba(219, 234, 254, 1)';
          if (img) img.style.filter = 'brightness(0) invert(1)';
        } else {
          option.style.borderColor = '#e5e7eb';
          option.style.background = '#f9fafb';
          if (img) img.style.filter = 'brightness(0.5)';
        }
        return;
      }
      
      // Update button styling
      if (currentLevel > 0) {
        option.style.borderColor = 'rgba(147, 197, 253, 1)';
        option.style.background = 'rgba(219, 234, 254, 1)';
        if (img) {
          img.style.filter = 'brightness(0) invert(1)';
        }
      } else {
        option.style.borderColor = '#e5e7eb';
        option.style.background = '#f9fafb';
        if (img) {
          img.style.filter = 'brightness(0.5)';
        }
      }

      // Update level indicators
      indicators.forEach((indicator, index) => {
        if (index < currentLevel) {
          indicator.style.background = '#3b82f6';
          indicator.style.width = '44px';
        } else {
          indicator.style.background = '#d1d5db';
          indicator.style.width = '44px';
        }
      });
    });
  }

  // ============ RESET ALL ============
  function resetAll() {
    Object.keys(state).forEach(key => {
      state[key] = 0;
    });
    saveSettings();
    applyAllSettings();
    updateUI();
  }

  // ============ INITIALIZE ============
  function init() {
    // Load saved settings
    loadSettings();

    // Get DOM elements
    const toggleBtn = document.getElementById('accessibility-toggle');
    const panel = document.getElementById('accessibility-panel');
    const closeBtn = document.getElementById('close-panel');
    const resetBtn = document.getElementById('reset-accessibility');
    const options = document.querySelectorAll('.accessibility-option');

    // Panel toggle
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
      });
    }

    // Close panel button
    if (closeBtn && panel) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.add('hidden');
      });
    }

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (panel && !panel.classList.contains('hidden')) {
        const container = document.getElementById('accessibility-container');
        if (container && !container.contains(e.target)) {
          panel.classList.add('hidden');
        }
      }
    });

    // Accessibility options
    options.forEach(option => {
      option.addEventListener('click', () => {
        const setting = option.dataset.setting;
        toggleSetting(setting);
      });
    });

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetAll();
      });
    }

    // Initial UI update
    applyAllSettings();
    updateUI();
  }

  // ============ INJECT KEY PRINCIPLES IMAGE ============
  function injectKeyPrinciplesImage() {
    const STATE = {
      scheduled: false,
      observer: null,
      lastHash: '',
    };

    function findKeyPrinciplesSection(root) {
      if (!root) return null;
      const candidates = root.querySelectorAll('section, [class*="block"], [class*="component"]');
      for (const section of candidates) {
        const text = (section.textContent || '').replace(/\s+/g, ' ').trim();
        if (
          text.includes('Key Principles') &&
          text.includes('Short Sentences') &&
          text.includes('Active Voice') &&
          text.includes('Familiar Words')
        ) {
          return section;
        }
      }
      return null;
    }

    function findUsingShortSentencesSection(root) {
      if (!root) return null;
      const candidates = root.querySelectorAll('section, [class*="block"], [class*="component"]');
      for (const section of candidates) {
        const text = (section.textContent || '').trim();
        if (text.includes('Using Short Sentences')) {
          return section;
        }
      }
      return null;
    }

    function createInfographicSection(templateSection) {
      const section = document.createElement('section');
      if (templateSection?.className) {
        section.className = templateSection.className;
      }
      section.classList.add('key-principles-infographic-section');
      section.dataset.injected = 'key-principles';

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        max-width: 960px;
        margin: 0 auto;
        padding: 40px 20px;
        text-align: center;
        box-sizing: border-box;
      `;

      const img = document.createElement('img');
      img.src = 'images/Key Principles.jpeg';
      img.alt = 'Key Principles of Plain Language Infographic';
      img.style.cssText = `
        width: 100%;
        max-width: 800px;
        height: auto;
        display: block;
        margin: 0 auto;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;

      wrapper.appendChild(img);
      section.appendChild(wrapper);
      return section;
    }

    function ensureInfographicPlacement() {
      const appContainer = document.querySelector('#app');
      if (!appContainer) {
        return;
      }

      const currentHash = window.location.hash;
      const keySection = findKeyPrinciplesSection(appContainer);

      // Remove infographic completely if we're not on the relevant lesson
      if (!keySection) {
        document.querySelectorAll('.key-principles-infographic-section').forEach(node => node.remove());
        STATE.lastHash = currentHash;
        return;
      }

      const parentContainer = keySection.parentNode;
      const usingSection = findUsingShortSentencesSection(parentContainer);

      const infographicSections = Array.from(document.querySelectorAll('.key-principles-infographic-section'));
      let infographicSection = infographicSections.shift();

      // Remove any duplicates beyond the first
      infographicSections.forEach(node => node.remove());

      if (!infographicSection || !infographicSection.isConnected) {
        infographicSection = createInfographicSection(keySection);
      }

      // If parent changed, move the section
      if (infographicSection.parentNode !== parentContainer) {
        parentContainer.insertBefore(infographicSection, usingSection || keySection.nextSibling);
      } else {
        const desiredSibling = usingSection || keySection.nextSibling;
        if (desiredSibling) {
          if (infographicSection.nextSibling !== desiredSibling) {
            parentContainer.insertBefore(infographicSection, desiredSibling);
          }
        } else if (infographicSection.nextSibling !== null) {
          parentContainer.appendChild(infographicSection);
        }
      }

      STATE.lastHash = currentHash;
    }

    function schedulePlacement() {
      if (STATE.scheduled) return;
      STATE.scheduled = true;
      requestAnimationFrame(() => {
        STATE.scheduled = false;
        ensureInfographicPlacement();
      });
    }

    // Observe DOM changes to keep the infographic stable
    function startObserver() {
      if (STATE.observer) return;
      const appContainer = document.querySelector('#app');
      if (!appContainer) return;

      STATE.observer = new MutationObserver(() => {
        schedulePlacement();
      });

      STATE.observer.observe(appContainer, {
        childList: true,
        subtree: true,
      });
    }

    function stopObserver() {
      if (STATE.observer) {
        STATE.observer.disconnect();
        STATE.observer = null;
      }
    }

    // Initial placement
    setTimeout(() => {
      ensureInfographicPlacement();
      startObserver();
    }, 1000);

    // Re-run when navigating between lessons
    window.addEventListener('hashchange', () => {
      stopObserver();
      document.querySelectorAll('.key-principles-infographic-section').forEach(node => node.remove());
      setTimeout(() => {
        ensureInfographicPlacement();
        startObserver();
      }, 1200);
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      injectKeyPrinciplesImage();
    });
  } else {
    init();
    injectKeyPrinciplesImage();
  }

})();
