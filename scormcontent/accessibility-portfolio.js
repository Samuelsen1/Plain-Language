/**
 * Portfolio-Style Accessibility & Language Features
 * Enhanced version with improved performance, accessibility, and code quality
 * @version 2.0
 */
(function() {
  'use strict';

  // ============ CONSTANTS ============
  const STORAGE_KEY = 'accessibilitySettings';
  const ANIMATION_DURATION = 300;
  const TTS_TOOLTIP_DURATION = 4000;
  const DEBOUNCE_DELAY = 100;
  const INFographic_DELAY = 1000;
  const INFographic_HASH_DELAY = 1200;

  // ============ STATE MANAGEMENT ============
  const state = {
    contrast: 0,
    largeText: 0,
    textSpacing: 0,
    dyslexia: 0,
    focusIndicator: 0,
    hideImages: 0,
    textToSpeech: 0,
    blueLightFilter: 0
  };

  // Settings configuration for e-learning
  const settingsConfig = {
    contrast: { levels: 2, binary: false, label: 'Contrast', description: 'Increase contrast for better visibility' },
    largeText: { levels: 2, binary: false, label: 'Large Text', description: 'Increase text size for better readability' },
    textSpacing: { levels: 2, binary: false, label: 'Text Spacing', description: 'Increase spacing between letters and words' },
    dyslexia: { levels: 2, binary: false, label: 'Dyslexia Friendly', description: 'Use dyslexia-friendly fonts and spacing' },
    focusIndicator: { levels: 2, binary: false, label: 'Focus Indicator', description: 'Enhance keyboard focus indicators' },
    hideImages: { levels: 1, binary: true, label: 'Hide Images', description: 'Reduce image visibility to focus on text' },
    textToSpeech: { levels: 1, binary: true, label: 'Text to Speech', description: 'Read selected text aloud' },
    blueLightFilter: { levels: 2, binary: false, label: 'Blue Light Filter', description: 'Reduce blue light for eye comfort' }
  };

  // ============ UTILITY FUNCTIONS ============
  
  /**
   * Safe localStorage operations with error handling
   */
  const storage = {
    get: function(key) {
      try {
        if (!window.localStorage) return null;
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
        return null;
      }
    },
    set: function(key, value) {
      try {
        if (!window.localStorage) return false;
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('Error writing to localStorage:', e);
        return false;
      }
    }
  };

  /**
   * Debounce function to limit function calls
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get or create a style element by ID
   */
  function getOrCreateStyleElement(id) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    return style;
  }

  /**
   * Remove style element if it exists
   */
  function removeStyleElement(id) {
    const style = document.getElementById(id);
    if (style) {
      style.remove();
    }
  }

  /**
   * Announce to screen readers
   */
  function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }

  // ============ DOM CACHE ============
  const domCache = {
    app: null,
    body: null,
    toggleBtn: null,
    panel: null,
    closeBtn: null,
    resetBtn: null,
    options: null,
    container: null,
    
    init: function() {
      this.app = document.getElementById('app') || document.body;
      this.body = document.body;
      this.toggleBtn = document.getElementById('accessibility-toggle');
      this.panel = document.getElementById('accessibility-panel');
      this.closeBtn = document.getElementById('close-panel');
      this.resetBtn = document.getElementById('reset-accessibility');
      this.options = document.querySelectorAll('.accessibility-option');
      this.container = document.getElementById('accessibility-container');
    }
  };

  // ============ SETTINGS MANAGEMENT ============
  
  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    const saved = storage.get(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      Object.keys(state).forEach(key => {
        if (key in saved && typeof saved[key] === 'number') {
          state[key] = saved[key];
        }
      });
    }
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    storage.set(STORAGE_KEY, state);
  }

  /**
   * Check if element is part of Articulate Rise structure
   */
  function isRiseElement(element) {
    if (!element) return false;
    // Check for Rise-specific classes, IDs, and data attributes
    const riseSelectors = [
      '[class*="rise"]', '[id*="rise"]', '[class*="Rise"]', '[id*="Rise"]',
      '[class*="articulate"]', '[id*="articulate"]',
      '[class*="player"]', '[id*="player"]',
      '[class*="navigation"]', '[id*="navigation"]',
      '[class*="menu"]', '[id*="menu"]',
      '[class*="sidebar"]', '[id*="sidebar"]',
      '[class*="header"]', '[id*="header"]',
      '[class*="footer"]', '[id*="footer"]',
      '[data-rise]', '[data-articulate]'
    ];
    // Check element and its parents
    let el = element;
    while (el && el !== document.body) {
      const classList = el.classList?.toString() || '';
      const id = el.id || '';
      const tagName = el.tagName?.toLowerCase() || '';
      
      if (riseSelectors.some(sel => {
        try {
          return el.matches?.(sel);
    } catch (e) {
          return false;
        }
      }) || 
      classList.includes('rise') || classList.includes('Rise') ||
      classList.includes('articulate') || id.includes('rise') || id.includes('Rise') ||
      id.includes('articulate') || tagName === 'rise-player' || tagName === 'articulate-player') {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  /**
   * Get safe selector that excludes Rise elements
   */
  function getSafeSelector(baseSelector) {
    return `${baseSelector}:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]):not([data-rise]):not([data-articulate]):not(rise-player):not(articulate-player)`;
  }

  /**
   * Toggle a setting value (async to prevent UI blocking)
   */
  function toggleSetting(setting) {
    const config = settingsConfig[setting];
    if (!config || !(setting in state)) {
      console.warn(`Invalid setting: ${setting}`);
      return;
    }

    const oldValue = state[setting];

    if (config.binary) {
      state[setting] = oldValue === 0 ? 1 : 0;
    } else {
      state[setting] = (oldValue + 1) % (config.levels + 1);
    }

    saveSettings();
    
    // Use requestAnimationFrame to prevent blocking
    requestAnimationFrame(() => {
    applyAllSettings();
      requestAnimationFrame(() => {
    updateUI();
        // Announce change to screen readers
        const level = state[setting] === 0 ? 'off' : `level ${state[setting]}`;
        announceToScreenReader(`${config.label} ${level}`);
      });
    });
  }

  // ============ STYLE APPLICATION ============
  
  /**
   * Apply filter styles (contrast)
   */
  function applyFilters() {
    const filters = [];
    
    if (state.contrast === 1) {
      filters.push('contrast(1.3)');
    } else if (state.contrast === 2) {
      filters.push('contrast(1.6)', 'brightness(1.15)');
    }

    if (domCache.app) {
      domCache.app.style.filter = filters.length > 0 ? filters.join(' ') : '';
    }
  }

  /**
   * Apply blue light filter
   */
  function applyBlueLightFilter() {
    if (state.blueLightFilter === 0) {
      removeStyleElement('blue-light-filter-style');
      return;
    }

    // Blue light filter: level 1 = warm (reduces blue), level 2 = very warm (stronger reduction)
    // Using a warm overlay approach similar to night mode
    const opacity = state.blueLightFilter === 1 ? 0.15 : 0.25;
    const hueRotate = state.blueLightFilter === 1 ? '-10deg' : '-20deg';
    
    const style = getOrCreateStyleElement('blue-light-filter-style');
    style.textContent = `
      html:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"])::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 200, 100, ${opacity});
        pointer-events: none;
        z-index: 999998;
        mix-blend-mode: multiply;
      }
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]), 
      #app:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) {
        filter: hue-rotate(${hueRotate}) brightness(0.98);
      }
      #accessibility-container, #accessibility-container * {
        filter: none;
      }
      #accessibility-container::before {
        display: none;
      }
    `;
  }

  /**
   * Apply large text styles
   */
  function applyLargeText() {
    if (state.largeText === 0) {
      removeStyleElement('large-text-style');
      return;
    }

      const baseFontPercent = state.largeText === 1 ? 110 : 124;
      const globalLineHeight = state.largeText === 1 ? 1.55 : 1.7;
      const paragraphLineHeight = state.largeText === 1 ? 1.65 : 1.85;
    
    const style = getOrCreateStyleElement('large-text-style');
    style.textContent = `
        html {
        font-size: ${baseFontPercent}%;
      }
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]), 
      #app:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) {
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
      }
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) *:not(#accessibility-container):not(#accessibility-container *):not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]) {
        line-height: ${globalLineHeight};
        max-width: 100%;
        box-sizing: border-box;
      }
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) p,
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) li,
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) span,
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) a,
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) button:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]),
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) input:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]),
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) textarea:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]),
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) td,
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) th,
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) div:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) section:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]),
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) article:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) {
        line-height: ${paragraphLineHeight};
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: break-word;
        }
        #accessibility-container {
        font-size: 14px;
        line-height: 1.5;
        }
        #accessibility-container * {
        font-size: inherit;
        line-height: inherit;
      }
    `;
  }

  /**
   * Apply text spacing styles
   */
  function applyTextSpacing() {
    if (state.textSpacing === 0) {
      removeStyleElement('text-spacing-style');
      return;
    }

    const letterSpacing = state.textSpacing === 1 ? '0.08em' : '0.12em';
    const wordSpacing = state.textSpacing === 1 ? '0.15em' : '0.25em';
    const lineHeight = state.textSpacing === 1 ? '1.6' : '1.8';
    
    const style = getOrCreateStyleElement('text-spacing-style');
    style.textContent = `
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) *:not(#accessibility-container):not(#accessibility-container *):not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]) {
        letter-spacing: ${letterSpacing};
        word-spacing: ${wordSpacing};
        line-height: ${lineHeight};
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: break-word;
      }
    `;
  }

  /**
   * Apply dyslexia-friendly styles
   */
  function applyDyslexiaStyles() {
    if (state.dyslexia === 0) {
      removeStyleElement('dyslexia-style');
      return;
    }

    const isLevel2 = state.dyslexia === 2;
    const fontFamily = isLevel2 ? 'Verdana, Arial, Helvetica, sans-serif' : 'Arial, Verdana, Helvetica, sans-serif';
    const lineHeight = isLevel2 ? '1.8' : '1.6';
    const letterSpacing = isLevel2 ? '0.12em' : '0.08em';
    const wordSpacing = isLevel2 ? '0.32em' : '0.2em';
    const fontWeight = isLevel2 ? '500' : '400';
    
    const style = getOrCreateStyleElement('dyslexia-style');
    style.textContent = `
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) *:not(#accessibility-container):not(#accessibility-container *):not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]) {
        font-family: ${fontFamily};
        line-height: ${lineHeight};
        letter-spacing: ${letterSpacing};
        word-spacing: ${wordSpacing};
        text-align: left;
        font-weight: ${fontWeight};
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: break-word;
      }
      #accessibility-container, #accessibility-container * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.5;
        letter-spacing: normal;
        word-spacing: normal;
      }
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) p:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]), 
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) div:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]) {
        text-align: left;
      }
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) em:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]), 
      body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) i:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) {
        font-style: normal;
        font-weight: bold;
      }
      ${isLevel2 ? 'body:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) p:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]) { margin-bottom: 1em; }' : ''}
    `;
  }

  /**
   * Apply hide images styles
   */
  function applyHideImages() {
    if (state.hideImages === 0) {
      removeStyleElement('hide-images-style');
      return;
    }

    const style = getOrCreateStyleElement('hide-images-style');
    style.textContent = `
      body img:not(#accessibility-container img):not(#accessibility-container *):not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      #app img:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      img[src*=".png"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      img[src*=".jpg"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      img[src*=".jpeg"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      img[src*=".gif"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      img[src*=".svg"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      img[src*=".webp"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]),
      [style*="background-image"]:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]) {
        opacity: 0.1;
        filter: blur(5px);
        visibility: visible;
      }
      #accessibility-container,
      #accessibility-container img,
      #accessibility-container * {
        opacity: 1;
        filter: none;
        visibility: visible;
      }
    `;
  }

  /**
   * Apply focus indicator styles
   */
  function applyFocusIndicator() {
    if (state.focusIndicator === 0) {
      removeStyleElement('focus-indicator-style');
      return;
    }

    const isLevel2 = state.focusIndicator === 2;
    const outlineWidth = isLevel2 ? '5px' : '3px';
    const outlineOffset = isLevel2 ? '4px' : '3px';
    const boxShadowSize = isLevel2 ? '5px' : '3px';
    const boxShadowOpacity = isLevel2 ? '0.4' : '0.2';
    
    const style = getOrCreateStyleElement('focus-indicator-style');
    style.textContent = `
      *:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):not([class*="articulate"]):not([id*="articulate"]):focus {
        outline: ${outlineWidth} solid #3b82f6;
        outline-offset: ${outlineOffset};
        ${isLevel2 ? `box-shadow: 0 0 0 ${boxShadowSize} rgba(59, 130, 246, 0.3);` : ''}
      }
      button:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):focus, 
      a:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):focus, 
      input:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):focus, 
      select:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):focus, 
      textarea:not([class*="rise"]):not([id*="rise"]):not([class*="Rise"]):not([id*="Rise"]):focus {
        outline: ${outlineWidth} solid #3b82f6;
        outline-offset: ${outlineOffset};
        box-shadow: 0 0 0 ${boxShadowSize} rgba(59, 130, 246, ${boxShadowOpacity});
      }
    `;
  }

  /**
   * Apply all accessibility settings (async to prevent blocking)
   */
  const applyAllSettings = debounce(function() {
    if (!domCache.app) {
      domCache.init();
    }
    
    // Use requestAnimationFrame to prevent blocking UI
    requestAnimationFrame(() => {
      applyFilters();
      applyLargeText();
      applyTextSpacing();
      applyDyslexiaStyles();
      applyHideImages();
      applyFocusIndicator();
      applyBlueLightFilter();
      
      // Text to Speech
      if (state.textToSpeech === 1) {
        enableTextToSpeech();
      } else {
        disableTextToSpeech();
      }
    });
  }, DEBOUNCE_DELAY);

  // ============ TEXT TO SPEECH ============
  let speechSynthesis = null;
  let textToSpeechHandler = null;
  let ttsTooltip = null;
  let ttsIndicator = null;

  /**
   * Check if speech synthesis is available
   */
  function isSpeechSynthesisAvailable() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  /**
   * Enable text-to-speech functionality
   */
  function enableTextToSpeech() {
    if (!isSpeechSynthesisAvailable()) {
      console.warn('Speech synthesis is not available in this browser');
      return;
    }

    if (textToSpeechHandler) return; // Already enabled

    speechSynthesis = window.speechSynthesis;

    // Create instruction tooltip
    ttsTooltip = document.createElement('div');
    ttsTooltip.id = 'tts-tooltip';
    ttsTooltip.setAttribute('role', 'status');
    ttsTooltip.setAttribute('aria-live', 'polite');
    ttsTooltip.textContent = 'Text-to-Speech Active: Select any text to hear it read aloud';
    ttsTooltip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
      z-index: 999999;
      animation: slideInDown 0.3s ease-out;
      pointer-events: none;
      user-select: none;
    `;
    document.body.appendChild(ttsTooltip);

    // Remove tooltip after duration
    setTimeout(() => {
      if (ttsTooltip?.parentNode) {
        ttsTooltip.style.animation = 'slideOutUp 0.3s ease-out';
        setTimeout(() => {
          if (ttsTooltip?.parentNode) {
            ttsTooltip.remove();
            ttsTooltip = null;
          }
        }, ANIMATION_DURATION);
      }
    }, TTS_TOOLTIP_DURATION);

    textToSpeechHandler = function(event) {
      setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        
        if (selectedText.length > 0 && selectedText.length < 10000) { // Limit length
          speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(selectedText);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onstart = function() {
            if (!ttsIndicator) {
              ttsIndicator = document.createElement('div');
              ttsIndicator.id = 'tts-speaking-indicator';
              ttsIndicator.setAttribute('role', 'status');
              ttsIndicator.setAttribute('aria-live', 'polite');
              ttsIndicator.textContent = 'Speaking...';
              ttsIndicator.style.cssText = `
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: rgba(34, 197, 94, 0.95);
              color: white;
              padding: 10px 20px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 500;
              box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
              z-index: 999999;
              animation: pulse 1s infinite;
              pointer-events: none;
              user-select: none;
            `;
              document.body.appendChild(ttsIndicator);
            }
          };
          
          utterance.onend = function() {
            if (ttsIndicator?.parentNode) {
              ttsIndicator.remove();
              ttsIndicator = null;
            }
          };
          
          utterance.onerror = function(event) {
            console.warn('Speech synthesis error:', event.error);
            if (ttsIndicator?.parentNode) {
              ttsIndicator.remove();
              ttsIndicator = null;
            }
          };
          
          speechSynthesis.speak(utterance);
        }
      }, 100);
    };

    document.addEventListener('mouseup', textToSpeechHandler);
    document.addEventListener('touchend', textToSpeechHandler);
    
    // Add CSS animation styles
    const style = getOrCreateStyleElement('tts-animations');
    style.textContent = `
      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes slideOutUp {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
    `;
  }

  /**
   * Disable text-to-speech functionality
   */
  function disableTextToSpeech() {
    if (textToSpeechHandler) {
      document.removeEventListener('mouseup', textToSpeechHandler);
      document.removeEventListener('touchend', textToSpeechHandler);
      textToSpeechHandler = null;
    }
    
    // Clear text selection
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection && selection.removeAllRanges) {
        selection.removeAllRanges();
      }
    }
    
    // Remove tooltip
    if (ttsTooltip?.parentNode) {
      ttsTooltip.remove();
      ttsTooltip = null;
    }
    
    // Remove indicator
    if (ttsIndicator?.parentNode) {
      ttsIndicator.remove();
      ttsIndicator = null;
    }
    
    // Remove animation styles
    removeStyleElement('tts-animations');
    
    // Cancel speech
    if (speechSynthesis) {
    speechSynthesis.cancel();
    }
  }

  // ============ UI UPDATES ============
  
  /**
   * Update UI to reflect current state
   */
  function updateUI() {
    if (!domCache.options || domCache.options.length === 0) {
      domCache.options = document.querySelectorAll('.accessibility-option');
    }
    
    domCache.options.forEach(option => {
      const setting = option.dataset.setting;
      if (!setting || !(setting in state)) return;
      
      const currentLevel = state[setting];
      const config = settingsConfig[setting];
      const indicators = option.querySelectorAll('.level-indicator');
      const img = option.querySelector('img');
      
      // Update button styling
      if (currentLevel > 0) {
        option.style.borderColor = 'rgba(147, 197, 253, 1)';
        option.style.background = 'rgba(219, 234, 254, 1)';
        option.setAttribute('aria-pressed', 'true');
        if (img) {
          img.style.filter = 'brightness(0) invert(1)';
        }
      } else {
        option.style.borderColor = '#e5e7eb';
        option.style.background = '#f9fafb';
        option.setAttribute('aria-pressed', 'false');
        if (img) {
          img.style.filter = 'brightness(0.5)';
        }
      }

      // Update level indicators
      indicators.forEach((indicator, index) => {
        if (index < currentLevel) {
          indicator.style.background = '#3b82f6';
        } else {
          indicator.style.background = '#d1d5db';
        }
        indicator.style.width = '44px';
      });
      
      // Update aria-label
      const levelText = currentLevel === 0 ? 'off' : 
                       config.binary ? 'on' : `level ${currentLevel}`;
      option.setAttribute('aria-label', `${config.label}: ${levelText}. ${config.description}`);
    });
  }

  /**
   * Reset all settings (async to prevent blocking)
   */
  function resetAll() {
    Object.keys(state).forEach(key => {
      state[key] = 0;
    });
    saveSettings();
    requestAnimationFrame(() => {
      applyAllSettings();
      requestAnimationFrame(() => {
        updateUI();
        announceToScreenReader('All accessibility settings have been reset');
      });
    });
  }

  // ============ INITIALIZATION ============
  
  /**
   * Initialize event listeners
   */
  function initEventListeners() {
    // Panel toggle
    if (domCache.toggleBtn && domCache.panel) {
      domCache.toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = domCache.panel.classList.contains('hidden');
        domCache.panel.classList.toggle('hidden');
        
        // Update ARIA attributes
        domCache.toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        announceToScreenReader(`Accessibility panel ${isHidden ? 'opened' : 'closed'}`);
      });
      
      // Add keyboard support
      domCache.toggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          domCache.toggleBtn.click();
        }
      });
    }

    // Close panel button
    if (domCache.closeBtn && domCache.panel) {
      domCache.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        domCache.panel.classList.add('hidden');
        domCache.toggleBtn?.setAttribute('aria-expanded', 'false');
        announceToScreenReader('Accessibility panel closed');
      });
    }

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (domCache.panel && !domCache.panel.classList.contains('hidden')) {
        if (domCache.container && !domCache.container.contains(e.target)) {
          domCache.panel.classList.add('hidden');
          domCache.toggleBtn?.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Escape key to close panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && domCache.panel && !domCache.panel.classList.contains('hidden')) {
        domCache.panel.classList.add('hidden');
        domCache.toggleBtn?.setAttribute('aria-expanded', 'false');
        domCache.toggleBtn?.focus();
        announceToScreenReader('Accessibility panel closed');
      }
    });

    // Accessibility options - use async handlers to prevent blocking
    if (domCache.options && domCache.options.length > 0) {
      domCache.options.forEach(option => {
        option.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const setting = option.dataset.setting;
          if (setting) {
            // Use requestAnimationFrame to prevent blocking
            requestAnimationFrame(() => {
              toggleSetting(setting);
            });
          }
        }, { passive: false });
        
        // Keyboard support
        option.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            const setting = option.dataset.setting;
            if (setting) {
              requestAnimationFrame(() => {
                toggleSetting(setting);
              });
            }
          }
        }, { passive: false });
      });
    }

    // Reset button
    if (domCache.resetBtn) {
      domCache.resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetAll();
      });
    }
  }

  /**
   * Initialize accessibility features
   */
  function init() {
    // Load saved settings
    loadSettings();

    // Initialize DOM cache
    domCache.init();

    // Initialize event listeners
    initEventListeners();

    // Add ARIA attributes
    if (domCache.toggleBtn) {
      domCache.toggleBtn.setAttribute('aria-label', 'Open accessibility options');
      domCache.toggleBtn.setAttribute('aria-expanded', 'false');
      domCache.toggleBtn.setAttribute('role', 'button');
    }
    
    if (domCache.panel) {
      domCache.panel.setAttribute('role', 'dialog');
      domCache.panel.setAttribute('aria-label', 'Accessibility options');
      domCache.panel.setAttribute('aria-modal', 'true');
    }

    // Initial UI update
    applyAllSettings();
    updateUI();
  }

  // ============ KEY PRINCIPLES IMAGE INJECTION ============
  
  /**
   * Inject Key Principles infographic
   */
  function injectKeyPrinciplesImage() {
    const STATE = {
      scheduled: false,
      observer: null,
      lastHash: '',
      infographicSection: null,
    };

    const INFographic_ID = 'key-principles-infographic-injected';

    /**
     * Find the Key Principles section
     */
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

    /**
     * Find the "Using Short Sentences" section
     */
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

    /**
     * Create infographic section element
     */
    function createInfographicSection(templateSection) {
      const section = document.createElement('section');
      if (templateSection?.className) {
        section.className = templateSection.className;
      }
      section.classList.add('key-principles-infographic-section');
      section.id = INFographic_ID;
      section.dataset.injected = 'key-principles';
      section.setAttribute('aria-label', 'Key Principles of Plain Language Infographic');

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
      img.alt = 'Key Principles of Plain Language: Short Sentences, Active Voice, and Familiar Words';
      img.loading = 'lazy';
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

    /**
     * Ensure infographic is placed correctly
     */
    function ensureInfographicPlacement() {
      const appContainer = document.querySelector('#app');
      if (!appContainer) {
        return;
      }

      const currentHash = window.location.hash;
      const keySection = findKeyPrinciplesSection(appContainer);

      // Remove infographic if not on relevant lesson
      if (!keySection) {
        const existing = document.getElementById(INFographic_ID);
        if (existing) {
          existing.remove();
          STATE.infographicSection = null;
        }
        STATE.lastHash = currentHash;
        return;
      }

      const parentContainer = keySection.parentNode;
      if (!parentContainer) return;

      const usingSection = findUsingShortSentencesSection(parentContainer);
      const desiredSibling = usingSection || keySection.nextSibling;

      // Get existing infographic or create new one
      let infographicSection = document.getElementById(INFographic_ID);
      
      // Remove any duplicates (keep only one)
      const allInfographics = document.querySelectorAll('.key-principles-infographic-section');
      if (allInfographics.length > 1) {
        allInfographics.forEach(node => {
          if (node.id !== INFographic_ID) {
            node.remove();
          }
        });
        infographicSection = document.getElementById(INFographic_ID);
      }

      // Create if doesn't exist
      if (!infographicSection) {
        infographicSection = createInfographicSection(keySection);
        STATE.infographicSection = infographicSection;
      }

      // Only move if not already in correct position
      const isInCorrectParent = infographicSection.parentNode === parentContainer;
      const isInCorrectPosition = desiredSibling 
        ? infographicSection.nextSibling === desiredSibling
        : (keySection.nextSibling === infographicSection || !keySection.nextSibling);

      if (!isInCorrectParent || !isInCorrectPosition) {
        // Temporarily disconnect observer to prevent feedback loop
        if (STATE.observer) {
          STATE.observer.disconnect();
        }
        
        // Place the section
        if (desiredSibling && desiredSibling.parentNode === parentContainer) {
          parentContainer.insertBefore(infographicSection, desiredSibling);
        } else if (keySection.nextSibling && keySection.nextSibling !== infographicSection) {
          parentContainer.insertBefore(infographicSection, keySection.nextSibling);
        } else {
          if (infographicSection.parentNode !== parentContainer) {
          parentContainer.appendChild(infographicSection);
          }
        }
        
        // Reconnect observer after a brief delay
        if (STATE.observer) {
          setTimeout(() => {
            if (STATE.observer && appContainer) {
              STATE.observer.observe(appContainer, {
                childList: true,
                subtree: true,
              });
            }
          }, 100);
        }
      }

      STATE.lastHash = currentHash;
    }

    /**
     * Schedule placement using requestAnimationFrame
     */
    function schedulePlacement() {
      if (STATE.scheduled) return;
      STATE.scheduled = true;
      requestAnimationFrame(() => {
        STATE.scheduled = false;
        ensureInfographicPlacement();
      });
    }

    /**
     * Start observing DOM changes
     */
    function startObserver() {
      if (STATE.observer) return;
      const appContainer = document.querySelector('#app');
      if (!appContainer) return;

      STATE.observer = new MutationObserver((mutations) => {
        // Skip if mutations are only from our infographic
        let hasRelevantChanges = false;
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Skip if this is our infographic or contains it
              if (node.id === INFographic_ID || 
                  node.classList?.contains('key-principles-infographic-section')) {
                continue;
              }
              // Check if it contains our infographic
              if (node.querySelector && node.querySelector('#' + INFographic_ID)) {
                continue;
              }
              hasRelevantChanges = true;
              break;
            }
          }
          if (hasRelevantChanges) break;
          
          for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Skip if this is our infographic
              if (node.id === INFographic_ID || 
                  node.classList?.contains('key-principles-infographic-section')) {
                continue;
              }
              hasRelevantChanges = true;
              break;
            }
          }
          if (hasRelevantChanges) break;
        }
        
        if (hasRelevantChanges) {
        schedulePlacement();
        }
      });

      STATE.observer.observe(appContainer, {
        childList: true,
        subtree: true,
      });
    }

    /**
     * Stop observing DOM changes
     */
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
    }, INFographic_DELAY);

    // Re-run on navigation
    window.addEventListener('hashchange', () => {
      stopObserver();
      const existing = document.getElementById(INFographic_ID);
      if (existing) {
        existing.remove();
        STATE.infographicSection = null;
      }
      setTimeout(() => {
        ensureInfographicPlacement();
        startObserver();
      }, INFographic_HASH_DELAY);
    });
  }

  /**
   * Set a specific level for a setting (for Navitoir natural-language control).
   * value: number 0..maxLevel, or for binary 0|1.
   */
  function setSetting(key, value) {
    if (!key || !(key in state)) return;
    var config = settingsConfig[key];
    if (!config) return;
    var v = typeof value === 'number' ? value : (value ? 1 : 0);
    if (config.binary) {
      state[key] = v ? 1 : 0;
    } else {
      var maxL = (config.levels || 2);
      state[key] = Math.max(0, Math.min(maxL, Math.round(v)));
    }
    saveSettings();
    requestAnimationFrame(function() {
      applyAllSettings();
      requestAnimationFrame(function() {
        updateUI();
        var cfg = settingsConfig[key];
        if (cfg) announceToScreenReader(cfg.label + ' ' + (state[key] === 0 ? 'off' : 'level ' + state[key]));
      });
    });
  }

  // ============ PUBLIC API (for Navitoir / AI tools) ============
  window.A11yPortfolio = {
    toggle: function(key) { if (key && key in state) toggleSetting(key); },
    set: function(key, value) { setSetting(key, value); },
    getState: function() { return Object.assign({}, state); },
    getConfig: function() { return settingsConfig; },
    openPanel: function() {
      domCache.init();
      if (domCache.panel) { domCache.panel.classList.remove('hidden'); domCache.toggleBtn && domCache.toggleBtn.setAttribute('aria-expanded', 'true'); }
    },
    closePanel: function() {
      if (domCache.panel) { domCache.panel.classList.add('hidden'); domCache.toggleBtn && domCache.toggleBtn.setAttribute('aria-expanded', 'false'); }
    },
    reset: resetAll,
    applyAllSettings: applyAllSettings,
    updateUI: updateUI
  };

  // ============ STARTUP ============

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
