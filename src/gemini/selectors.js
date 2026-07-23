export const SELECTORS = {
  responses: [
    'user-query',
    'user-query-content',
    '.query-content',
    '.query-text',
    '.query-text-line',
    'model-response',
    'response-container',
    '.response-content',
    '.model-response-text',
    '.markdown-main-panel',
    'message-content',
    '.prose'
  ],
  composer: [
    'rich-textarea',
    '[contenteditable="true"]',
    'textarea',
  ],
  math: [
    '.katex',
    '.mjx-container',
  ],
};

export const SIDEBAR_SELECTORS = [
  '[class*="drawer"]',
  'mat-sidenav',
  'aside[aria-label*="sidebar" i]',
  'nav[aria-label*="sidebar" i]',
];

export const PANEL_RIGHT = 15;
