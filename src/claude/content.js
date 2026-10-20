(async () => {
  if (window.__gptgate_claude_engine_loaded) return;
  window.__gptgate_claude_engine_loaded = true;
  try {
    const selectors = await import(chrome.runtime.getURL('src/claude/selectors.js'));
    const { SELECTORS, SIDEBAR_SELECTORS, PANEL_RIGHT, disableDirectionCSS } = selectors;
    const core = await import(chrome.runtime.getURL('src/shared/core.js'));
    const { detectComposerDirection } = await import(chrome.runtime.getURL('src/shared/constants.js'));
    core.initExtension({ SELECTORS, SIDEBAR_SELECTORS, PANEL_RIGHT, disableDirectionCSS });

    /* ── Claude RTL Engine (Based strictly on claude-guide) ── */

    const ARABIC_GLOBAL = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const ARABIC_STRONG = /[\u0620-\u064A\u066E-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

    let dirCache = new WeakMap();

    function arabicRatio(text) {
      if (!text) return 0;
      const sample = text.length > 1000 ? text.slice(0, 1000) : text;
      const nonSpace = sample.replace(/\s+/g, '');
      if (nonSpace.length < 2) return 0;
      const m = nonSpace.match(ARABIC_GLOBAL);
      return (m ? m.length : 0) / nonSpace.length;
    }

    function firstStrongDir(text) {
      const n = Math.min(text.length, 200);
      for (let i = 0; i < n; i++) {
        const c = text[i];
        if (ARABIC_STRONG.test(c)) return 'rtl';
        if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) return 'ltr';
      }
      return null;
    }

    // Determine target direction based on extension state & text
    function decideDir(text, type) {
      let mode = 'auto';
      if (document.body.classList.contains(`gptgate-rtl-${type}`)) mode = 'rtl';
      else if (document.body.classList.contains(`gptgate-ltr-${type}`)) mode = 'ltr';

      if (mode === 'rtl') return 'rtl';
      if (mode === 'ltr') return 'ltr';

      // Auto mode logic
      if (type === 'composer') {
        return detectComposerDirection(text);
      }
      
      const ratio = arabicRatio(text);
      if (ratio >= 0.25) return 'rtl';
      const fs = firstStrongDir(text);
      if (fs === 'rtl' && ratio >= 0.02) return 'rtl';
      if (fs === 'ltr') return 'ltr';
      if (ratio < 0.05) return 'ltr';
      return null;
    }

    const TEXT_TAGS  = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH', 'FIGCAPTION']);
    const SKIP_TAGS  = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'MATH', 'SVG', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTION', 'IFRAME', 'NAV', 'HEADER', 'FOOTER']);
    const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH', 'SECTION', 'ARTICLE']);

    function isLeafBlock(el) {
      for (const child of el.children) {
        if (BLOCK_TAGS.has(child.tagName)) return false;
      }
      return true;
    }

    function applyRTL(el) {
      if (el.classList.contains('claude-arabic-rtl')) return;
      el.setAttribute('dir', 'rtl');
      el.classList.add('claude-arabic-rtl');
    }

    function applyLTR(el) {
      if (el.classList.contains('claude-arabic-ltr')) return;
      el.setAttribute('dir', 'ltr');
      el.classList.add('claude-arabic-ltr');
    }

    function clearDir(el) {
      if (el.classList.contains('claude-arabic-rtl')) {
        el.removeAttribute('dir');
        el.classList.remove('claude-arabic-rtl');
      }
      if (el.classList.contains('claude-arabic-ltr')) {
        el.removeAttribute('dir');
        el.classList.remove('claude-arabic-ltr');
      }
    }

    function checkList(listEl) {
      const text = listEl.textContent || '';
      const sample = text.slice(0, 1000);
      const cached = dirCache.get(listEl);
      if (cached && cached.sample === sample) return;
      
      let dir = decideDir(sample, 'response');
      if (dir === 'rtl') { clearDir(listEl); applyRTL(listEl); }
      else if (dir === 'ltr') { clearDir(listEl); applyLTR(listEl); }
      else clearDir(listEl);
      
      dirCache.set(listEl, { sample, dir });
    }

    function checkAndApplyDir(el) {
      if (!el || !el.tagName) return;
      if (el.isContentEditable) return;

      if (el.tagName === 'LI') {
        const list = el.closest('ul, ol');
        if (list) { checkList(list); return; }
      }

      if (!TEXT_TAGS.has(el.tagName) || !isLeafBlock(el)) return;
      const text = el.textContent || '';
      const sample = text.slice(0, 1000);
      
      const cached = dirCache.get(el);
      if (cached && cached.sample === sample) return;
      
      const dir = decideDir(sample, 'response');
      if (dir === 'rtl') { clearDir(el); applyRTL(el); }
      else if (dir === 'ltr') { clearDir(el); applyLTR(el); }
      else clearDir(el);
      
      dirCache.set(el, { sample, dir });
    }

    function walkAndFix(root) {
      if (!root || !root.tagName || SKIP_TAGS.has(root.tagName)) return;
      if (root.isContentEditable) return; 
      if (root.tagName === 'UL' || root.tagName === 'OL') { checkList(root); return; } 
      if (TEXT_TAGS.has(root.tagName) && isLeafBlock(root)) { checkAndApplyDir(root); return; }
      for (const child of root.children) walkAndFix(child);
    }

    function nearestTextBlock(node) {
      let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      while (el && el !== document.body) {
        if (el.tagName === 'LI' || TEXT_TAGS.has(el.tagName)) return el;
        el = el.parentElement;
      }
      return null;
    }

    function scanAll() {
      dirCache = new WeakMap(); 
      try { walkAndFix(document.body); } catch (e) {}
    }

    // ── Composer ──
    function applyDirToEl(el, dir) {
      if (el.getAttribute('dir') !== dir) el.setAttribute('dir', dir);
      const next = dir === 'rtl' ? 'claude-arabic-rtl' : 'claude-arabic-ltr';
      const old = dir === 'rtl' ? 'claude-arabic-ltr' : 'claude-arabic-rtl';
      if (el.classList.contains(old)) el.classList.remove(old);
      if (!el.classList.contains(next)) el.classList.add(next);
    }

    function fixComposer(editor) {
      if (!editor) return;

      let mode = 'auto';
      if (document.body.classList.contains('gptgate-rtl-composer')) mode = 'rtl';
      else if (document.body.classList.contains('gptgate-ltr-composer')) mode = 'ltr';

      const text = editor.tagName === 'TEXTAREA' ? editor.value : editor.textContent || '';
      let dir = null;

      if (mode === 'rtl') dir = 'rtl';
      else if (mode === 'ltr') dir = 'ltr';
      else {
        dir = detectComposerDirection(text);
      }

      if (dir === 'rtl') {
        applyDirToEl(editor, 'rtl');
        if (editor.style.getPropertyValue('direction') !== 'rtl') editor.style.setProperty('direction', 'rtl', 'important');
        if (editor.style.getPropertyValue('text-align') !== 'right') editor.style.setProperty('text-align', 'right', 'important');
      } else if (dir === 'ltr') {
        applyDirToEl(editor, 'ltr');
        if (editor.style.getPropertyValue('direction') !== 'ltr') editor.style.setProperty('direction', 'ltr', 'important');
        if (editor.style.getPropertyValue('text-align') !== 'left') editor.style.setProperty('text-align', 'left', 'important');
      } else {
        clearDir(editor);
        editor.style.removeProperty('direction');
        editor.style.removeProperty('text-align');
      }

      // ProseMirror owns its paragraph attributes. Rewriting them causes it to
      // remount the paragraph, feeding our observer again. Style the root only;
      // scoped CSS applies its direction to current and replacement paragraphs.
    }

    const composerSelector = '[contenteditable="true"], textarea:not([name="g-recaptcha-response"])';
    const editors = new Set();
    const boundEditors = new WeakSet();
    const pendingEditors = new Set();
    function fixComposers(root = document) {
      const candidates = [...(root.matches?.(composerSelector) ? [root] : []), ...root.querySelectorAll(composerSelector)];
      for (const ed of candidates) {
        editors.add(ed);
        if (!boundEditors.has(ed)) {
          boundEditors.add(ed);
          ed.addEventListener('input', () => fixComposer(ed));
          ed.addEventListener('compositionend', () => fixComposer(ed));
        }
        fixComposer(ed);
      }
    }

    // Batch only changed blocks/editors; no recurring document scans.
    const pendingBlocks = new Set();
    const pendingRoots = new Set();
    let scheduled = false;
    let responseMode = '';
    let composerMode = '';
    let rescanResponses = false;
    let refreshEditors = false;
    function scheduleFlush() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(flush);
    }
    function flush() {
      scheduled = false;
      if (rescanResponses) scanAll();
      for (const root of pendingRoots) {
        if (!root.isConnected) continue;
        if (!rescanResponses) walkAndFix(root);
        fixComposers(root);
      }
      if (!rescanResponses) for (const el of pendingBlocks) if (el.isConnected) checkAndApplyDir(el);
      if (refreshEditors) for (const ed of editors) pendingEditors.add(ed);
      for (const ed of pendingEditors) {
        if (ed.isConnected) fixComposer(ed);
        else editors.delete(ed);
      }
      rescanResponses = refreshEditors = false;
      pendingRoots.clear(); pendingBlocks.clear(); pendingEditors.clear();
    }
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.removedNodes.length)) for (const ed of editors) if (!ed.isConnected) editors.delete(ed);
      for (const m of mutations) {
        const target = m.target.nodeType === Node.ELEMENT_NODE ? m.target : m.target.parentElement;
        const editor = target?.closest(composerSelector);
        if (editor) { pendingEditors.add(editor); continue; }
        const block = nearestTextBlock(m.target);
        if (block) pendingBlocks.add(block);
        for (const node of m.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node);
      }
      if (pendingRoots.size || pendingBlocks.size || pendingEditors.size) scheduleFlush();
    });
    const classObserver = new MutationObserver(() => {
      const response = document.body.classList.contains('gptgate-rtl-response') ? 'rtl' : document.body.classList.contains('gptgate-ltr-response') ? 'ltr' : 'auto';
      const composer = document.body.classList.contains('gptgate-rtl-composer') ? 'rtl' : document.body.classList.contains('gptgate-ltr-composer') ? 'ltr' : 'auto';
      if (response !== responseMode) { responseMode = response; rescanResponses = true; }
      if (composer !== composerMode) { composerMode = composer; refreshEditors = true; }
      if (rescanResponses || refreshEditors) scheduleFlush();
    });

    // ── Inject CSS ──
    function injectStyles() {
      if (document.getElementById('claude-rtl-guide-style')) return;
      const style = document.createElement('style');
      style.id = 'claude-rtl-guide-style';
      const claudeSurfaceCSS = `
        /* Change only the dark page canvas. Native composer, buttons and
           popovers keep their own surface tokens and geometry. */
        html.gptgate-claude-dark-surface:is([data-mode="dark"], .dark):not([data-mode="light"]) {
          --cds-surface-1: #020202 !important;
          --cds-page-bg: #020202 !important;
          --background-color-page: #020202 !important;
          --bg-100: 0 0% 0.7843% !important;
        }
      `;
      style.textContent = `
        ${claudeSurfaceCSS}

        /* Claude replaces paragraph attributes during editing. Keep each new
           paragraph aligned with the explicit composer direction. */
        body.gptgate-platform-claude [contenteditable="true"].claude-arabic-rtl p {
          direction: rtl !important; text-align: right !important;
        }
        body.gptgate-platform-claude [contenteditable="true"].claude-arabic-ltr p {
          direction: ltr !important; text-align: left !important;
        }
        /* Claude Arabic RTL Fix - Stylesheet v1.3 (Imported) */
        .claude-arabic-rtl {
          direction: rtl !important;
          text-align: right !important;
          unicode-bidi: embed;
          letter-spacing: 0 !important;
        }
        .claude-arabic-rtl li,
        .claude-arabic-rtl ul,
        .claude-arabic-rtl ol {
          direction: rtl !important;
          text-align: right !important;
        }
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
        [contenteditable="true"] p[dir="rtl"],
        [contenteditable="true"][dir="rtl"] {
          direction: rtl !important;
          text-align: right !important;
        }
        [contenteditable="true"] p[dir="ltr"],
        [contenteditable="true"][dir="ltr"] {
          direction: ltr !important;
          text-align: left !important;
        }
        [contenteditable="true"] code,
        [contenteditable="true"] pre {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: isolate;
        }

        /* LTR Enforcements */
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

      try {
        chrome.runtime.sendMessage({ type: 'gptgate:inject-css', css: claudeSurfaceCSS }, () => {
          void chrome.runtime.lastError;
        });
      } catch (_) {}
    }

    function start() {
      if (!document.body) { setTimeout(start, 100); return; }
      injectStyles();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

      const run = () => { scanAll(); fixComposers(); };
      (typeof requestIdleCallback !== 'undefined')
        ? requestIdleCallback(run, { timeout: 1000 })
        : setTimeout(run, 400);

    }

    start();
    console.log('[GptGate] Claude specific logic from claude-guide loaded.');

  } catch (err) {
    console.error('[GptGate] Failed to load core module for Claude', err);
  }
})();
