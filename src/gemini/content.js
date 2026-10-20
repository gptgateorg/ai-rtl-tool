(async () => {
  if (window.__gptgate_gemini_engine_loaded) return;
  window.__gptgate_gemini_engine_loaded = true;
  try {
    const { SELECTORS, SIDEBAR_SELECTORS, PANEL_RIGHT } = await import(chrome.runtime.getURL('src/gemini/selectors.js'));
    const core = await import(chrome.runtime.getURL('src/shared/core.js'));
    const { detectComposerDirection, detectTextDirection } = await import(chrome.runtime.getURL('src/shared/constants.js'));
    
    core.initExtension({ SELECTORS, SIDEBAR_SELECTORS, PANEL_RIGHT });

    // ── Gemini Composer RTL Engine ──
    const CODE_BLOCK_STYLE_ID = 'gptgate-gemini-code-block-style';

    function injectCodeBlockStyles() {
      if (document.getElementById(CODE_BLOCK_STYLE_ID)) return;

      const style = document.createElement('style');
      style.id = CODE_BLOCK_STYLE_ID;
      style.textContent = `
        body.gptgate-platform-gemini.gptgate-rtl-composer [contenteditable="true"] p,
        body.gptgate-platform-gemini.gptgate-rtl-composer [contenteditable="true"] div {
          direction: rtl !important; text-align: right !important;
        }
        body.gptgate-platform-gemini.gptgate-ltr-composer [contenteditable="true"] p,
        body.gptgate-platform-gemini.gptgate-ltr-composer [contenteditable="true"] div {
          direction: ltr !important; text-align: left !important;
        }
        /* Let each auto paragraph resolve its first strong character without
           touching attributes owned by the native editor. */
        body.gptgate-platform-gemini:not(.gptgate-rtl-composer):not(.gptgate-ltr-composer) [contenteditable="true"] p,
        body.gptgate-platform-gemini:not(.gptgate-rtl-composer):not(.gptgate-ltr-composer) [contenteditable="true"] div {
          direction: inherit !important; unicode-bidi: plaintext !important; text-align: start !important;
        }
        body.gptgate-platform-gemini .gptgate-gemini-rtl {
          direction: rtl !important;
          text-align: right !important;
          unicode-bidi: plaintext !important;
        }
        body.gptgate-platform-gemini .gptgate-gemini-ltr {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: plaintext !important;
        }
        body.gptgate-platform-gemini .gptgate-gemini-rtl li,
        body.gptgate-platform-gemini .gptgate-gemini-rtl ul,
        body.gptgate-platform-gemini .gptgate-gemini-rtl ol {
          direction: rtl !important;
          text-align: right !important;
        }
        body.gptgate-platform-gemini .gptgate-gemini-ltr li,
        body.gptgate-platform-gemini .gptgate-gemini-ltr ul,
        body.gptgate-platform-gemini .gptgate-gemini-ltr ol {
          direction: ltr !important;
          text-align: left !important;
        }
        body.gptgate-platform-gemini .gptgate-rtl-code-block,
        body.gptgate-platform-gemini .gptgate-rtl-code-block .cm-scroller,
        body.gptgate-platform-gemini .gptgate-rtl-code-block .cm-content,
        body.gptgate-platform-gemini .gptgate-rtl-code-block .cm-line,
        body.gptgate-platform-gemini .gptgate-rtl-code-block pre,
        body.gptgate-platform-gemini .gptgate-rtl-code-block code,
        body.gptgate-platform-gemini .gptgate-rtl-code-block span {
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

    function getComposerMode() {
      if (document.body.classList.contains('gptgate-rtl-composer')) return 'rtl';
      if (document.body.classList.contains('gptgate-ltr-composer')) return 'ltr';
      return 'auto';
    }

    function resolveDir(text, mode, defaultDir = null) {
      if (mode === 'rtl') return 'rtl';
      if (mode === 'ltr') return 'ltr';

      const sample = (text || '').trim();
      if (!sample) return defaultDir;
      return detectTextDirection(sample, defaultDir || 'ltr');
    }

    function applyDirection(el, dir) {
      if (!el) return;
      const attr = dir || 'auto';
      if (el.getAttribute('dir') !== attr) el.setAttribute('dir', attr);
      for (const value of ['rtl', 'ltr']) {
        const name = `gptgate-gemini-${value}`;
        if (el.classList.contains(name) !== (dir === value)) el.classList.toggle(name, dir === value);
      }
      for (const [name, value] of [['direction', dir], ['text-align', dir === 'rtl' ? 'right' : dir === 'ltr' ? 'left' : null]]) {
        if (value) {
          if (el.style.getPropertyValue(name) !== value || el.style.getPropertyPriority(name) !== 'important') el.style.setProperty(name, value, 'important');
        } else if (el.style.getPropertyValue(name)) el.style.removeProperty(name);
      }
    }

    function within(root, selector) {
      return [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    }

    function isResponseTextCandidate(el) {
      if (!el || !document.body.contains(el)) return false;
      if (el.closest('pre, code, code-block, .code-block, .cm-editor, .gptgate-rtl-code-block')) return false;
      if (el.closest('button, gem-icon-button, gem-icon, mat-icon, message-actions, copy-button')) return false;
      if (el.closest('input-area-v2, rich-textarea, textarea, [contenteditable="true"]')) return false;
      if (el.closest('hallucination-disclaimer, model-response-disclaimers, .cdk-visually-hidden, .model-response-label-announcer')) return false;
      return (el.textContent || '').trim().length > 0;
    }

    function getResponseTextElements(root) {
      const selectors = [
        'message-content .markdown-main-panel',
        'message-content .markdown',
        'message-content p',
        'message-content li',
        'message-content h1',
        'message-content h2',
        'message-content h3',
        'message-content h4',
        'message-content h5',
        'message-content h6',
        'message-content blockquote',
        'message-content td',
        'message-content th',
        'message-content summary',
        'message-content ul',
        'message-content ol',
        'user-query .query-text',
        'user-query .query-text-line',
        'user-query-content .query-text',
        'user-query-content .query-text-line',
      ];

      return within(root, selectors.join(', '))
        .filter(isResponseTextCandidate);
    }

    function fixResponses(root = document) {
      const mode = getResponseMode();
      const roots = within(root, 'message-content .markdown, message-content .markdown-main-panel, user-query .query-text');

      roots.forEach((root) => {
        if (!isResponseTextCandidate(root)) return;
        const dir = resolveDir(root.textContent || '', mode, mode === 'auto' ? null : mode);
        applyDirection(root, dir);
      });

      getResponseTextElements(root).forEach((el) => {
        const dir = resolveDir(el.textContent || '', mode, mode === 'auto' ? null : mode);
        applyDirection(el, dir);
      });
    }

    function getCodeBlockContainer(el) {
      return el.closest('#code-block-viewer, .cm-editor, code-block, .code-block, pre') || el;
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

      if (block.classList.contains('gptgate-rtl-code-block') !== useRtl) block.classList.toggle('gptgate-rtl-code-block', useRtl);
      const dir = useRtl ? 'rtl' : 'ltr';
      if (block.dataset.gptgateCodeDir !== dir) block.dataset.gptgateCodeDir = dir;
      if (block.getAttribute('dir') !== dir) block.setAttribute('dir', dir);
    }

    function fixCodeBlocks(root = document) {
      injectCodeBlockStyles();

      const blocks = new Set();
      within(root, '#code-block-viewer, .cm-editor, code-block, .code-block, pre.cm-content, pre code').forEach((el) => {
        blocks.add(getCodeBlockContainer(el));
      });

      blocks.forEach(applyCodeBlockDirection);
    }

    function fixComposer(editor) {
      if (!editor) return;

      const mode = getComposerMode();

      let text = '';
      if (editor.tagName === 'TEXTAREA') {
        text = editor.value || '';
      } else {
        text = editor.textContent || '';
      }

      let dir = null;
      if (mode === 'rtl' || mode === 'ltr') {
        dir = mode;
      } else if (text.replace(/\s+/g, '').length > 0) {
        dir = detectComposerDirection(text, null);
      }

      if (dir === 'rtl') {
        applyDirection(editor, 'rtl');
      } else if (dir === 'ltr') {
        applyDirection(editor, 'ltr');
      } else {
        applyDirection(editor, null);
      }

      // The native editor owns its child nodes. Direction is inherited through
      // scoped CSS instead of rewriting editor paragraphs after every keystroke.
    }

    const boundEditors = new WeakSet();
    function fixComposers(root = document) {
      const editors = within(root, SELECTORS.composer.join(', '));
      for (const ed of editors) {
        if (ed.classList?.contains('ql-clipboard')) continue;
        if (ed.tagName !== 'RICH-TEXTAREA' && ed.tagName !== 'TEXTAREA' && !ed.closest('rich-textarea, input-area-v2')) continue;

        if (!boundEditors.has(ed)) {
          boundEditors.add(ed);
          ed.addEventListener('input', () => fixComposer(ed));
          ed.addEventListener('compositionend', () => fixComposer(ed));
        }
        fixComposer(ed);
      }
    }

    function start() {
      if (!document.body) {
        setTimeout(start, 50);
        return;
      }

      const runFixes = (root = document) => {
        fixResponses(root);
        fixComposers(root);
        fixCodeBlocks(root);
      };
      const pending = new Set();
      let scheduled = false;
      let mode = '';
      let all = false;
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (all) runFixes();
          else {
            const roots = [...pending].filter(root => root.isConnected);
            for (const root of roots) if (!roots.some(other => other !== root && other.contains(root))) runFixes(root);
          }
          pending.clear(); all = false;
        });
      };
      const responseRoot = 'message-content, user-query, user-query-content, model-response';
      const composerRoot = 'rich-textarea, textarea, [contenteditable="true"]';
      const queue = (node, added = false) => {
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) return;
        const root = el.closest('#code-block-viewer, .cm-editor, code-block, .code-block, pre') || el.closest(composerRoot) || el.closest(responseRoot);
        if (root) pending.add(root);
        else if (added) pending.add(el);
      };
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          queue(m.target);
          for (const node of m.addedNodes) queue(node, true);
        }
        if (pending.size) schedule();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      const classObserver = new MutationObserver(() => {
        const next = `${getResponseMode()}:${getComposerMode()}`;
        if (mode === next) return;
        mode = next; all = true; schedule();
      });
      classObserver.observe(document.body, {attributes:true, attributeFilter:['class']});
      mode = `${getResponseMode()}:${getComposerMode()}`;

      runFixes();
    }

    start();

  } catch (err) {
    console.error('[GptGate] Failed to load core module for Gemini', err);
  }
})();
