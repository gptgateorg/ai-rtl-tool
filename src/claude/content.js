(async () => {
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
      const len = text.length;
      if (len < 2) return;
      const cached = dirCache.get(listEl);
      if (cached && cached.len === len) return;
      
      let dir = decideDir(text, 'response') || (cached ? cached.dir : null);
      if (dir === 'rtl') { clearDir(listEl); applyRTL(listEl); }
      else if (dir === 'ltr') { clearDir(listEl); applyLTR(listEl); }
      else clearDir(listEl);
      
      dirCache.set(listEl, { len, dir });
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
      const len = text.length;
      if (len < 2) return;
      
      const cached = dirCache.get(el);
      if (cached && cached.len === len) return;
      
      const dir = decideDir(text, 'response') || (cached ? cached.dir : null);
      if (dir === 'rtl') { clearDir(el); applyRTL(el); }
      else if (dir === 'ltr') { clearDir(el); applyLTR(el); }
      else clearDir(el);
      
      dirCache.set(el, { len, dir });
    }

    function walkAndFix(root) {
      if (!root || !root.tagName || SKIP_TAGS.has(root.tagName)) return;
      if (root.isContentEditable) return; 
      if (root.tagName === 'UL' || root.tagName === 'OL') { checkList(root); return; } 
      if (TEXT_TAGS.has(root.tagName) && isLeafBlock(root)) { checkAndApplyDir(root); return; }
      for (const child of root.children) walkAndFix(child);
    }

    function nearestTextBlock(node) {
      let el = node.parentElement;
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
      el.setAttribute('dir', dir);
      if (dir === 'rtl') {
         el.classList.remove('claude-arabic-ltr');
         el.classList.add('claude-arabic-rtl');
      } else {
         el.classList.remove('claude-arabic-rtl');
         el.classList.add('claude-arabic-ltr');
      }
    }

    function clearDirToAuto(el) {
      el.setAttribute('dir', 'auto');
      el.classList.remove('claude-arabic-rtl', 'claude-arabic-ltr');
    }

    function fixComposer(editor) {
      if (!editor) return;

      let mode = 'auto';
      if (document.body.classList.contains('gptgate-rtl-composer')) mode = 'rtl';
      else if (document.body.classList.contains('gptgate-ltr-composer')) mode = 'ltr';

      let text = editor.textContent || '';
      let dir = null;

      if (mode === 'rtl') dir = 'rtl';
      else if (mode === 'ltr') dir = 'ltr';
      else {
        dir = detectComposerDirection(text);
      }

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

      const ps = editor.querySelectorAll('p');
      const targets = ps.length ? Array.from(ps) : [editor];
      for (const el of targets) {
        if (dir === 'rtl') applyDirToEl(el, 'rtl');
        else if (dir === 'ltr') applyDirToEl(el, 'ltr');
        else clearDirToAuto(el);
      }
    }

    function fixComposers() {
      const editors = document.querySelectorAll('[contenteditable="true"]');
      editors.forEach((ed) => {
        if (!ed.dataset.rtlBound) {
          const handler = () => fixComposer(ed);
          ed.addEventListener('input', handler);
          ed.addEventListener('keyup', handler);
          ed.addEventListener('paste', () => setTimeout(handler, 0));
          ed.dataset.rtlBound = '1';
        }
        fixComposer(ed);
      });
    }

    // ── RAF and Observer ──
    const pendingBlocks = new Set();
    const pendingRoots  = new Set();
    let scheduled = false;
    const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb) => setTimeout(cb, 16);

    function scheduleFlush() {
      if (scheduled) return;
      scheduled = true;
      raf(flush);
    }

    function flush() {
      scheduled = false;
      for (const root of pendingRoots) { try { walkAndFix(root); } catch (e) {} }
      for (const el of pendingBlocks) { try { checkAndApplyDir(el); } catch (e) {} }
      pendingRoots.clear();
      pendingBlocks.clear();
      fixComposers();   
    }

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') {
          const block = nearestTextBlock(m.target);
          if (block) pendingBlocks.add(block);
          continue;
        }
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingRoots.add(node);
            const block = nearestTextBlock(node);
            if (block) pendingBlocks.add(block);
          } else {
            const block = nearestTextBlock(node);
            if (block) pendingBlocks.add(block);
          }
        }
      }
      scheduleFlush();
    });

    const classObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          scanAll();
          fixComposers();
          scheduleFlush();
        }
      });
    });

    // ── Inject CSS ──
    function injectStyles() {
      if (document.getElementById('claude-rtl-guide-style')) return;
      const style = document.createElement('style');
      style.id = 'claude-rtl-guide-style';
      const claudeSurfaceCSS = `
        /* Claude app surface color */
        html.gptgate-claude-dark-surface,
        html.gptgate-claude-dark-surface body,
        html.gptgate-claude-dark-surface [data-theme] {
          --bg-000: #020202 !important;
          --bg-100: #020202 !important;
          --bg-200: #020202 !important;
          --bg-300: #020202 !important;
          --background: #020202 !important;
          --surface: #020202 !important;
          --surface-primary: #020202 !important;
          --surface-secondary: #020202 !important;
        }

        html.gptgate-claude-dark-surface,
        html.gptgate-claude-dark-surface body {
          background: #020202 !important;
          background-color: #020202 !important;
        }

        html.gptgate-claude-dark-surface body > div,
        html.gptgate-claude-dark-surface main,
        html.gptgate-claude-dark-surface aside,
        html.gptgate-claude-dark-surface nav,
        html.gptgate-claude-dark-surface [role="main"],
        html.gptgate-claude-dark-surface [class*="min-h-screen"],
        html.gptgate-claude-dark-surface [class*="bg-bg-"],
        html.gptgate-claude-dark-surface [class*="bg-surface"],
        html.gptgate-claude-dark-surface [class*="bg-\\[var\\(--bg"],
        html.gptgate-claude-dark-surface [style*="background"] {
          background: #020202 !important;
          background-color: #020202 !important;
        }
      `;
      style.textContent = `
        ${claudeSurfaceCSS}

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

      setInterval(() => { fixComposers(); }, 1500);
    }

    start();
    console.log('[GptGate] Claude specific logic from claude-guide loaded.');

  } catch (err) {
    console.error('[GptGate] Failed to load core module for Claude', err);
  }
})();
