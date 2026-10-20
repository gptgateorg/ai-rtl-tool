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
let exportQueue = Promise.resolve();

async function openExport(payload, sender) {
  const source = new URL(sender.url || sender.tab?.url || '');
  if (source.protocol !== 'https:' || !['chatgpt.com','chat.openai.com'].includes(source.hostname)) throw Error('Unsupported source');
  if (!payload || !['response','conversation'].includes(payload.scope)
      || !Array.isArray(payload.messages) || !payload.messages.length || payload.messages.length>500
      || payload.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.html!=='string')
      || JSON.stringify(payload).length>2*1024*1024) throw Error('حجم گفتگو برای خروجی یک‌جا زیاد است؛ از پاسخ‌ها جداگانه خروجی بگیرید.');
  const old = await chrome.storage.session.get(null);
  const entries = Object.entries(old).filter(([k])=>k.startsWith('pdf:')).sort((a,b)=>b[1].createdAt-a[1].createdAt);
  // Keep at most two recent previews; session data disappears when Chrome closes.
  const expired = entries.filter(([,v],i)=>i>=1 || Date.now()-v.createdAt>30*60*1000).map(([k])=>k);
  if (expired.length) await chrome.storage.session.remove(expired);
  const id = crypto.randomUUID();
  const key = `pdf:${id}`;
  await chrome.storage.session.set({[key]:{
    messages:payload.messages, scope:payload.scope, title:String(payload.title || 'گفتگو').slice(0,200),
    boundaryReached:payload.boundaryReached===true, unstableIdentity:payload.unstableIdentity===true, createdAt:Date.now(),
  }});
  try { await chrome.tabs.create({url:chrome.runtime.getURL(`export.html#${id}`)}); }
  catch (error) { await chrome.storage.session.remove(key); throw error; }
}

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
  if (msg?.type === 'gptgate:export-pdf') {
    exportQueue = exportQueue.catch(()=>{}).then(()=>openExport(msg.payload,sender));
    exportQueue.then(()=>sendResponse({ok:true}),error=>sendResponse({ok:false,error:error.message}));
    return true;
  }
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
