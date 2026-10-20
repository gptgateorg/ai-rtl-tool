export const SIDEBAR_TITLE_SELECTOR = ':is(#app-shell-sidebar,[data-sidebar-navigation-root]) :is([data-thread-title],[data-app-action-sidebar-project-row] [data-marquee-text])';
export const HOME_SUGGESTION_TEXT_SELECTOR = '[class~="group/home-suggestions"] [class~="group/home-suggestion-list-item"] [data-composer-mode] > span.truncate';

export const SELECTORS = {
  interfaceText: [SIDEBAR_TITLE_SELECTOR, HOME_SUGGESTION_TEXT_SELECTOR],
  responses: [
    '[data-markdown-text-style="assistant-message"]',
    '[data-user-message-bubble]',
    '[data-message-author-role="assistant"]',
    '[data-message-author-role="user"]',
    '[data-testid="conversation-turn"]',
    '.chat-message',
    '.chat-message-content',
    '.group[data-message-author-role]',
    '.markdown',
    '.prose'
  ],
  composer: [
    '.ProseMirror',
    'textarea[name="prompt-textarea"]',
    '[contenteditable="true"]',
    'textarea',
  ],
  math: [
    '.katex',
    '.mjx-container',
  ],
};

export const SIDEBAR_SELECTORS = [
  '[data-testid="left-sidebar"]',
  '[data-testid="chat-history-sidebar"]',
  'aside[data-testid]',
  'nav[data-testid]',
  'aside[aria-label*="sidebar" i]',
  'nav[aria-label*="sidebar" i]',
];

export const PANEL_RIGHT = 25;

export const disableDirectionCSS = true;
