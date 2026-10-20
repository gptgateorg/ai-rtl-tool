// An allowlist shared by capture and preview. Never trust HTML supplied by a page.
const HTML_TAGS = new Set('p div span br hr h1 h2 h3 h4 h5 h6 strong b em i u s del small sub sup blockquote pre code kbd samp ul ol li dl dt dd table caption thead tbody tfoot tr th td a details summary figure figcaption'.split(' '));
const MATH_TAGS = new Set('math semantics mrow mi mn mo mtext mspace ms mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mtr mlabeledtr mtd maligngroup malignmark'.split(' '));
const DROP = new Set('script style noscript iframe object embed form input textarea select button nav header footer audio video canvas svg annotation annotation-xml'.split(' '));
const MATH_ATTRS = new Set('display mathvariant mathsize mathcolor stretchy fence separator accent accentunder lspace rspace linethickness notation columnalign rowalign columnspacing rowspacing rowspan columnspan open close separators bevelled width height depth voffset'.split(' '));

export function safeContent(source, target = document) {
  const fragment = target.createDocumentFragment();
  let nodes = 0;
  function copy(node, parent, depth = 0) {
    if (++nodes > 50000 || depth > 100) throw Error('ساختار این پاسخ برای خروجی خیلی بزرگ است؛ برای جلوگیری از PDF ناقص، خروجی متوقف شد.');
    if (node.nodeType === 3) { parent.append(target.createTextNode(node.textContent)); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName.toLowerCase();
    if (!MATH_TAGS.has(tag) && (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true')) return;
    if (tag.startsWith('gptgate-') || node.hasAttribute('data-gptgate-export') || DROP.has(tag)) return;
    // KaTeX includes a visual tree and a semantic MathML tree. Print the latter once.
    if (node.matches('.katex, mjx-container, .mjx-container')) {
      const math = node.querySelector('math');
      if (math) { copy(math, parent, depth+1); return; }
      const fallback = target.createElement('span');
      fallback.className = 'math-fallback';
      fallback.textContent = node.getAttribute('aria-label') || node.textContent;
      parent.append(fallback);
      return;
    }
    if (tag === 'img') {
      let raster = node.getAttribute('src') || '';
      if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(raster)) {
        raster = '';
        // Use pixels already loaded by the page. Never fetch images for export.
        if (node.complete && node.naturalWidth && node.naturalHeight) {
          try {
            const canvas = target.createElement('canvas');
            const scale = Math.min(1,2048 / Math.max(node.naturalWidth,node.naturalHeight));
            canvas.width = Math.max(1,Math.round(node.naturalWidth*scale));
            canvas.height = Math.max(1,Math.round(node.naturalHeight*scale));
            canvas.getContext('2d').drawImage(node,0,0,canvas.width,canvas.height);
            raster = canvas.toDataURL('image/png');
          } catch { /* Cross-origin pixels are protected by the browser. */ }
        }
      }
      if (raster && raster.length < 1024*1024) {
        const image = target.createElement('img');
        image.src = raster;
        image.alt = (node.getAttribute('alt') || '').slice(0,1000);
        parent.append(image);
        return;
      }
      const placeholder = target.createElement('p');
      placeholder.className = 'image-note';
      placeholder.textContent = `[تصویر: ${node.getAttribute('alt') || 'برای مشاهده، گفتگوی اصلی را باز کنید'}]`;
      parent.append(placeholder);
      return;
    }
    if (!HTML_TAGS.has(tag) && !MATH_TAGS.has(tag)) {
      for (const child of node.childNodes) copy(child,parent,depth+1);
      return;
    }
    const isMath = MATH_TAGS.has(tag);
    const element = isMath ? target.createElementNS('http://www.w3.org/1998/Math/MathML',tag) : target.createElement(tag);
    if (tag === 'details') element.open = true;
    const dir = node.getAttribute('dir');
    if (['rtl','ltr','auto'].includes(dir)) element.dir = dir;
    if (tag === 'math') element.setAttribute('dir','ltr');
    if (tag === 'a') {
      try {
        const href = new URL(node.getAttribute('href'), 'https://chatgpt.com');
        if (['https:','http:','mailto:'].includes(href.protocol)) {
          element.setAttribute('href',href.href);
          element.setAttribute('rel','noreferrer noopener');
          element.setAttribute('target','_blank');
        }
      } catch { /* Keep the link text. */ }
    }
    for (const attr of node.attributes) {
      if ((isMath && MATH_ATTRS.has(attr.name)) || (['colspan','rowspan','start','value'].includes(attr.name) && /^\d{1,4}$/.test(attr.value))) {
        if (attr.value.length <= 120 && !/[<>\\;"{}]/.test(attr.value)) element.setAttribute(attr.name,attr.value);
      }
    }
    if (tag === 'pre' || tag === 'code') element.setAttribute('dir','ltr');
    for (const child of node.childNodes) copy(child,element,depth+1);
    parent.append(element);
  }
  for (const child of source.childNodes) copy(child,fragment);
  return fragment;
}

export function captureMessage(element) {
  const source = element;
  const wrapper = document.createElement('div');
  wrapper.append(safeContent(source));
  return { role: element.dataset.messageAuthorRole, html: wrapper.innerHTML };
}

export const MESSAGE_SELECTOR = '[data-message-author-role="user"],[data-message-author-role="assistant"]';
export function messageElements(root = document) {
  return [...root.querySelectorAll(MESSAGE_SELECTOR)].filter(node => {
    if (node.parentElement?.closest(MESSAGE_SELECTOR) || node.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
    if (!node.checkVisibility) return true;
    if (node.checkVisibility({visibilityProperty:true})) return true;
    // display:contents wrappers have no box, but their message children do.
    return getComputedStyle(node).display === 'contents' && [...node.children].some(child=>child.checkVisibility({visibilityProperty:true}));
  });
}

export function findScrollContainer(element) {
  for (let parent=element?.parentElement;parent;parent=parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight>parent.clientHeight+2) return parent;
  }
  return document.scrollingElement;
}

// Only runs after a user gesture. No background collection or conversation API.
export async function collectConversation({signal, progress = ()=>{}, maxMs = 20000, settleMs = 180} = {}) {
  const initial = messageElements();
  if (!initial.length) throw Error('هنوز پیامی برای خروجی وجود ندارد.');
  const container = findScrollContainer(initial[0]);
  const originalTop = container.scrollTop;
  const originalBehavior = container.style.scrollBehavior;
  const route = location.href;
  const started = performance.now();
  const ordered = new Map();
  const nodeKeys = new WeakMap();
  let nextKey = 0, bytes = 0, boundaryReached = false, unstableIdentity = false, limited = false;
  const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
  const check = () => {
    if (signal?.aborted) throw new DOMException('Cancelled','AbortError');
    if (location.href !== route) throw Error('گفتگو عوض شد؛ خروجی را دوباره بگیرید.');
    return !limited && performance.now()-started < maxMs;
  };
  const snapshot = () => {
    for (const element of messageElements()) {
      if (!check()) { limited = true; break; }
      const stable = element.getAttribute('data-message-id') || element.closest('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid');
      if (!stable) unstableIdentity = true;
      if (!nodeKeys.has(element)) nodeKeys.set(element,`node-${++nextKey}`);
      const key = `${element.dataset.messageAuthorRole}:${stable || nodeKeys.get(element)}`;
      if (!ordered.has(key) && ordered.size >= 500) { limited = true; break; }
      const record = captureMessage(element);
      const nextBytes = bytes - (ordered.has(key) ? JSON.stringify(ordered.get(key)).length : 0) + JSON.stringify(record).length;
      if (nextBytes > 1.5 * 1024 * 1024) { limited = true; break; }
      bytes = nextBytes;
      ordered.set(key,record);
    }
    progress(ordered.size);
  };
  try {
    container.style.scrollBehavior = 'auto';
    // Recheck the top while lazy history settles before traversing downwards.
    let topStable = 0;
    while (check() && topStable < 3) {
      container.scrollTop = 0;
      const height = container.scrollHeight;
      await pause(Math.max(settleMs,250));
      if (container.scrollTop < 2 && height === container.scrollHeight) topStable++;
      else topStable = 0;
    }
    let bottomStable = 0;
    while (check()) {
      snapshot();
      if (!check()) break;
      const top = container.scrollTop, height = container.scrollHeight;
      const atBottom = top + container.clientHeight >= height - 3;
      if (atBottom) {
        await pause(Math.max(settleMs,250));
        snapshot();
        if (!check()) break;
        if (container.scrollHeight === height && container.scrollTop + container.clientHeight >= height-3) bottomStable++;
        else bottomStable = 0;
        if (bottomStable >= 3) { boundaryReached = topStable >= 3; break; }
      } else {
        container.scrollTop = Math.min(height, top + Math.max(200,container.clientHeight * .75));
        await pause(settleMs);
      }
    }
    check();
    if (!ordered.size) throw Error('پیام‌های گفتگو خوانده نشدند. دوباره تلاش کنید.');
    return {messages:[...ordered.values()], boundaryReached, unstableIdentity};
  } finally {
    if (location.href === route) container.scrollTop = originalTop;
    container.style.scrollBehavior = originalBehavior;
  }
}
