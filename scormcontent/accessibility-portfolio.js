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
    saturation: 0
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
    saturation: { levels: 2, binary: false, label: 'Saturation', description: 'Adjust color saturation' }
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
   * Toggle a setting value
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
    applyAllSettings();
    updateUI();
    
    // Announce change to screen readers
    const level = state[setting] === 0 ? 'off' : `level ${state[setting]}`;
    announceToScreenReader(`${config.label} ${level}`);
  }

  // ============ STYLE APPLICATION ============
  
  /**
   * Apply filter styles (contrast, saturation)
   */
  function applyFilters() {
    const filters = [];
    
    if (state.contrast === 1) {
      filters.push('contrast(1.3)');
    } else if (state.contrast === 2) {
      filters.push('contrast(1.6)', 'brightness(1.15)');
    }
    
    if (state.saturation === 1) {
      filters.push('saturate(1.5)');
    } else if (state.saturation === 2) {
      filters.push('saturate(2)');
    }
    
    if (domCache.app) {
      domCache.app.style.filter = filters.length > 0 ? filters.join(' ') : '';
    }
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
  }

  /**
   * Apply text spacing styles
   */
  function applyTextSpacing() {
    if (!domCache.app) return;
    
    if (state.textSpacing === 1) {
      domCache.app.style.letterSpacing = '0.08em';
      domCache.app.style.wordSpacing = '0.15em';
      domCache.app.style.lineHeight = '1.6';
    } else if (state.textSpacing === 2) {
      domCache.app.style.letterSpacing = '0.12em';
      domCache.app.style.wordSpacing = '0.25em';
      domCache.app.style.lineHeight = '1.8';
    } else {
      domCache.app.style.letterSpacing = '';
      domCache.app.style.wordSpacing = '';
      domCache.app.style.lineHeight = '';
    }
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
      body, body * {
        font-family: ${fontFamily} !important;
        line-height: ${lineHeight} !important;
        letter-spacing: ${letterSpacing} !important;
        word-spacing: ${wordSpacing} !important;
        text-align: left !important;
        font-weight: ${fontWeight} !important;
      }
      #accessibility-container, #accessibility-container * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        line-height: 1.5 !important;
        letter-spacing: normal !important;
        word-spacing: normal !important;
      }
      body p, body div {
        text-align: left !important;
      }
      body em, body i {
        font-style: normal !important;
        font-weight: bold !important;
      }
      ${isLevel2 ? 'body p { margin-bottom: 1em !important; }' : ''}
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
      *:focus {
        outline: ${outlineWidth} solid #3b82f6 !important;
        outline-offset: ${outlineOffset} !important;
        ${isLevel2 ? `box-shadow: 0 0 0 ${boxShadowSize} rgba(59, 130, 246, 0.3) !important;` : ''}
      }
      button:focus, a:focus, input:focus, select:focus, textarea:focus {
        outline: ${outlineWidth} solid #3b82f6 !important;
        outline-offset: ${outlineOffset} !important;
        box-shadow: 0 0 0 ${boxShadowSize} rgba(59, 130, 246, ${boxShadowOpacity}) !important;
      }
    `;
  }

  /**
   * Apply all accessibility settings
   */
  const applyAllSettings = debounce(function() {
    if (!domCache.app) {
      domCache.init();
    }
    
    applyFilters();
    applyLargeText();
    applyTextSpacing();
    applyDyslexiaStyles();
    applyHideImages();
    applyFocusIndicator();
    
    // Text to Speech
    if (state.textToSpeech === 1) {
      enableTextToSpeech();
    } else {
      disableTextToSpeech();
    }
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
   * Reset all settings
   */
  function resetAll() {
    Object.keys(state).forEach(key => {
      state[key] = 0;
    });
    saveSettings();
    applyAllSettings();
    updateUI();
    announceToScreenReader('All accessibility settings have been reset');
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

    // Accessibility options
    if (domCache.options && domCache.options.length > 0) {
      domCache.options.forEach(option => {
        option.addEventListener('click', () => {
          const setting = option.dataset.setting;
          if (setting) {
            toggleSetting(setting);
          }
        });
        
        // Keyboard support
        option.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            option.click();
          }
        });
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
      lastKeySectionId: null,
      placementTimeout: null,
    };

    const INFographic_ID = 'key-principles-infographic-injected';
    const OBSERVER_DEBOUNCE = 500; // Debounce observer calls

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
     * Check if infographic is already correctly positioned
     */
    function isCorrectlyPositioned(infographicSection, parentContainer, desiredSibling) {
      if (!infographicSection || !infographicSection.isConnected) {
        return false;
      }
      
      if (infographicSection.parentNode !== parentContainer) {
        return false;
      }
      
      // Check if it's in the right position relative to desired sibling
      if (desiredSibling) {
        return infographicSection.nextSibling === desiredSibling;
      }
      
      // If no desired sibling, check if it's after the key section
      return true;
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
        if (STATE.infographicSection?.isConnected) {
          STATE.infographicSection.remove();
          STATE.infographicSection = null;
        }
        // Also remove any orphaned sections
        document.querySelectorAll('.key-principles-infographic-section').forEach(node => {
          if (node.id !== INFographic_ID || node !== STATE.infographicSection) {
            node.remove();
          }
        });
        STATE.lastHash = currentHash;
        STATE.lastKeySectionId = null;
        return;
      }

      // Get a stable identifier for the key section
      const keySectionId = keySection.id || 
                          Array.from(keySection.parentNode?.children || []).indexOf(keySection) ||
                          keySection.textContent?.substring(0, 50);

      const parentContainer = keySection.parentNode;
      if (!parentContainer) return;

      const usingSection = findUsingShortSentencesSection(parentContainer);
      const desiredSibling = usingSection || keySection.nextSibling;

      // Get or create infographic section
      let infographicSection = STATE.infographicSection || document.getElementById(INFographic_ID);
      
      // Remove any duplicates (shouldn't happen, but safety check)
      document.querySelectorAll('.key-principles-infographic-section').forEach(node => {
        if (node !== infographicSection && node.id !== INFographic_ID) {
          node.remove();
        }
      });

      // Create section if needed
      if (!infographicSection || !infographicSection.isConnected) {
        infographicSection = createInfographicSection(keySection);
        STATE.infographicSection = infographicSection;
      }

      // Only move if incorrectly positioned
      if (!isCorrectlyPositioned(infographicSection, parentContainer, desiredSibling)) {
        // Use insertBefore for stable positioning
        if (desiredSibling && desiredSibling.parentNode === parentContainer) {
          parentContainer.insertBefore(infographicSection, desiredSibling);
        } else if (keySection.nextSibling && keySection.nextSibling !== infographicSection) {
          parentContainer.insertBefore(infographicSection, keySection.nextSibling);
        } else if (!keySection.nextSibling || keySection.nextSibling === infographicSection) {
          // Already in correct position or no specific position needed
          if (infographicSection.parentNode !== parentContainer) {
            parentContainer.appendChild(infographicSection);
          }
        }
      }

      STATE.lastHash = currentHash;
      STATE.lastKeySectionId = keySectionId;
    }

    /**
     * Debounced placement function
     */
    const debouncedPlacement = debounce(() => {
      ensureInfographicPlacement();
    }, OBSERVER_DEBOUNCE);

    /**
     * Schedule placement using requestAnimationFrame with debouncing
     */
    function schedulePlacement() {
      if (STATE.scheduled) return;
      STATE.scheduled = true;
      
      // Clear any pending timeout
      if (STATE.placementTimeout) {
        clearTimeout(STATE.placementTimeout);
      }
      
      requestAnimationFrame(() => {
        STATE.scheduled = false;
        // Use debounced placement to prevent excessive calls
        debouncedPlacement();
      });
    }

    /**
     * Start observing DOM changes with filtering
     */
    function startObserver() {
      if (STATE.observer) return;
      const appContainer = document.querySelector('#app');
      if (!appContainer) return;

      STATE.observer = new MutationObserver((mutations) => {
        // Filter out mutations caused by our own infographic
        const relevantMutations = mutations.filter(mutation => {
          // Ignore mutations on our own infographic section
          for (const node of mutation.addedNodes) {
            if (node.id === INFographic_ID || 
                node.classList?.contains('key-principles-infographic-section') ||
                node.querySelector?.('#' + INFographic_ID)) {
              return false;
            }
          }
          return true;
        });

        if (relevantMutations.length > 0) {
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
      if (STATE.placementTimeout) {
        clearTimeout(STATE.placementTimeout);
        STATE.placementTimeout = null;
      }
    }

    /**
     * Handle hash change with stability checks
     */
    function handleHashChange() {
      const currentHash = window.location.hash;
      
      // Only reset if hash actually changed
      if (currentHash === STATE.lastHash) {
        return;
      }

      stopObserver();
      
      // Only remove if we're leaving the relevant page
      const appContainer = document.querySelector('#app');
      const keySection = appContainer ? findKeyPrinciplesSection(appContainer) : null;
      
      if (!keySection && STATE.infographicSection?.isConnected) {
        STATE.infographicSection.remove();
        STATE.infographicSection = null;
      }
      
      // Clean up any orphaned sections
      document.querySelectorAll('.key-principles-infographic-section').forEach(node => {
        if (node.id !== INFographic_ID || node !== STATE.infographicSection) {
          node.remove();
        }
      });

      STATE.placementTimeout = setTimeout(() => {
        ensureInfographicPlacement();
        startObserver();
      }, INFographic_HASH_DELAY);
    }

    // Initial placement
    setTimeout(() => {
      ensureInfographicPlacement();
      startObserver();
    }, INFographic_DELAY);

    // Re-run on navigation
    window.addEventListener('hashchange', handleHashChange);
    
    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(handleHashChange, 100);
    });
  }

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
