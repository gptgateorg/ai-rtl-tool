import { captureMessage, collectConversation, messageElements } from '../shared/export-content.js';

const STYLE = `
:host{display:block;direction:rtl;margin-block:8px;color-scheme:light dark}
.tools{--bg:#DFF7EE;--text:#0D3B32;--line:#7A948E;display:flex;align-items:center;flex-wrap:wrap;gap:8px;font:12px/1.7 GPTGateUI,sans-serif;color:var(--text)}
@media(prefers-color-scheme:dark){.tools{--bg:#145247;--text:#DFF7EE;--line:#2A7360}}
:host-context(.dark) .tools{--bg:#145247;--text:#DFF7EE;--line:#2A7360}
button{font:inherit;min-height:44px;padding:7px 14px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--text);cursor:pointer;transition:transform 150ms cubic-bezier(.32,.72,0,1)}
button:active{transform:scale(.98)}button:focus-visible{outline:2px solid currentColor;outline-offset:3px}button:disabled{opacity:.6;cursor:wait}
[hidden]{display:none!important}.status{max-width:36em;padding:4px 8px;border-radius:8px;background:var(--bg);color:var(--text)}
@media(prefers-reduced-motion:reduce){button{transition:none}}
@media(forced-colors:active){button{border:1px solid ButtonText}}
`;
// Chrome does not register @font-face rules inside shadow roots. Register once
// on the document; share the immutable sheet instead of parsing it per message.
const toolSheet = new CSSStyleSheet();
toolSheet.replaceSync(STYLE);
let uiFont;
let active = null;
function createTools(single) {
  if (!uiFont) {
    uiFont = new FontFace('GPTGateUI',`url("${chrome.runtime.getURL('fonts/IRANSansX-Regular.woff2')}")`,{weight:'400',display:'swap'});
    document.fonts.add(uiFont);
    void uiFont.load().catch(()=>{}); // Native fallback if the page blocks a font.
  }
  const host = document.createElement('gptgate-export-tools');
  host.dataset.gptgateExport = single ? 'response' : 'conversation';
  const shadow = host.attachShadow({mode:'open'});
  shadow.adoptedStyleSheets = [toolSheet];
  const row = document.createElement('div'); row.className = 'tools';
  const button = document.createElement('button'); button.type = 'button';
  button.textContent = single ? 'PDF این پاسخ' : 'خروجی PDF گفتگو';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'لغو'; cancel.hidden = true;
  const status = document.createElement('span'); status.className = 'status'; status.role = 'status'; status.hidden = true;
  cancel.addEventListener('click',()=>active?.abort());
  button.addEventListener('click',async()=>{
    if (active) return;
    const controller = new AbortController();
    active = controller;
    button.disabled = true;
    cancel.hidden = false;
    const say = text => { status.textContent = text; status.hidden = false; };
    const cancelOnInput = event => { if (event.type !== 'keydown' || ['Escape','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) controller.abort(); };
    for (const type of ['wheel','touchstart','keydown']) window.addEventListener(type,cancelOnInput,{passive:true});
    try {
      const route = location.href;
      const title = document.title;
      say(single ? 'در حال آماده‌سازی…' : 'در حال جمع‌آوری پیام‌ها؛ گفتگو موقتاً پیمایش می‌شود…');
      const result = single
        ? {messages:[captureMessage(single)],boundaryReached:true,unstableIdentity:false}
        : await collectConversation({signal:controller.signal,progress:count=>say(`${count.toLocaleString('fa-IR')} پیام خوانده شد…`)});
      if (controller.signal.aborted) throw new DOMException('Cancelled','AbortError');
      if (location.href !== route) throw Error('گفتگو عوض شد؛ دوباره خروجی بگیرید.');
      const response = await chrome.runtime.sendMessage({type:'gptgate:export-pdf',payload:{...result,title,scope:single?'response':'conversation',source:route}});
      if (!response?.ok) throw Error(response?.error || 'پیش‌نمایش باز نشد. دوباره تلاش کنید.');
      say('پیش‌نمایش باز شد؛ «ذخیره به‌صورت PDF» را انتخاب کنید.');
    } catch (error) { say(error.name === 'AbortError' ? 'خروجی لغو شد.' : error.message); }
    finally {
      button.disabled = false; cancel.hidden = true; active = null;
      for (const type of ['wheel','touchstart','keydown']) window.removeEventListener(type,cancelOnInput);
    }
  });
  row.append(button,cancel,status); shadow.append(row);
  return host;
}
export function syncExportUI() {
  const messages = messageElements();
  const main = document.querySelector('main');
  const existing = document.querySelector('gptgate-export-tools[data-gptgate-export="conversation"]');
  if (!messages.length) { existing?.remove(); return; }
  if (main && !existing) main.prepend(createTools(null));
  for (const message of messages) {
    if (message.dataset.messageAuthorRole !== 'assistant') {
      message.querySelector(':scope > gptgate-export-tools')?.remove();
      continue;
    }
    if (!message.querySelector(':scope > gptgate-export-tools')) message.append(createTools(message));
  }
}
