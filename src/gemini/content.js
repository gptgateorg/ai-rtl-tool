(async () => {
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

      el.classList.remove('gptgate-gemini-rtl', 'gptgate-gemini-ltr');
      if (dir === 'rtl') {
        el.setAttribute('dir', 'rtl');
        el.classList.add('gptgate-gemini-rtl');
        el.style.setProperty('direction', 'rtl', 'important');
        el.style.setProperty('text-align', 'right', 'important');
      } else if (dir === 'ltr') {
        el.setAttribute('dir', 'ltr');
        el.classList.add('gptgate-gemini-ltr');
        el.style.setProperty('direction', 'ltr', 'important');
        el.style.setProperty('text-align', 'left', 'important');
      } else {
        el.setAttribute('dir', 'auto');
        el.style.removeProperty('direction');
        el.style.removeProperty('text-align');
      }
    }

    function isResponseTextCandidate(el) {
      if (!el || !document.body.contains(el)) return false;
      if (el.closest('pre, code, code-block, .code-block, .cm-editor, .gptgate-rtl-code-block')) return false;
      if (el.closest('button, gem-icon-button, gem-icon, mat-icon, message-actions, copy-button')) return false;
      if (el.closest('input-area-v2, rich-textarea, textarea, [contenteditable="true"]')) return false;
      if (el.closest('hallucination-disclaimer, model-response-disclaimers, .cdk-visually-hidden, .model-response-label-announcer')) return false;
      return (el.textContent || '').trim().length > 0;
    }

    function getResponseTextElements() {
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

      return Array.from(document.querySelectorAll(selectors.join(', ')))
        .filter(isResponseTextCandidate);
    }

    function fixResponses() {
      const mode = getResponseMode();
      const roots = document.querySelectorAll('message-content .markdown, message-content .markdown-main-panel, user-query .query-text');

      roots.forEach((root) => {
        if (!isResponseTextCandidate(root)) return;
        const dir = resolveDir(root.textContent || '', mode, mode === 'auto' ? null : mode);
        applyDirection(root, dir);
      });

      getResponseTextElements().forEach((el) => {
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

      block.classList.toggle('gptgate-rtl-code-block', useRtl);
      block.dataset.gptgateCodeDir = useRtl ? 'rtl' : 'ltr';
      block.setAttribute('dir', useRtl ? 'rtl' : 'ltr');
    }

    function fixCodeBlocks() {
      injectCodeBlockStyles();

      const blocks = new Set();
      document.querySelectorAll('#code-block-viewer, .cm-editor, code-block, .code-block, pre.cm-content, pre code').forEach((el) => {
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

      if (editor.tagName !== 'TEXTAREA') {
        editor.querySelectorAll('p, div:not(.ql-clipboard)').forEach((block) => {
          if (block.classList?.contains('ql-clipboard')) return;
          const blockText = block.textContent || '';
          const blockDir = mode === 'auto'
            ? resolveDir(blockText, mode, dir)
            : dir;
          applyDirection(block, blockDir);
        });
      }
    }

    function fixComposers() {
      const editors = document.querySelectorAll(SELECTORS.composer.join(', '));
      for (const ed of editors) {
        if (ed.classList?.contains('ql-clipboard')) continue;
        if (ed.tagName !== 'RICH-TEXTAREA' && ed.tagName !== 'TEXTAREA' && !ed.closest('rich-textarea, input-area-v2')) continue;

        if (!ed.dataset.gptgateInit) {
          ed.dataset.gptgateInit = '1';
          ed.addEventListener('input', () => fixComposer(ed));
          ed.addEventListener('compositionend', () => fixComposer(ed));
          ed.addEventListener('keyup', () => fixComposer(ed));
        }
        fixComposer(ed);
      }
    }

    function start() {
      if (!document.body) {
        setTimeout(start, 50);
        return;
      }

      const runFixes = () => {
        fixResponses();
        fixComposers();
        fixCodeBlocks();
      };

      // Run periodically to catch newly added editors and code viewers.
      setInterval(runFixes, 1500);

      const observer = new MutationObserver((mutations) => {
        let shouldRun = false;
        for (const m of mutations) {
          if (m.type === 'characterData' || m.addedNodes.length > 0) {
            shouldRun = true;
            break;
          }
        }
        if (shouldRun) runFixes();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });

      const classObserver = new MutationObserver(runFixes);
      classObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });

      runFixes();
    }

    start();

  } catch (err) {
    console.error('[GptGate] Failed to load core module for Gemini', err);
  }
})();
