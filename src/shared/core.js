import { createFontController, CUSTOM_FONT_KEY } from './fonts.js';
import {
  DEFAULT_STATE,
  normalizeState,
  detectTextDirection,
  CLAUDE_DARK_SURFACE_KEY
} from './constants.js';

const STYLE_ID = 'gptgate-style-core';
const FONT_STYLE_ID = 'gptgate-font-style';
const PANEL_ID = 'gptgate-floating-panel';
const PANEL_STYLE_ID = 'gptgate-floating-panel-style';
export function initExtension(platformSelectors) {
  if (window.__gptgate_loaded) {
    console.log('[GptGate] content script already loaded, skipping');
    return;
  }
  window.__gptgate_loaded = true;
  console.log('[GptGate] content script booting');

  let __observer = null;
  let mutationTimer = null;
  let handleResize = null;
  let handleVisibilityChange = null;

  const CURRENT_RUN_ID = Math.random().toString(36).substring(2);
  const isChatGPT = window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com');
  const isGemini = window.location.hostname.includes('gemini.google.com');
  const isClaude = window.location.hostname.includes('claude.ai');
  let claudeDarkSurface = true;
  const isContextInvalidated = () => {
    try {
      if (typeof chrome === 'undefined' || !chrome || !chrome.runtime || !chrome.runtime.id) {
        return true;
      }
      return false;
    } catch (e) {
      return true;
    }
  };
  const handleInvalidation = () => {
    if (__observer) {
      try { __observer.disconnect(); } catch (_) {}
      __observer = null;
    }
    if (mutationTimer) {
      clearTimeout(mutationTimer);
      mutationTimer = null;
    }
    if (handleResize) {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('transitionend', schedulePanelPlacementDebounced);
    }
    if (handleVisibilityChange) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  // Detect context invalidation immediately on extension reload/disable
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.connect) {
      const port = chrome.runtime.connect({ name: 'gptgate-context' });
      port.onDisconnect.addListener(() => {
        handleInvalidation();
      });
    }
  } catch (err) {
    // Silent catch
  }

  const { SELECTORS, SIDEBAR_SELECTORS, PANEL_RIGHT = 15, disableDirectionCSS = false } = platformSelectors;

  /* ── CSS Rules Generation ── */
  const CSS_RULES = (() => {
    const respSel = SELECTORS.responses.join(', ');
    const respSelDeep = SELECTORS.responses.map((s) => `${s} *`).join(', ');
    const compSel = SELECTORS.composer.join(', ');
    const compSelDeep = SELECTORS.composer.map((s) => `${s} *`).join(', ');
    const mathSel = SELECTORS.math.join(', ');

    const directionRules = disableDirectionCSS ? [] : [
      /* ── RTL responses ── */
      `body.gptgate-rtl-response ${respSel} { direction: rtl !important; text-align: right !important; unicode-bidi: plaintext !important; }`,
      `body.gptgate-rtl-response ${respSelDeep} { direction: rtl !important; text-align: right !important; unicode-bidi: plaintext !important; }`,

      /* ── LTR responses ── */
      `body.gptgate-ltr-response ${respSel} { direction: ltr !important; text-align: left !important; unicode-bidi: plaintext !important; }`,
      `body.gptgate-ltr-response ${respSelDeep} { direction: ltr !important; text-align: left !important; unicode-bidi: plaintext !important; }`,

      /* ── Auto responses ── */
      `body.gptgate-auto-response ${respSel} { direction: unset !important; text-align: unset !important; unicode-bidi: unset !important; }`,
      `body.gptgate-auto-response ${respSelDeep} { direction: unset !important; text-align: unset !important; unicode-bidi: unset !important; }`,

      /* ── RTL composer ── */
      `body.gptgate-rtl-composer ${compSel} { direction: rtl !important; text-align: right !important; }`,
      `body.gptgate-rtl-composer ${compSelDeep} { direction: rtl !important; text-align: right !important; }`,

      /* ── LTR composer ── */
      `body.gptgate-ltr-composer ${compSel} { direction: ltr !important; text-align: left !important; }`,
      `body.gptgate-ltr-composer ${compSelDeep} { direction: ltr !important; text-align: left !important; }`,

      /* ── Auto composer (Disabled so JS engine can take over) ── */
      // \`body.gptgate-auto-composer \${compSel} { direction: unset !important; text-align: unset !important; }\`,
      // \`body.gptgate-auto-composer \${compSelDeep} { direction: unset !important; text-align: unset !important; }\`,

      /* ── Placeholder alignment (if inputs exist) ── */
      `body.gptgate-rtl-composer textarea::placeholder, body.gptgate-rtl-composer input::placeholder { text-align: right !important; }`,
      `body.gptgate-ltr-composer textarea::placeholder, body.gptgate-ltr-composer input::placeholder { text-align: left !important; }`,
    ];

    return [
      ...directionRules,

      /* ── Math fix: KaTeX display math ── */
      `body.gptgate-math-fix .katex-display { direction: ltr !important; text-align: center !important; margin: 1em 0; }`,
      `body.gptgate-math-fix .katex-display > .katex > .katex-html { direction: ltr !important; text-align: center !important; width: 100%; }`,

      /* ── Math fix: MathJax display math ── */
      `body.gptgate-math-fix .mjx-container[display="true"], body.gptgate-math-fix .MathJax_Display { direction: ltr !important; text-align: center !important; margin: 1em 0; }`,

      /* ── Math fix: Persian text inside formulas ── */
      `body.gptgate-math-fix .katex .mord.text { direction: rtl; unicode-bidi: embed; }`,

      /* ── Math fix: General LTR override for formulas to prevent RTL contamination ── */
      `body.gptgate-math-fix ${mathSel} { direction: ltr !important; text-align: left !important; display: inline-block; unicode-bidi: normal !important; }`,
      `body.gptgate-math-fix ${mathSel} * { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; }`,

      /* ── Keep code blocks and programming code LTR ── */
      `body.gptgate-rtl-response pre, body.gptgate-rtl-response code, body.gptgate-rtl-response [class*="code"], body.gptgate-auto-response pre, body.gptgate-auto-response code, body.gptgate-auto-response [class*="code"] { direction: ltr !important; text-align: left !important; }`,
      `body.gptgate-rtl-response pre *, body.gptgate-rtl-response code *, body.gptgate-rtl-response [class*="code"] *, body.gptgate-auto-response pre *, body.gptgate-auto-response code *, body.gptgate-auto-response [class*="code"] * { direction: ltr !important; text-align: left !important; }`,

      /* ── Proper bidi for paragraphs in RTL mode ── */
      `body.gptgate-rtl-response ${respSel}, body.gptgate-auto-response ${respSel} { unicode-bidi: plaintext !important; text-align: start !important; }`,
    ].filter(Boolean);
  })();

  function injectStylesOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS_RULES.join('\n');
    document.head.appendChild(style);
  }

  injectStylesOnce();

  /* ── Direction class management ── */
  const RESP_CLASSES = ['gptgate-rtl-response', 'gptgate-ltr-response', 'gptgate-auto-response'];
  const COMP_CLASSES = ['gptgate-rtl-composer', 'gptgate-ltr-composer', 'gptgate-auto-composer'];

  function setDirClass(group, target) {
    const body = document.body;
    if (!body) return;
    body.classList.remove(...group);
    if (target) body.classList.add(target);
  }

  function setRtlResponses(enabled) { setDirClass(RESP_CLASSES, enabled ? 'gptgate-rtl-response' : null); }
  function setLtrResponses(enabled) { setDirClass(RESP_CLASSES, enabled ? 'gptgate-ltr-response' : null); }
  function setAutoResponses(enabled) { setDirClass(RESP_CLASSES, enabled ? 'gptgate-auto-response' : null); }
  function setRtlComposer(enabled) { setDirClass(COMP_CLASSES, enabled ? 'gptgate-rtl-composer' : null); }
  function setLtrComposer(enabled) { setDirClass(COMP_CLASSES, enabled ? 'gptgate-ltr-composer' : null); }
  function setAutoComposer(enabled) { setDirClass(COMP_CLASSES, enabled ? 'gptgate-auto-composer' : null); }

  function setMathFix(enabled) {
    document.body?.classList.toggle('gptgate-math-fix', !!enabled);
    if (enabled) fixMathSpacing();
  }

  function fixMathSpacing() {
    const rtlElements = document.querySelectorAll(SELECTORS.responses.join(', '));
    rtlElements.forEach((p) => {
      const mathEls = p.querySelectorAll('.katex, .mjx-container');
      if (mathEls.length === 0) return;
      const dir = detectTextDirection(p.textContent?.trim() || '');
      if (dir !== 'rtl') return;

      mathEls.forEach((mathEl) => {
        const next = mathEl.nextSibling;
        if (next && next.nodeType === Node.TEXT_NODE && next.textContent) {
          const text = next.textContent;
          if (!text.startsWith('\u200F')) next.textContent = '\u200F' + text;
        }
      });
    });
  }

  /* ── Floating panel ── */
  function injectPanelStyles() {
    // Context invalidation check
    if (isContextInvalidated()) {
      handleInvalidation();
      return;
    }

    try {
      let style = document.getElementById(PANEL_STYLE_ID);
      if (!style) {
        style = document.createElement('style');
        style.id = PANEL_STYLE_ID;
      style.textContent = `
        #${PANEL_ID} {
          position: fixed; bottom: 30px; right: ${PANEL_RIGHT}px; display: inline-flex; align-items: center; justify-content: center;
          box-sizing: border-box; width: 46px; height: 46px; padding: 0; gap: 0; overflow: visible;
          border-radius: 12px; background: linear-gradient(135deg, rgba(2, 2, 2, 0.85), rgba(12, 12, 12, 0.7));
          border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(18px) saturate(160%); -webkit-backdrop-filter: blur(18px) saturate(160%);
          color: #f3f4f6; font-family: "Segoe UI", "Inter", sans-serif;
          font-size: 14px; font-weight: 700; letter-spacing: 0.8px; z-index: 2147483646; cursor: pointer;
          text-decoration: none !important; pointer-events: auto !important;
          contain: layout style; isolation: isolate; transform: translateZ(0); backface-visibility: hidden;
          will-change: transform, box-shadow, border-color;
          transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms cubic-bezier(0.16, 1, 0.3, 1), background 180ms ease;
        }
        #${PANEL_ID}::after { content: ""; position: absolute; top: -15px; left: -15px; right: -15px; bottom: -15px; z-index: -1; }
        #${PANEL_ID}:hover { transform: translate3d(0, -2px, 0); border-color: rgba(47, 204, 225, 0.3); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45), 0 0 20px rgba(47, 204, 225, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
        #${PANEL_ID}:active { transform: translate3d(0, 0, 0) scale(0.98); border-color: rgba(47, 204, 225, 0.4); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35), 0 0 12px rgba(47, 204, 225, 0.25); }
        #${PANEL_ID}:focus-visible { outline: 2px solid #2FCCE1; outline-offset: 3px; }
        #${PANEL_ID} * { pointer-events: none; }
        #${PANEL_ID} .gptgate-logo { width: 32px; height: 32px; flex: 0 0 32px; border-radius: 8px; box-shadow: none; mix-blend-mode: screen; transform: translateZ(0); will-change: transform; transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1); }
        #${PANEL_ID}:hover .gptgate-logo { transform: scale(1.05); }
        #${PANEL_ID} .gptgate-title {
          position: absolute; top: 50%; right: 54px; height: 34px; padding: 0 12px; margin: 0;
          display: inline-flex; align-items: center; white-space: nowrap; border-radius: 11px;
          background: linear-gradient(135deg, rgba(2, 2, 2, 0.9), rgba(12, 12, 12, 0.78));
          border: 1px solid rgba(47, 204, 225, 0.18);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.36), 0 0 14px rgba(47, 204, 225, 0.18);
          opacity: 0; transform: translate3d(8px, -50%, 0) scale(0.98); transform-origin: right center;
          will-change: transform, opacity; transition: opacity 140ms ease-out, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        #${PANEL_ID}:hover .gptgate-title { opacity: 1; transform: translate3d(0, -50%, 0) scale(1); }
        
        .gg-gradient-text {
          background: linear-gradient(135deg, #2FCCE1 0%, #108EBE 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        #${PANEL_ID}.is-collapsed { width: 38px; height: 38px; padding: 0; border-radius: 10px; transform: translate3d(-6px, 0, 0); }
        #${PANEL_ID}.is-collapsed .gptgate-logo { width: 28px; height: 28px; flex-basis: 28px; border-radius: 7px; }
        #${PANEL_ID}.is-collapsed .gptgate-title { display: none !important; }
        #${PANEL_ID}.is-collapsed:hover { transform: translate3d(-6px, -2px, 0); }
        #${PANEL_ID}.is-collapsed:hover .gptgate-logo { transform: scale(1.05); }
        #${PANEL_ID}.is-collapsed:hover .gptgate-title { display: none !important; }

        /* ── Gemini platform styles (moved to bottom center, in-flow) ── */
        body.gptgate-platform-gemini #${PANEL_ID} {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          width: 170px !important;
          min-width: 170px !important;
          max-width: calc(100vw - 32px) !important;
          bottom: auto !important;
          transform: none !important;
          margin: 5px auto 0 !important;
          height: 38px !important;
          border-radius: 10px !important;
          padding: 0 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          z-index: 10 !important;
          flex: 0 0 auto !important;
          align-self: center !important;
          overflow: hidden !important;
          contain: layout style !important;
          transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID} .gptgate-logo {
          width: 28px !important;
          height: 28px !important;
          border-radius: 7px !important;
          flex: 0 0 28px !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID} .gptgate-title {
          position: static !important;
          height: auto !important;
          padding: 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          opacity: 1 !important;
          display: inline-block !important;
          margin: 0 !important;
          flex: 0 0 auto !important;
          transform: none !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID}:hover {
          width: 170px !important;
          min-width: 170px !important;
          transform: translate3d(0, -2px, 0) !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(47, 204, 225, 0.3) !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID}:hover .gptgate-logo {
          width: 28px !important;
          height: 28px !important;
          border-radius: 7px !important;
          transform: none !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID}:active {
          transform: translate3d(0, 0, 0) scale(0.98) !important;
        }
        
        /* Keep centered for Gemini even when collapsed */
        body.gptgate-platform-gemini #${PANEL_ID}.is-collapsed {
          width: 170px !important;
          min-width: 170px !important;
          transform: none !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID}.is-collapsed:hover {
          width: 170px !important;
          min-width: 170px !important;
          height: 38px !important;
          padding: 0 10px !important;
          transform: translate3d(0, -2px, 0) !important;
        }
        body.gptgate-platform-gemini #${PANEL_ID}.is-collapsed .gptgate-title,
        body.gptgate-platform-gemini #${PANEL_ID}.is-collapsed:hover .gptgate-title {
          opacity: 1 !important;
          display: inline-block !important;
        }

        /* ── Claude: relocated panel when overlapping composer ── */
        body.gptgate-platform-claude #${PANEL_ID}.gptgate-top {
          position: static !important;
          width: 108px !important;
          min-width: 108px !important;
          height: 34px !important;
          padding: 0 8px !important;
          gap: 6px !important;
          border-radius: 10px !important;
          justify-content: flex-start !important;
          align-self: center !important;
          margin: 0 !important;
          transform: none !important;
          overflow: hidden !important;
          contain: layout style !important;
        }
        body.gptgate-platform-claude #${PANEL_ID}.gptgate-top .gptgate-logo {
          width: 24px !important;
          height: 24px !important;
          border-radius: 6px !important;
          flex: 0 0 24px !important;
        }
        body.gptgate-platform-claude #${PANEL_ID}.gptgate-top .gptgate-title {
          display: inline-flex !important;
          position: static !important;
          height: auto !important;
          padding: 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
          font-size: 11px !important;
          line-height: 1 !important;
          opacity: 1 !important;
          transform: none !important;
        }
        body.gptgate-platform-claude #${PANEL_ID}.gptgate-top:hover {
          width: 108px !important;
          min-width: 108px !important;
          height: 34px !important;
          padding: 0 8px !important;
          border-radius: 10px !important;
          justify-content: flex-start !important;
          transform: translate3d(0, -2px, 0) !important;
          border-color: rgba(47, 204, 225, 0.3) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(47, 204, 225, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        }
        body.gptgate-platform-claude #${PANEL_ID}.gptgate-top:hover .gptgate-logo {
          width: 24px !important;
          height: 24px !important;
          border-radius: 6px !important;
          flex-basis: 24px !important;
        }
        body.gptgate-platform-claude #${PANEL_ID}.gptgate-top:hover .gptgate-title {
          opacity: 1 !important;
          transform: none !important;
        }

      `;
      document.documentElement.appendChild(style);
    }
    } catch (err) {
      console.warn('[GptGate] Failed to inject panel styles:', err);
    }
  }

  function setClaudeDarkSurface(enabled, { persist = false } = {}) {
    if (!isClaude) return;
    claudeDarkSurface = !!enabled;
    document.documentElement?.classList.toggle('gptgate-claude-dark-surface', claudeDarkSurface);
    document.body?.classList.toggle('gptgate-claude-dark-surface', claudeDarkSurface);

    if (persist && typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      try {
        chrome.storage.sync.set({ [CLAUDE_DARK_SURFACE_KEY]: claudeDarkSurface });
      } catch (_) {}
    }
  }

  function ensureFloatingPanel() {
    if (isChatGPT) return; // Attribution lives in the single PDF menu.
    if (isContextInvalidated()) {
      handleInvalidation();
      return;
    }
    injectPanelStyles();
    let panel = document.getElementById(PANEL_ID);
    if (panel && panel.dataset.runId !== CURRENT_RUN_ID) {
      panel.remove();
      panel = null;
    }

    if (!panel) {
      panel = document.createElement('a');
      panel.id = PANEL_ID;
      panel.href = 'https://t.me/GptGateAI';
      panel.target = '_blank';
      panel.rel = 'noopener noreferrer';
      panel.setAttribute('aria-label', 'GptGate – باز کردن کانال تلگرام');
      panel.dataset.runId = CURRENT_RUN_ID;

      const logo = document.createElement('img');
      logo.className = 'gptgate-logo';
      try {
        logo.src = chrome.runtime.getURL('images/brand-mark.svg');
      } catch (_) {
        // Extension context invalidated or getURL failed
        logo.src = '';
      }
      logo.alt = 'GptGate';

      const title = document.createElement('span');
      title.className = 'gptgate-title';
      title.innerHTML = 'Gpt<span class="gg-gradient-text">Gate</span>';

      panel.append(logo, title);

      const openLink = (e) => {
        // Stop ChatGPT/Claude SPA router from intercepting click
        e.stopPropagation();
        // Always prevent default — we handle navigation ourselves
        e.preventDefault();

        const TARGET_URL = 'https://t.me/GptGateAI';

        // Try chrome.runtime.sendMessage first (opens via background service worker)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          try {
            chrome.runtime.sendMessage({ type: 'open-link', url: TARGET_URL }, (response) => {
              if (chrome.runtime.lastError) {
                // Extension context invalidated — fallback to window.open
                console.log('[GptGate] Context invalidated, using fallback.');
                window.open(TARGET_URL, '_blank', 'noopener,noreferrer');
              }
            });
            return; // sendMessage dispatched successfully
          } catch (_) {
            // chrome.runtime threw — fall through to window.open
          }
        }

        // Fallback: open via standard window.open
        window.open(TARGET_URL, '_blank', 'noopener,noreferrer');
      };
      panel.addEventListener('click', openLink);

    }

    if (isGemini) {
      const bar = document.querySelector('input-area-v2');
      if (bar) {
        if (bar.nextElementSibling?.id !== PANEL_ID) {
          bar.insertAdjacentElement('afterend', panel);
        }
      } else {
        if (panel.parentElement !== document.body) {
          document.body.appendChild(panel);
        }
      }
    } else if (isClaude) {
      if (!panel.parentElement || !document.body.contains(panel)) {
        document.body.appendChild(panel);
      }
    } else {
      if (panel.parentElement !== document.body) {
        document.body.appendChild(panel);
      }
    }
    updateFloatingPanelLayout();
    if (isClaude) updatePanelPlacement();
  }

  let sidebarElement = null;
  let sidebarResizeObserver = null;
  let sidebarAttrObserver = null;

  function cleanupSidebarObservers() {
    if (sidebarResizeObserver) { sidebarResizeObserver.disconnect(); sidebarResizeObserver = null; }
    if (sidebarAttrObserver) { sidebarAttrObserver.disconnect(); sidebarAttrObserver = null; }
  }

  function detectSidebarElement() {
    let best = null;
    let bestScore = -Infinity;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;

    for (const selector of SIDEBAR_SELECTORS) {
      document.querySelectorAll(selector).forEach((el) => {
        if (!el || !document.body.contains(el)) return;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') < 0.05) return;
        const rect = el.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 140) return;
        if (viewportWidth && rect.left > viewportWidth * 0.6) return;
        if (rect.left > 260) return;
        const score = rect.width - rect.left;
        if (score > bestScore) { bestScore = score; best = el; }
      });
    }
    return best;
  }

  function sidebarLooksOpen(el) {
    if (!el || !document.body.contains(el)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') < 0.05) return false;
    const rect = el.getBoundingClientRect();
    if (rect.left > 160) return false;
    return rect.width > 150;
  }

  function updateFloatingPanelLayout({ autoFind = true } = {}) {
    if (isChatGPT) return;
    if (isContextInvalidated()) {
      handleInvalidation();
      return;
    }
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    if (autoFind) {
      const candidate = detectSidebarElement();
      if (candidate !== sidebarElement) {
        cleanupSidebarObservers();
        sidebarElement = candidate || null;
        if (sidebarElement) {
          sidebarResizeObserver = new ResizeObserver(() => updateFloatingPanelLayout({ autoFind: false }));
          try { sidebarResizeObserver.observe(sidebarElement); } catch (_err) {}
          sidebarAttrObserver = new MutationObserver(() => updateFloatingPanelLayout({ autoFind: false }));
          sidebarAttrObserver.observe(sidebarElement, { attributes: true, attributeFilter: ['style', 'class', 'hidden', 'aria-hidden'] });
        }
      }
    } else if (sidebarElement && !document.body.contains(sidebarElement)) {
      cleanupSidebarObservers();
      sidebarElement = null;
    }

    const collapsed = sidebarElement ? sidebarLooksOpen(sidebarElement) : false;
    panel.classList.toggle('is-collapsed', !!collapsed);
  }

  let lastGeminiDisclaimerScanAt = 0;
  // Matches with or without the ZWNJ (‌) Gemini's markup may or may not include.
  const GEMINI_DISCLAIMER_PATTERN = /هوش‌?واره\s*است|هوش‌?وار\s*است|may display inaccurate info(?:rmation)?/;
  function hideGeminiDisclaimer() {
    if (!isGemini) return;
    const now = Date.now();
    if (now - lastGeminiDisclaimerScanAt < 2200) return;
    lastGeminiDisclaimerScanAt = now;
    try {
      const elements = document.querySelectorAll('p, div, span, small');
      for (const el of elements) {
        // Only look at text nodes that are direct children of el (ignoring
        // sibling <a> links / comment nodes Gemini interleaves in the same
        // paragraph) so we don't require the element to have exactly one child.
        const hasDirectMatch = Array.from(el.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && GEMINI_DISCLAIMER_PATTERN.test(node.textContent)
        );
        if (!hasDirectMatch) continue;

        const parent = el.closest('div, p') || el;
        parent.style.setProperty('display', 'none', 'important');
        if (parent.parentElement && parent.parentElement.offsetHeight < 80) {
          parent.parentElement.style.setProperty('display', 'none', 'important');
        }
      }
    } catch (_) {}
  }

  /* ── Claude panel overlap detection & relocation ── */

  const CLAUDE_ENTER_TOP = 1150;
  const CLAUDE_EXIT_TOP = 1210; // ≈60px hysteresis

  function updateClaudePanelPlacement() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const container = document.querySelector('[data-testid="wiggle-controls-actions"]');
    const vw = window.innerWidth;
    const isTop = panel.classList.contains('gptgate-top');

    let shouldBeTop = false;
    if (container) {
      if (isTop && vw > CLAUDE_EXIT_TOP) {
        shouldBeTop = false;
      } else if (!isTop && vw < CLAUDE_ENTER_TOP) {
        shouldBeTop = true;
      } else {
        shouldBeTop = isTop;
      }
    }

    panel.classList.toggle('gptgate-top', shouldBeTop);

    if (shouldBeTop && container) {
      if (panel.parentElement !== container) {
        container.prepend(panel);
      }
    } else {
      const bar = document.querySelector('input-area-v2');
      if (bar) {
        if (bar.nextElementSibling?.id !== PANEL_ID) {
          bar.insertAdjacentElement('afterend', panel);
        }
      } else {
        if (panel.parentElement !== document.body) {
          document.body.appendChild(panel);
        }
      }
    }
  }

  function updatePanelPlacement() {
    if (isClaude) updateClaudePanelPlacement();
  }

  let panelPlacementRafId = null;
  function schedulePanelPlacement() {
    if (!isClaude) return;
    if (panelPlacementRafId) return;
    panelPlacementRafId = requestAnimationFrame(() => {
      panelPlacementRafId = null;
      if (isContextInvalidated()) return;
      updatePanelPlacement();
    });
  }

  let panelPlacementTimerId = null;
  function schedulePanelPlacementDebounced() {
    if (!isClaude) return;
    if (panelPlacementTimerId) clearTimeout(panelPlacementTimerId);
    panelPlacementTimerId = setTimeout(() => {
      panelPlacementTimerId = null;
      if (isContextInvalidated()) return;
      updatePanelPlacement();
    }, 90);
  }

  let claudeBodyResizeObserver = null;

  let rafId = null;
  let geminiPlacementTimerId = null;
  function scheduleGeminiPlacement() {
    if (!isGemini) return;
    if (rafId || geminiPlacementTimerId) return;
    geminiPlacementTimerId = setTimeout(() => {
      geminiPlacementTimerId = null;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (isContextInvalidated()) return;

        const panel = document.getElementById(PANEL_ID);
        if (!panel) {
          ensureFloatingPanel();
          return;
        }

        const bar = document.querySelector('input-area-v2');
        if (bar) {
          if (bar.nextElementSibling?.id !== PANEL_ID) {
            bar.insertAdjacentElement('afterend', panel);
          }
        }
        hideGeminiDisclaimer();
      });
    }, 120);
  }

  const updateFont = createFontController(platformSelectors.SELECTORS);

  /* ── State management ── */
  let currentState = { ...DEFAULT_STATE };

  function applyState(state, reason = 'update') {
    if (isContextInvalidated()) {
      handleInvalidation();
      return;
    }
    currentState = normalizeState({ ...currentState, ...state });
    const { responseDir, composerDir, mathFix, fontFix, claudeDarkSurface: nextClaudeDarkSurface } = currentState;

    void updateFont(currentState);

    if (isChatGPT) document.body?.classList.add('gptgate-platform-chatgpt');

    // Toggle font class
    document.body?.classList.toggle('gptgate-use-font', !!fontFix);

    if (responseDir === 'rtl') setRtlResponses(true);
    else if (responseDir === 'ltr') setLtrResponses(true);
    else setAutoResponses(true);

    if (composerDir === 'rtl') setRtlComposer(true);
    else if (composerDir === 'ltr') setLtrComposer(true);
    else setAutoComposer(true);

    const effectiveMathFix = mathFix || responseDir === 'rtl' || composerDir === 'rtl';
    setMathFix(effectiveMathFix);
    if (isClaude) setClaudeDarkSurface(nextClaudeDarkSurface);

    ensureFloatingPanel();
    if (isGemini) scheduleGeminiPlacement();
    if (isClaude) updatePanelPlacement();
  }

  function retryPanelPlacementDuringBoot() {
    if (!isClaude) return;
    [50, 180, 500, 1100].forEach((delay) => {
      setTimeout(() => {
        if (isContextInvalidated()) return;
        ensureFloatingPanel();
        updatePanelPlacement();
      }, delay);
    });
  }

  /* ── Initialize ── */
  let coreStarted = false;
  function startCore() {
    if (!document.body || !document.documentElement) {
      setTimeout(startCore, 50);
      return;
    }
    if (coreStarted) return;
    coreStarted = true;

    if (isChatGPT) {
      document.body.classList.add('gptgate-platform-chatgpt');
    }
    if (isGemini) {
      document.body.classList.add('gptgate-platform-gemini');
    }
    if (isClaude) {
      document.body.classList.add('gptgate-platform-claude');
      setClaudeDarkSurface(true);
    }

    if (isChatGPT) {
      // Hydration can replace body or reset its class attribute after document_start.
      const stateObserver = new MutationObserver(() => {
        if (isContextInvalidated()) { stateObserver.disconnect(); return; }
        const body = document.body;
        const expected = ['gptgate-platform-chatgpt', `gptgate-${currentState.responseDir}-response`, `gptgate-${currentState.composerDir}-composer`];
        if (currentState.fontFix) expected.push('gptgate-use-font');
        if (currentState.mathFix || currentState.responseDir === 'rtl' || currentState.composerDir === 'rtl') expected.push('gptgate-math-fix');
        if (body && expected.some(name => !body.classList.contains(name))) applyState({}, 'body-state-restored');
      });
      let observedBody = document.body;
      const observeBody = () => {
        if (!document.body || document.body === observedBody) return;
        observedBody = document.body;
        stateObserver.disconnect();
        if (document.body) {
          stateObserver.observe(document.body, {attributes:true,attributeFilter:['class']});
          applyState({}, 'body-replaced');
        }
      };
      const bodyObserver = new MutationObserver(observeBody);
      bodyObserver.observe(document.documentElement, {childList:true});
      stateObserver.observe(document.body, {attributes:true,attributeFilter:['class']});
    }

    applyState(DEFAULT_STATE, 'default-init');
    ensureFloatingPanel();
    updateFloatingPanelLayout();
    retryPanelPlacementDuringBoot();
    hideGeminiDisclaimer();
    if (isGemini) {
      scheduleGeminiPlacement();
      
      const geminiObserver = new MutationObserver(() => {
        scheduleGeminiPlacement();
      });
      geminiObserver.observe(document.body, { childList: true, subtree: true });

    }
    if (isClaude) {
      schedulePanelPlacement();

      // ResizeObserver on body — catches layout shifts from sidebar, zoom, etc.
      claudeBodyResizeObserver = new ResizeObserver(() => {
        schedulePanelPlacementDebounced();
      });
      claudeBodyResizeObserver.observe(document.body);

      // Also listen to DOM mutations (new elements appearing)
      const claudeMutObs = new MutationObserver(() => {
        schedulePanelPlacementDebounced();
      });
      claudeMutObs.observe(document.body, { childList: true, subtree: true });

      // Resize, body resize and DOM observers already schedule placement.
      // No idle poll: late layout transitions are covered by their end event.
      document.addEventListener('transitionend', schedulePanelPlacementDebounced);
    }

    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
        chrome.storage.sync.get(
          [...Object.keys(DEFAULT_STATE), 'rtlResponses', 'rtlComposer'],
          (state) => {
            if (isContextInvalidated()) return;
            applyState(state || {}, 'initial');
            if (isClaude && state && CLAUDE_DARK_SURFACE_KEY in state) {
              setClaudeDarkSurface(state[CLAUDE_DARK_SURFACE_KEY]);
            }
          }
        );
      }
    } catch (err) {
      console.warn('[GptGate] Failed to fetch initial storage:', err);
    }

    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (isContextInvalidated()) return;
          if (area === 'local' && CUSTOM_FONT_KEY in changes) void updateFont(currentState, true);
          if (area !== 'sync') return;
          const upd = {};
          for (const key of ['fontFamily','fontWeight']) if (key in changes) upd[key] = changes[key].newValue;
          if ('responseDir' in changes) upd.responseDir = changes.responseDir.newValue;
          if ('composerDir' in changes) upd.composerDir = changes.composerDir.newValue;
          if ('mathFix' in changes) upd.mathFix = changes.mathFix.newValue;
          if ('fontFix' in changes) upd.fontFix = changes.fontFix.newValue;
          if ('rtlResponses' in changes) upd.rtlResponses = changes.rtlResponses.newValue;
          if ('rtlComposer' in changes) upd.rtlComposer = changes.rtlComposer.newValue;
          if (Object.keys(upd).length) applyState(upd, 'storage-change');
          if (isClaude && CLAUDE_DARK_SURFACE_KEY in changes) {
            setClaudeDarkSurface(changes[CLAUDE_DARK_SURFACE_KEY].newValue);
          }
        });
      }
    } catch (err) {
      console.warn('[GptGate] Failed to add storage listener:', err);
    }

    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
          if (isContextInvalidated()) return;
          if (!msg) return;
          if (msg.type === 'gptgate:update' || msg.type === 'teta:update') {
            applyState(msg.state || {}, 'message');
            sendResponse?.({ ok: true });
          }
        });
      }
    } catch (err) {
      console.warn('[GptGate] Failed to add message listener:', err);
    }

    watchDynamicContent({
      root: isChatGPT ? document.documentElement : document.body,
      onChange: (mutations) => {
        if (isContextInvalidated()) {
          handleInvalidation();
          return;
        }
        if (isClaude) {
          if (!document.getElementById(PANEL_ID)) ensureFloatingPanel();
          else schedulePanelPlacementDebounced();
        }
        clearTimeout(mutationTimer);
        mutationTimer = setTimeout(() => {
          if (isContextInvalidated()) {
            handleInvalidation();
            return;
          }
          if (mutationIncludesMath(mutations)) {
            fixMathSpacing();
          }
          ensureFloatingPanel();
          updateFloatingPanelLayout();
          hideGeminiDisclaimer();
          if (isGemini) scheduleGeminiPlacement();
          if (isClaude) schedulePanelPlacementDebounced();
        }, 220);
      },
    });

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  function isExtensionOwnedNode(node) {
    if (!node) return false;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return false;
    return (
      el.id === PANEL_ID ||
      el.id === PANEL_STYLE_ID ||
      el.id === STYLE_ID ||
      el.id === FONT_STYLE_ID ||
      el.localName === 'gptgate-export-tools' ||
      !!el.closest?.(`#${PANEL_ID}`)
    );
  }

  function mutationIncludesMath(mutations = []) {
    const effectiveMathFix = currentState.mathFix || currentState.responseDir === 'rtl' || currentState.composerDir === 'rtl';
    if (!effectiveMathFix) return false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes || []) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.('.katex, .mjx-container, .MathJax_Display')) return true;
        if (node.querySelector?.('.katex, .mjx-container, .MathJax_Display')) return true;
      }
    }
    return false;
  }

  function watchDynamicContent({ root = document.body, onChange } = {}) {
    if (!root) return;
    if (__observer) __observer.disconnect();
    __observer = new MutationObserver((mutations) => {
      let shouldFire = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (isExtensionOwnedNode(node)) continue;
            shouldFire = true;
            break;
          }
          if (shouldFire) break;
        }
      }
      if (shouldFire && typeof onChange === 'function') onChange(mutations);
    });
    __observer.observe(root, { childList: true, subtree: true });
  }

  handleResize = () => {
    if (isContextInvalidated()) {
      handleInvalidation();
      return;
    }
    updateFloatingPanelLayout();
    if (isGemini) scheduleGeminiPlacement();
    if (isClaude) schedulePanelPlacementDebounced();
  };

  handleVisibilityChange = () => {
    if (isContextInvalidated()) {
      handleInvalidation();
      return;
    }
    if (!document.hidden) {
      updateFloatingPanelLayout();
      if (isClaude) updatePanelPlacement();
      applyState({}, 'visibility-change');
    }
  };

  // Kickoff core initialization
  startCore();
}
