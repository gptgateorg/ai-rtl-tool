/**
 * background.js – GptGate service worker
 *
 * Responsibilities:
 *  - Re-inject content script on install / update
 *  - Open external links with domain validation (S1/S2)
 *  - Show badge on supported AI tabs (G7)
 */

const URLS = [
  'https://chat.openai.com/*',
  'https://chatgpt.com/*',
  'https://gemini.google.com/*',
  'https://claude.ai/*'
];
const ALLOWED_DOMAINS = ['t.me', 'telegram.me'];

/* ── Helpers ── */

function isAllowedDomain(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(
      (d) => url.hostname === d || url.hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

function isSupportedHost(url) {
  if (!url) return false;
  return (
    url.startsWith('https://chat.openai.com') ||
    url.startsWith('https://chatgpt.com') ||
    url.startsWith('https://gemini.google.com') ||
    url.startsWith('https://claude.ai')
  );
}

/* ── Re-inject content script on install/update ── */

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: URLS }, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id || !tab.url) return;
      
      let script = '';
      if (tab.url.includes('chatgpt.com') || tab.url.includes('chat.openai.com')) {
        script = 'src/chatgpt/content.js';
      } else if (tab.url.includes('gemini.google.com')) {
        script = 'src/gemini/content.js';
      } else if (tab.url.includes('claude.ai')) {
        script = 'src/claude/content.js';
      }
      
      if (script) {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: [script] },
          () => void chrome.runtime.lastError
        );
      }
    });
  });
});

/* ── Open links — with URL domain validation (S1/S2) ── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'open-link' && typeof msg.url === 'string') {
    if (isAllowedDomain(msg.url)) {
      chrome.tabs.create({ url: msg.url });
      sendResponse({ ok: true });
    } else {
      console.warn('[GptGate] Blocked navigation to untrusted domain:', msg.url);
      sendResponse({ ok: false, error: 'domain not allowed' });
    }
    return true; // keep message channel open for sendResponse
  }

  if (msg?.type === 'gptgate:inject-css' && typeof msg.css === 'string' && sender?.tab?.id) {
    chrome.scripting.insertCSS({
      target: { tabId: sender.tab.id },
      css: msg.css,
      origin: 'USER'
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[GptGate] Failed to insert CSS via scripting API:', chrome.runtime.lastError);
        sendResponse?.({ ok: false });
      } else {
        sendResponse?.({ ok: true });
      }
    });
    return true; // keep message channel open for sendResponse
  }
});

/* ── Badge status on supported tabs (G7) ── */

function updateBadge(tabId, url) {
  const active = isSupportedHost(url);
  chrome.action.setBadgeText({ tabId, text: active ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2FCCE1' });
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateBadge(tabId, tab?.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadge(tabId, tab?.url);
  }
});
