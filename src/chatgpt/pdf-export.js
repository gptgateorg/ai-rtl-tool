import { createTip, claimTip } from '../shared/tips.js';
import { captureMessage, collectConversation, messageElements, messageRole, messageIdentity, MESSAGE_SELECTOR } from '../shared/export-content.js';

// One header control. Selection and export do no work until explicitly requested.
export const EXPORT_HEADER_SELECTOR = '[data-app-shell-main-titlebar], [data-testid="thread-header-right-actions-container"], [data-testid="thread-header-right-actions"], #conversation-header-actions';
const STYLE = `
:host{display:block;flex:none;pointer-events:auto;direction:rtl;color-scheme:light dark;font:400 13px/20px GPTGateUI,sans-serif;font-synthesis:none;--logo-filter:brightness(0);--bg:#fff;--ink:#173D32;--muted:#52665E;--line:#DCE4E0;--hover:#EDF2F0;--accent:#145247}
:host([data-placement="header"]){display:flex;align-items:center;height:52px;background:var(--color-surface,var(--token-main-surface-primary,var(--bg)))}
:host([data-placement="fallback"]){margin:8px 16px}
:host-context(.dark){--logo-filter:brightness(0) invert(1);--bg:#18231F;--ink:#E0EEE7;--muted:#A6B9AF;--line:#34463C;--hover:#26392F;--accent:#B1E7CC}
@media(prefers-color-scheme:dark){:host-context(html:not(.light)){--logo-filter:brightness(0) invert(1);--bg:#18231F;--ink:#E0EEE7;--muted:#A6B9AF;--line:#34463C;--hover:#26392F;--accent:#B1E7CC}}
*{box-sizing:border-box}[hidden]{display:none!important}
button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;min-width:44px;padding:8px 12px;border:0;border-radius:8px;background:transparent;color:var(--ink);font:500 13px/20px GPTGateUI,sans-serif;cursor:pointer;touch-action:manipulation;transition:transform 150ms cubic-bezier(.32,.72,0,1)}
button:active{transform:scale(.98)}button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}button:disabled{opacity:.5;cursor:default;transform:none}
@media(hover:hover){button:not(.trigger):hover:not(:disabled){background:var(--hover)}.trigger:hover:not(:disabled){color:var(--accent)}}
.trigger{white-space:nowrap;color:var(--muted)}.trigger[aria-expanded="true"]{color:var(--accent)}.trigger>svg:first-child{width:20px;height:20px}
svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.panel{position:fixed;inset:auto;margin:0;width:304px;max-width:calc(100vw - 24px);padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit;direction:rtl;overflow:auto;max-height:calc(100dvh - 24px)}
.panel:popover-open{animation:enter 150ms cubic-bezier(.32,.72,0,1)}
@keyframes enter{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.options{display:grid;gap:4px}.options button{justify-content:flex-start;text-align:right}.option-copy{display:grid;gap:0}.hint{font:400 12px/20px GPTGateUI,sans-serif;color:var(--muted)}
.picker{padding:4px}.picker p{margin:0 0 8px}.navigation,.actions{display:flex;gap:4px;align-items:center}.navigation{margin-block:8px}.navigation .hint{flex:1;text-align:center}.actions{justify-content:space-between}.primary{background:var(--hover);color:var(--accent)}
.status{margin:8px 4px;font:400 12px/20px GPTGateUI,sans-serif;overflow-wrap:anywhere}
.brand{display:flex;align-items:center;justify-content:center;gap:4px;margin:8px 4px 0;padding-top:8px;border-top:1px solid var(--line);font:400 12px/20px GPTGateUI,sans-serif;color:var(--muted);white-space:nowrap}.brand img{width:16px;height:16px;filter:var(--logo-filter);opacity:.8}.brand b{font-weight:500}
:host([data-keyboard]) button{transition:none}:host([data-keyboard]) .panel{animation:none}
@media(prefers-reduced-motion:reduce){button{transition:none}.panel:popover-open{animation:none}}
@media(forced-colors:active){button:not(.trigger),.panel{border:1px solid ButtonText}.primary{outline:1px solid Highlight}}
`;
const sheet = new CSSStyleSheet(); sheet.replaceSync(STYLE);
let fontsRegistered = false;
let control;
let tipOffered = false;
let tipClaim;
const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const fileIcon = icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6m-3-3 3 3 3-3"/>');
// Unknown renderers must reselect if text changes, rather than silently export a recycled node.
const selectionKey = el => messageIdentity(el) || el.textContent;
function createControl() {
  if (!fontsRegistered) {
    fontsRegistered = true;
    for (const [weight, file] of [['400','Regular'],['500','Medium']]) {
      const font = new FontFace('GPTGateUI',`url("${chrome.runtime.getURL(`fonts/IRANSansX-${file}.woff2`)}")`,{weight,display:'swap'});
      document.fonts.add(font); // Load only the face actually used by a visible control.
    }
  }
  const host = document.createElement('gptgate-export-tools');
  host.dataset.gptgateExport = 'conversation';
  const root = host.attachShadow({mode:'open'}); root.adoptedStyleSheets = [sheet];
  root.innerHTML = `<button class="trigger" type="button" aria-expanded="false" aria-controls="pdf-panel">${fileIcon}<span>خروجی PDF</span>${icon('<path d="m8 10 4 4 4-4"/>')}</button>
  <section id="pdf-panel" class="panel" popover="auto" aria-label="خروجی PDF گفتگو">
    <div class="options">
      <button type="button" data-action="all">${fileIcon}<span class="option-copy">کل گفتگو<span class="hint">همهٔ پیام‌ها در یک فایل</span></span></button>
      <button type="button" data-action="select">${icon('<path d="m4 3 7 18 2-8 8-2z"/>')}<span class="option-copy">انتخاب پاسخ<span class="hint">یک پاسخ را از گفتگو انتخاب کنید</span></span></button>
      <button type="button" data-action="help">راهنمای خروجی</button>
    </div>
    <div class="picker" hidden><p>روی پاسخ موردنظر کلیک کنید</p><span class="hint">یا با دکمه‌های زیر بین پاسخ‌ها جابه‌جا شوید.</span>
      <div class="navigation"><button type="button" data-action="prev" aria-label="پاسخ قبلی">${icon('<path d="m9 6 6 6-6 6"/>')}</button><span class="hint" id="selection-status" role="status">پاسخی انتخاب نشده</span><button type="button" data-action="next" aria-label="پاسخ بعدی">${icon('<path d="m15 6-6 6 6 6"/>')}</button></div>
    </div>
    <div class="actions" hidden><button type="button" class="primary" data-action="export" disabled>خروجی پاسخ انتخاب‌شده</button><button type="button" data-action="cancel">لغو</button></div>
    <p class="status" role="status" hidden></p>
    <div class="brand"><img alt="" src="${chrome.runtime.getURL('images/brand-mark.svg')}"><span>ساخته‌شده با عشق ❤️ توسط <b dir="ltr">GPTGate</b></span></div>
  </section>`;
  const $ = selector => root.querySelector(selector);
  const trigger = $('.trigger'), panel = $('.panel'), options = $('.options'), picker = $('.picker'), actions = $('.actions'), exportButton = $('[data-action="export"]'), status = $('.status');
  let tip, pendingTipCleanup;
  let mode = 'menu', route = location.href, selected = null, selectedKey = '', active = null, selectionStyle;
  const say = text => { status.textContent = text; status.hidden = !text; };
  function position() {
    const rect = trigger.getBoundingClientRect();
    panel.style.left = `${Math.max(12,Math.min(innerWidth - panel.offsetWidth - 12,rect.right - panel.offsetWidth))}px`;
    panel.style.top = `${Math.max(12,Math.min(innerHeight - panel.offsetHeight - 12,rect.bottom + 8))}px`;
  }
  function closeTip() {
    tip?.remove(); tip=null;
    window.removeEventListener('resize',positionTip);
    document.removeEventListener('keydown',dismissManualTip,true);
  }
  function dismissManualTip(event) {
    if(event.key!=='Escape')return;
    event.preventDefault();event.stopPropagation();closeTip();trigger.focus({preventScroll:true});
  }
  function positionTip() {
    if(!tip)return;
    const rect=trigger.getBoundingClientRect();
    const left=Math.max(12,Math.min(innerWidth-tip.offsetWidth-12,rect.right-tip.offsetWidth));
    tip.style.left=`${left}px`;
    tip.style.top=`${Math.max(12,Math.min(innerHeight-tip.offsetHeight-12,rect.bottom+12))}px`;
    tip.style.setProperty('--tip-arrow',`${Math.max(16,Math.min(tip.offsetWidth-24,left+tip.offsetWidth-(rect.left+rect.width/2)))}px`);
  }
  function showTip(manual=false) {
    close({focus:false}); closeTip();
    tip=createTip({title:'خروجی از گفتگو',text:'از این دکمه، کل گفتگو یا فقط یک پاسخ را انتخاب کنید. در پیش‌نمایش می‌توانید PDF یا Word بگیرید.',
      onNext:()=>{closeTip();if(manual)trigger.focus({preventScroll:true});},onClose:()=>{closeTip();if(manual)trigger.focus({preventScroll:true});}});
    tip.popover='auto';
    tip.style.cssText='position:fixed;inset:auto;margin:0;width:288px;max-width:calc(100vw - 24px);overflow:visible';
    root.append(tip);tip.showPopover();positionTip();
    const current=tip;
    current.addEventListener('toggle',()=>{if(!current.matches(':popover-open')&&tip===current)closeTip();});
    window.addEventListener('resize',positionTip);
    if(manual){document.addEventListener('keydown',dismissManualTip,true);tip.querySelector('[data-tip-next]').focus({preventScroll:true});}
  }
  function offerTip() {
    if(tipOffered||pendingTipCleanup)return;
    const busy=()=>document.activeElement?.matches('textarea,input,[contenteditable="true"]') || active || panel.matches(':popover-open');
    const check=async()=>{
      if(document.visibilityState!=='visible'||!host.isConnected||busy())return;
      tipClaim ||= claimTip('pdf');
      const show = await tipClaim;
      if(tipOffered || !host.isConnected)return;
      if(!show){tipOffered=true;pendingTipCleanup?.();return;}
      // Typing may start while the worker/storage responds; retain the claim until safe.
      if(document.visibilityState!=='visible'||busy())return;
      tipOffered=true;pendingTipCleanup?.();showTip();
    };
    const afterFocus=()=>queueMicrotask(check);
    pendingTipCleanup=()=>{document.removeEventListener('visibilitychange',check);document.removeEventListener('focusout',afterFocus);pendingTipCleanup=null;};
    document.addEventListener('visibilitychange',check);document.addEventListener('focusout',afterFocus);
    void check();
  }
  function clearSelection() {
    selected?.removeAttribute('data-gptgate-pdf-selected'); selected = null; selectedKey = '';
    exportButton.disabled = true; $('#selection-status').textContent = 'پاسخی انتخاب نشده';
  }
  function stopPicking() {
    clearSelection(); selectionStyle?.remove(); selectionStyle = null;
    document.removeEventListener('click',pickFromPage,true);
  }
  function close({focus = true} = {}) {
    active?.abort(); stopPicking();
    if (panel.matches(':popover-open')) panel.hidePopover();
    trigger.setAttribute('aria-expanded','false');
    window.removeEventListener('resize',position); document.removeEventListener('keydown',onKey,true);
    if (focus && host.isConnected) trigger.focus({preventScroll:true});
  }
  function show(nextMode) {
    if (panel.matches(':popover-open')) panel.hidePopover();
    mode = nextMode; panel.popover = mode === 'menu' ? 'auto' : 'manual';
    options.hidden = mode !== 'menu'; picker.hidden = mode !== 'select'; actions.hidden = mode === 'menu';
    exportButton.hidden = mode !== 'select'; say('');
    panel.showPopover(); trigger.setAttribute('aria-expanded','true'); position();
    window.addEventListener('resize',position); document.addEventListener('keydown',onKey,true);
  }
  function validSelection() {
    return selected?.isConnected && location.href === route && messageRole(selected) === 'assistant' && selectionKey(selected) === selectedKey && messageElements().includes(selected);
  }
  function select(el, scroll = false) {
    clearSelection(); selected = el; selectedKey = selectionKey(el);
    selected.setAttribute('data-gptgate-pdf-selected',''); exportButton.disabled = false;
    const answers = messageElements().filter(e => messageRole(e) === 'assistant');
    $('#selection-status').textContent = `پاسخ ${(answers.indexOf(el)+1).toLocaleString('fa-IR')} از ${answers.length.toLocaleString('fa-IR')}`;
    if (scroll) el.scrollIntoView({block:'center',behavior:'instant'});
    say('');
  }
  function pickFromPage(event) {
    if (location.href !== route) { close(); return; }
    if (event.composedPath().includes(host) || !(event.target instanceof Element) || event.target.closest('a,button,input,textarea,select,summary,[role="button"],[contenteditable="true"]')) return;
    if (!window.getSelection()?.isCollapsed) return;
    const candidate = event.target.closest(MESSAGE_SELECTOR);
    if (candidate && messageRole(candidate) === 'assistant' && messageElements().includes(candidate)) select(candidate);
  }
  function onKey(event) {
    host.dataset.keyboard = '';
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (mode === 'menu' && event.composedPath().includes(host) && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      const buttons = [...options.querySelectorAll('button')];
      const index = buttons.indexOf(root.activeElement);
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : (index+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length].focus();
    }
  }
  async function runExport(single) {
    if (active) return;
    if (single && !validSelection()) { clearSelection(); say('پاسخ تغییر کرده؛ دوباره انتخاب کنید.'); return; }
    if (location.href !== route) { close(); return; }
    const controller = new AbortController(); active = controller;
    stopPicking(); show('export'); trigger.disabled = true;
    const title = document.title;
    const cancelOnInput = event => { if (event.type !== 'keydown' || ['Escape','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) controller.abort(); };
    for (const type of ['wheel','touchstart','keydown']) window.addEventListener(type,cancelOnInput,{passive:true});
    try {
      say(single ? 'در حال آماده‌سازی…' : 'در حال خواندن پیام‌ها؛ گفتگو موقتاً پیمایش می‌شود…');
      const result = single ? {messages:[captureMessage(single)],boundaryReached:true,unstableIdentity:false}
        : await collectConversation({signal:controller.signal,progress:count=>say(`${count.toLocaleString('fa-IR')} پیام خوانده شد…`)});
      if (controller.signal.aborted) throw new DOMException('Cancelled','AbortError');
      if (location.href !== route) throw Error('گفتگو عوض شد؛ دوباره خروجی بگیرید.');
      const response = await chrome.runtime.sendMessage({type:'gptgate:export-pdf',payload:{...result,title,scope:single?'response':'conversation',source:route}});
      if (!response?.ok) throw Error(response?.error || 'پیش‌نمایش باز نشد. دوباره تلاش کنید.');
      close();
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') close();
      else { show('menu'); say(error.message); position(); }
    } finally {
      trigger.disabled = false; active = null;
      if (host.isConnected && !panel.matches(':popover-open') && document.hasFocus()) trigger.focus({preventScroll:true});
      for (const type of ['wheel','touchstart','keydown']) window.removeEventListener(type,cancelOnInput);
    }
  }
  root.addEventListener('pointerdown',()=>delete host.dataset.keyboard);
  trigger.addEventListener('click',event=>{
    closeTip();
    host.toggleAttribute('data-keyboard',event.detail === 0);
    if (panel.matches(':popover-open')) { close(); return; }
    route = location.href; show('menu'); $('[data-action="all"]').focus({preventScroll:true});
  });
  panel.addEventListener('toggle',()=>{
    if (!panel.matches(':popover-open')) close({focus:mode !== 'menu'});
  });
  root.addEventListener('click',event=>{
    const action = event.target.closest('button')?.dataset.action;
    if (!action) return;
    if (action === 'help') showTip(true);
    else if (action === 'cancel') close();
    else if (action === 'all') void runExport(null);
    else if (action === 'export') void runExport(selected);
    else if (action === 'select') {
      route = location.href; show('select');
      selectionStyle = document.createElement('style'); selectionStyle.textContent = '[data-gptgate-pdf-selected]{outline:2px solid #42866D!important;outline-offset:4px!important}';
      document.head.append(selectionStyle);
      document.addEventListener('click',pickFromPage,true);
      $('[data-action="next"]').focus({preventScroll:true});
    } else if (action === 'prev' || action === 'next') {
      if (location.href !== route) { close(); return; }
      const answers = messageElements().filter(e=>messageRole(e)==='assistant');
      if (!answers.length) { clearSelection(); say('پاسخی دیده نمی‌شود؛ گفتگو را پیمایش کنید.'); return; }
      const index = answers.indexOf(selected);
      select(answers[index < 0 ? (action==='next'?0:answers.length-1) : Math.max(0,Math.min(answers.length-1,index+(action==='next'?1:-1)))],true);
    }
  });
  return {host,offerTip,dispose:()=>{pendingTipCleanup?.();closeTip();close({focus:false});},refresh:()=>{
    if (route !== location.href) { closeTip();close({focus:false}); route = location.href; }
    else if (mode === 'select' && selected && !validSelection()) { clearSelection(); say('پاسخ تغییر کرده؛ دوباره انتخاب کنید.'); }
  }};
}
export function syncExportUI() {
  if (control && !control.host.isConnected) { control.dispose(); control = null; }
  const messages = messageElements();
  if (!messages.length) { if (control) { control.dispose(); control.host.remove(); control = null; } return; }
  control ||= createControl(); control.refresh();
  const header = [...document.querySelectorAll(EXPORT_HEADER_SELECTOR)].find(e=>e.checkVisibility({visibilityProperty:true}) && !e.closest('[aria-hidden="true"]'));
  // The live header is fixed; join its action group without changing native controls.
  const anchor = header?.matches('[data-app-shell-main-titlebar]') ? header.firstElementChild : header;
  const parent = anchor || document.querySelector('main');
  if (parent && control.host.parentElement !== parent) {
    control.host.dataset.placement = anchor ? 'header' : 'fallback';
    parent.prepend(control.host);
  }
  control.offerTip();
}
