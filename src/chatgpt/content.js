(async () => {
  try {
    if (window.__gptgate_chatgpt_engine) return;
    const { syncExportUI, EXPORT_HEADER_SELECTOR } = await import(chrome.runtime.getURL('src/chatgpt/pdf-export.js'));
    const { MESSAGE_SELECTOR } = await import(chrome.runtime.getURL('src/shared/export-content.js'));
    const selectors = await import(chrome.runtime.getURL('src/chatgpt/selectors.js'));
    const { SELECTORS, SIDEBAR_SELECTORS, SIDEBAR_TITLE_SELECTOR, HOME_SUGGESTION_TEXT_SELECTOR, PANEL_RIGHT, disableDirectionCSS } = selectors;
    const core = await import(chrome.runtime.getURL('src/shared/core.js'));
    const { detectComposerDirection, detectTextDirection } = await import(chrome.runtime.getURL('src/shared/constants.js'));
    core.initExtension({ SELECTORS, SIDEBAR_SELECTORS, PANEL_RIGHT, disableDirectionCSS });

    window.__gptgate_chatgpt_engine = true;

    /* ── ChatGPT RTL Engine ── */

    // Persian/Arabic letter regex (strong RTL characters)
    const RTL_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    // English letter regex (strong LTR characters)
    const LTR_CHAR = /[A-Za-z]/;

    /**
     * Detect direction from the FIRST strong character in the text.
     * Returns 'rtl' if first letter is Persian/Arabic,
     * 'ltr' if first letter is English,
     * null if no strong character found.
     */
    function firstCharDir(text) {
      if (!text) return null;
      const len = Math.min(text.length, 500);
      for (let i = 0; i < len; i++) {
        const ch = text[i];
        if (RTL_CHAR.test(ch)) return 'rtl';
        if (LTR_CHAR.test(ch)) return 'ltr';
      }
      return null;
    }

    /**
     * Decide direction for a text block based on mode + text analysis.
     * @param {string} text - The text content
     * @param {'response'|'composer'} type - Which section
     */
    function decideDir(text, type) {
      // Check what mode the user has selected via popup
      let mode = 'auto';
      if (document.body.classList.contains(`gptgate-rtl-${type}`)) mode = 'rtl';
      else if (document.body.classList.contains(`gptgate-ltr-${type}`)) mode = 'ltr';

      // Forced modes bypass text detection
      if (mode === 'rtl') return 'rtl';
      if (mode === 'ltr') return 'ltr';

      // Auto mode: first strong character decides
      return firstCharDir(text);
    }

    // ── Tags to process and skip ──
    const TEXT_TAGS = new Set([
      'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
      'BLOCKQUOTE', 'TD', 'TH', 'FIGCAPTION', 'SUMMARY', 'DT', 'DD'
    ]);
    const SKIP_TAGS = new Set([
      'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'CODE', 'PRE', 'KBD',
      'SAMP', 'VAR', 'MATH', 'SVG', 'BUTTON', 'INPUT', 'SELECT',
      'OPTION', 'IFRAME', 'NAV', 'HEADER', 'FOOTER', 'CANVAS', 'VIDEO', 'AUDIO'
    ]);

    // ── Direction application helpers ──
    function setDir(el, dir) {
      el.setAttribute('dir', dir);
      if (dir === 'rtl') {
        el.classList.remove('claude-arabic-ltr');
        el.classList.add('claude-arabic-rtl');
      } else {
        el.classList.remove('claude-arabic-rtl');
        el.classList.add('claude-arabic-ltr');
      }
    }

    function clearDir(el) {
      el.removeAttribute('dir');
      el.classList.remove('claude-arabic-rtl', 'claude-arabic-ltr');
    }

    // ── Process a single text element ──
    let dirCache = new WeakMap();

    function processElement(el) {
      if (!el || !el.tagName || el.isContentEditable) return;
      if (SKIP_TAGS.has(el.tagName)) return;

      const text = (el.textContent || '').trim();
      if (text.length < 1) return;

      // Check cache to avoid redundant work
      const cached = dirCache.get(el);
      if (cached && cached.text === text) return;

      const dir = decideDir(text, 'response');
      if (dir === 'rtl') {
        setDir(el, 'rtl');
      } else if (dir === 'ltr') {
        setDir(el, 'ltr');
      } else {
        clearDir(el);
      }
      dirCache.set(el, { text, dir });
    }

    // ── Process a list (UL/OL) as a whole ──
    function processList(listEl) {
      const text = (listEl.textContent || '').trim();
      if (text.length < 1) return;

      const cached = dirCache.get(listEl);
      if (cached && cached.text === text) return;

      const dir = decideDir(text, 'response');
      if (dir === 'rtl') {
        setDir(listEl, 'rtl');
      } else if (dir === 'ltr') {
        setDir(listEl, 'ltr');
      } else {
        clearDir(listEl);
      }
      dirCache.set(listEl, { text, dir });
    }

    // ── Walk a DOM tree and apply direction ──
    function walkAndFix(root) {
      if (!root || !root.querySelectorAll) return;

      if (root.matches('[data-user-message-bubble]')) processElement(root);

      // Process all text-level elements inside the root
      const textEls = root.querySelectorAll(
        'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption, summary, dt, dd'
      );

      for (const el of textEls) {
        // Skip elements inside code/pre blocks
        if (el.closest('pre, code, .code-block, [class*="code"]')) continue;
        // Skip editable elements
        if (el.isContentEditable) continue;
        processElement(el);
      }

      // Process lists as a whole
      const lists = root.querySelectorAll('ul, ol');
      for (const list of lists) {
        if (list.closest('pre, code')) continue;
        if (list.isContentEditable) continue;
        processList(list);
      }
    }

    // ── Find ChatGPT response containers and process them ──
    const RESPONSE_SELECTOR = `.markdown, .prose, ${MESSAGE_SELECTOR}`;
    function scanResponses() {
      for (const container of document.querySelectorAll(RESPONSE_SELECTOR)) {
        if (!container.parentElement?.closest(RESPONSE_SELECTOR)) walkAndFix(container);
      }
    }

    function scanAll() {
      dirCache = new WeakMap();
      scanResponses();
    }

    // ── Composer handling ──
    const CODE_BLOCK_STYLE_ID = 'gptgate-chatgpt-code-block-style';

    function injectCodeBlockStyles() {
      if (document.getElementById(CODE_BLOCK_STYLE_ID)) return;

      const style = document.createElement('style');
      style.id = CODE_BLOCK_STYLE_ID;
      style.textContent = `
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block,
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block .cm-scroller,
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block .cm-content,
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block .cm-line,
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block pre,
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block code,
        body.gptgate-platform-chatgpt .gptgate-rtl-code-block span {
          direction: rtl !important;
          text-align: right !important;
          unicode-bidi: plaintext !important;
        }
      `;
      document.documentElement.appendChild(style);
    }

    function getResponseMode() {
      if (document.body.classList.contains('gptgate-rtl-response')) return 'rtl';
      if (document.body.classList.contains('gptgate-ltr-response')) return 'ltr';
      return 'auto';
    }

    function getCodeBlockContainer(el) {
      return el.closest('#code-block-viewer, .cm-editor, pre') || el;
    }

    function shouldUseRtlForCodeBlock(text) {
      const sample = (text || '').trim();
      if (!sample) return false;

      const mode = getResponseMode();
      if (mode === 'ltr') return false;

      return detectTextDirection(sample, 'ltr') === 'rtl';
    }

    function applyCodeBlockDirection(block) {
      if (!block || !document.body.contains(block)) return;

      const useRtl = shouldUseRtlForCodeBlock(block.textContent || '');

      block.classList.toggle('gptgate-rtl-code-block', useRtl);
      block.dataset.gptgateCodeDir = useRtl ? 'rtl' : 'ltr';
      block.setAttribute('dir', useRtl ? 'rtl' : 'ltr');
    }

    function fixCodeBlocks(root = document) {
      injectCodeBlockStyles();

      const blocks = new Set();
      if (root.matches?.('#code-block-viewer, .cm-editor, pre')) blocks.add(getCodeBlockContainer(root));
      root.querySelectorAll('#code-block-viewer, .cm-editor, pre.cm-content, pre code, .markdown pre').forEach((el) => {
        blocks.add(getCodeBlockContainer(el));
      });

      blocks.forEach(applyCodeBlockDirection);
    }

    function fixComposer(editor) {
      if (!editor) return;

      let mode = 'auto';
      if (document.body.classList.contains('gptgate-rtl-composer')) mode = 'rtl';
      else if (document.body.classList.contains('gptgate-ltr-composer')) mode = 'ltr';

      // Get text from the composer
      let text = '';
      if (editor.tagName === 'TEXTAREA') {
        text = editor.value || '';
      } else {
        text = editor.textContent || '';
      }

      // For forced modes, always apply regardless of text
      if (mode === 'rtl') {
        editor.setAttribute('dir', 'rtl');
        editor.style.textAlign = 'right';
        return;
      }
      if (mode === 'ltr') {
        editor.setAttribute('dir', 'ltr');
        editor.style.textAlign = 'left';
        return;
      }

      // Auto mode
      const trimmed = text.replace(/\s+/g, '');
      if (trimmed.length < 1) {
        // Empty → use browser default
        editor.setAttribute('dir', 'auto');
        editor.style.textAlign = '';
        return;
      }

      const dir = detectComposerDirection(text);
      if (dir === 'rtl') {
        editor.setAttribute('dir', 'rtl');
        editor.style.setProperty('text-align', 'right', 'important');
      } else if (dir === 'ltr') {
        editor.setAttribute('dir', 'ltr');
        editor.style.setProperty('text-align', 'left', 'important');
      } else {
        editor.removeAttribute('dir');
        editor.style.removeProperty('text-align');
      }

      // Also handle inner paragraphs for ProseMirror editors
      if (editor.tagName !== 'TEXTAREA') {
        const innerBlocks = editor.querySelectorAll('p, div');
        for (const block of innerBlocks) {
          const blockText = block.textContent || '';
          if (blockText.replace(/\s+/g, '').length < 1) continue;
          const blockDir = firstCharDir(blockText);
          if (mode === 'rtl') {
            block.setAttribute('dir', 'rtl');
          } else if (mode === 'ltr') {
            block.setAttribute('dir', 'ltr');
          } else if (blockDir === 'rtl') {
            block.setAttribute('dir', 'rtl');
          } else if (blockDir === 'ltr') {
            block.setAttribute('dir', 'ltr');
          } else {
            block.setAttribute('dir', 'auto');
          }
        }
      }
    }

    function findAndFixComposers() {
      // ChatGPT specific composer selectors
      const editors = document.querySelectorAll(
        'textarea#prompt-textarea, textarea[name="prompt-textarea"], .ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"], div#prompt-textarea[contenteditable="true"]'
      );

      editors.forEach((ed) => {
        if (!ed.dataset.rtlBound) {
          const handler = () => fixComposer(ed);
          ed.addEventListener('input', handler);
          ed.addEventListener('keyup', handler);
          ed.addEventListener('paste', () => setTimeout(handler, 50));
          ed.dataset.rtlBound = '1';
        }
        fixComposer(ed);
      });

      // Also try generic contenteditable and textarea as fallback
      const fallback = document.querySelectorAll('[contenteditable="true"], textarea');
      fallback.forEach((ed) => {
        if (!ed.dataset.rtlBound) {
          const handler = () => fixComposer(ed);
          ed.addEventListener('input', handler);
          ed.addEventListener('keyup', handler);
          ed.addEventListener('paste', () => setTimeout(handler, 50));
          ed.dataset.rtlBound = '1';
        }
        fixComposer(ed);
      });
    }

    // ── MutationObserver for dynamic content ──
    let flushScheduled = false;
    let exportSyncNeeded = false;
    let composersNeeded = false;
    const dirtyResponses = new Set();
    const dirtyCode = new Set();
    const COMPOSER_SELECTOR = '[contenteditable="true"], textarea';
    const raf = window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (cb) => setTimeout(cb, 16);

    function queueContent(node, discover = false) {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el || !document.body?.contains(el) || el.closest('gptgate-export-tools, #gptgate-floating-panel')) return;
      // A streamed token only dirties its message, never the previous conversation.
      const response = el.closest(MESSAGE_SELECTOR) || el.closest(RESPONSE_SELECTOR);
      if (response) dirtyResponses.add(response);
      else if (discover) for (const root of el.querySelectorAll(RESPONSE_SELECTOR)) {
        if (!root.parentElement?.closest(RESPONSE_SELECTOR)) dirtyResponses.add(root);
      }
      if (el.closest(COMPOSER_SELECTOR) || (discover && el.querySelector(COMPOSER_SELECTOR))) composersNeeded = true;
      const code = el.closest('#code-block-viewer, .cm-editor, pre');
      if (code) dirtyCode.add(code);
      else if (discover && !response && el.querySelector('#code-block-viewer, .cm-editor, pre')) dirtyCode.add(el);
    }

    function scheduleFlush() {
      if (flushScheduled) return;
      flushScheduled = true;
      raf(() => {
        flushScheduled = false;
        if (exportSyncNeeded) { exportSyncNeeded = false; syncExportUI(); }
        for (const root of dirtyResponses) {
          if (!root.isConnected) continue;
          walkAndFix(root);
          fixCodeBlocks(root);
        }
        dirtyResponses.clear();
        for (const root of dirtyCode) if (root.isConnected) fixCodeBlocks(root);
        dirtyCode.clear();
        if (composersNeeded) { composersNeeded = false; findAndFixComposers(); }
      });
    }

    const contentObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.target.nodeType === Node.ELEMENT_NODE && m.target.closest('gptgate-export-tools, #gptgate-floating-panel')) continue;
        if (m.type === 'attributes') {
          exportSyncNeeded = true;
          queueContent(m.target, true);
        } else if (m.type === 'characterData') {
          queueContent(m.target);
        } else {
          if ([...m.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE &&
            (node.localName === 'gptgate-export-tools' || node.querySelector('gptgate-export-tools')))) exportSyncNeeded = true;
          const changed = [...m.addedNodes, ...m.removedNodes].filter(node =>
            node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.localName !== 'gptgate-export-tools'));
          if (!changed.length) continue;
          queueContent(m.target);
          for (const node of m.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) queueContent(node, true);
          // Only changes to message structure need to rediscover PDF controls.
          if (changed.some(node => node.nodeType === Node.ELEMENT_NODE &&
            (node.matches(`${MESSAGE_SELECTOR}, main, ${EXPORT_HEADER_SELECTOR}`) || node.querySelector(`${MESSAGE_SELECTOR}, ${EXPORT_HEADER_SELECTOR}`)))) exportSyncNeeded = true;
        }
      }
      if (dirtyResponses.size || dirtyCode.size || composersNeeded || exportSyncNeeded) scheduleFlush();
    });

    // Watch for body class changes (when user changes mode via popup)
    const classObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          scanAll();
          findAndFixComposers();
          fixCodeBlocks();
          break;
        }
      }
    });

    // ── Inject CSS styles ──
    function injectStyles() {
      if (document.getElementById('chatgpt-rtl-engine-style')) return;
      const style = document.createElement('style');
      style.id = 'chatgpt-rtl-engine-style';
      style.textContent = `
        /* Align title text only; preserve the sidebar, row controls and native marquee. */
        ${SIDEBAR_TITLE_SELECTOR}{flex:1;min-width:0;text-align:right}
        ${SIDEBAR_TITLE_SELECTOR} > span{display:flex;justify-content:safe flex-end}
        ${SIDEBAR_TITLE_SELECTOR} > span > span{flex-shrink:0}
        ${SIDEBAR_TITLE_SELECTOR} [data-marquee-content]{unicode-bidi:plaintext}
        /* Native bdi wrappers hide an English prefix from dir=auto's first-strong detection. */
        ${SIDEBAR_TITLE_SELECTOR} [data-marquee-content] :is([dir="auto"],bdi){unicode-bidi:normal;direction:inherit}
        /* Home reminders can be button text or rich text over a separate native button. */
        ${HOME_SUGGESTION_TEXT_SELECTOR}{text-align:right;unicode-bidi:plaintext}
        /* ChatGPT RTL Engine Styles */
        .claude-arabic-rtl {
          direction: rtl !important;
          text-align: right !important;
          unicode-bidi: embed;
        }
        .claude-arabic-rtl li,
        .claude-arabic-rtl ul,
        .claude-arabic-rtl ol {
          direction: rtl !important;
          text-align: right !important;
        }
        /* Keep code blocks LTR */
        .claude-arabic-rtl code,
        .claude-arabic-rtl pre,
        [dir="rtl"] code,
        [dir="rtl"] pre {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: isolate;
        }
        [dir="rtl"].claude-arabic-rtl {
          direction: rtl !important;
          text-align: right !important;
        }
        /* Composer RTL/LTR */
        textarea[dir="rtl"],
        [contenteditable="true"][dir="rtl"] {
          direction: rtl !important;
          text-align: right !important;
        }
        textarea[dir="ltr"],
        [contenteditable="true"][dir="ltr"] {
          direction: ltr !important;
          text-align: left !important;
        }
        [contenteditable="true"] p[dir="rtl"],
        [contenteditable="true"] div[dir="rtl"] {
          direction: rtl !important;
          text-align: right !important;
        }
        [contenteditable="true"] p[dir="ltr"],
        [contenteditable="true"] div[dir="ltr"] {
          direction: ltr !important;
          text-align: left !important;
        }
        /* Keep code in editables LTR */
        [contenteditable="true"] code,
        [contenteditable="true"] pre {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: isolate;
        }
        /* LTR enforcements */
        .claude-arabic-ltr {
          direction: ltr !important;
          text-align: left !important;
        }
        .claude-arabic-ltr li,
        .claude-arabic-ltr ul,
        .claude-arabic-ltr ol {
          direction: ltr !important;
          text-align: left !important;
        }
      `;
      document.head.appendChild(style);
    }

    // ── Start ──
    function start() {
      if (!document.body) {
        setTimeout(start, 100);
        return;
      }

      injectStyles();

      // Observe the whole body for content changes
      contentObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-message-author-role','data-markdown-text-style','data-user-message-bubble','hidden','aria-hidden','inert']
      });

      // Observe body class changes (popup mode switching)
      classObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });

      // Rebind only when hydration replaces body, not on streamed text updates.
      let observedBody = document.body;
      const bodyObserver = new MutationObserver(() => {
        if (document.body === observedBody || !document.body) return;
        observedBody = document.body;
        classObserver.disconnect();
        classObserver.observe(observedBody, {attributes:true, attributeFilter:['class']});
        run();
      });
      bodyObserver.observe(document.documentElement, {childList:true});

      // Initial scan
      const run = () => {
        syncExportUI();
        scanAll();
        findAndFixComposers();
        fixCodeBlocks();
      };

      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 1000 });
      } else {
        setTimeout(run, 400);
      }

      // Also scan when navigating between conversations
      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          setTimeout(() => {
            syncExportUI();
            scanAll();
            findAndFixComposers();
            fixCodeBlocks();
          }, 500);
        }
      }, 1000);
    }

    start();
    console.log('[GptGate] ChatGPT RTL Engine loaded.');

  } catch (err) {
    console.error('[GptGate] Failed to load core module for ChatGPT', err);
  }
})();
