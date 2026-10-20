import { safeContent } from './src/shared/export-content.js';
import { DEFAULT_STATE, normalizeState } from './src/shared/constants.js';
import { CUSTOM_FONT_KEY, fontCSS } from './src/shared/fonts.js';
const notice = document.getElementById('notice');
let exportFontFamily = 'iransans';
const wordButton = document.getElementById('word');
const wordStatus = document.getElementById('wordStatus');
const printButton = document.getElementById('print');
printButton.addEventListener('click',()=>window.print());
wordButton.addEventListener('click',async()=>{
  if(wordButton.disabled)return;
  wordButton.disabled=true;wordButton.setAttribute('aria-busy','true');
  wordStatus.hidden=false;wordStatus.textContent='در حال ساخت فایل Word…';
  try {
    const {createWordBlob}=await import('./export-docx.js');
    const {blob,warnings}=await createWordBlob(document.getElementById('document'),{title:document.title,fontFamily:exportFontFamily});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`${(document.title||'گفتگو').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100)}.docx`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    wordStatus.textContent=(warnings.length?'بعضی جزئیات در تبدیل تغییر کرده‌اند؛ فایل Word را بررسی کنید. ':'')+'فایل Word آماده شد. برای ظاهر یکسان، فونت انتخابی باید روی دستگاه بازکننده نصب باشد؛ فونت آپلودی داخل فایل قرار نمی‌گیرد.';
  } catch {
    wordStatus.textContent='فایل Word ساخته نشد؛ دوباره تلاش کنید. خروجی PDF همچنان در دسترس است.';
  } finally { wordButton.disabled=false;wordButton.setAttribute('aria-busy','false'); }
});
async function init() {
  try {
    const id = location.hash.slice(1);
    if (!/^[0-9a-f-]{36}$/.test(id)) throw Error('این پیش‌نمایش معتبر نیست. از داخل گفتگو دوباره خروجی بگیرید.');
    const key = `pdf:${id}`;
    const payload = (await chrome.storage.session.get(key))[key];
    if (!payload) throw Error('این پیش‌نمایش منقضی شده است. از داخل گفتگو دوباره خروجی بگیرید.');
    const state = normalizeState(await chrome.storage.sync.get(Object.keys(DEFAULT_STATE)));
    exportFontFamily = state.fontFamily;
    const custom = state.fontFamily === 'custom' ? (await chrome.storage.local.get(CUSTOM_FONT_KEY))[CUSTOM_FONT_KEY] : null;
    const {faces,family,weight} = fontCSS(state,custom);
    const style = document.createElement('style');
    style.textContent = `${faces} :root{--chat-font:"${family}";--chat-weight:${weight}}`;
    document.head.append(style);
    document.title = payload.title || 'گفتگو';
    document.getElementById('title').textContent = payload.title || 'گفتگو';
    document.getElementById('meta').textContent = `${payload.messages.length.toLocaleString('fa-IR')} پیام · ${new Date(payload.createdAt).toLocaleDateString('fa-IR')} · ChatGPT`;
    const messages = document.getElementById('messages');
    for (const message of payload.messages) {
      const article = document.createElement('article'); article.className = 'message';
      const role = document.createElement('div'); role.className = 'role';
      role.textContent = message.role === 'user' ? 'شما' : 'ChatGPT';
      const content = document.createElement('div'); content.className = 'message-content';
      content.dir = state.responseDir === 'auto' ? 'auto' : state.responseDir;
      const template = document.createElement('template');
      template.innerHTML = message.html;
      content.append(safeContent(template.content));
      article.append(role,content); messages.append(article);
    }
    const limits = 'تصویرهای محافظت‌شده یا خیلی بزرگ با توضیح متنی جایگزین می‌شوند. فرمول‌های دارای MathML حفظ می‌شوند.';
    notice.textContent = payload.scope === 'response'
      ? `پیش‌نمایش همین پاسخ. ${limits}`
      : `${payload.boundaryReached ? 'پیام‌های قابل بارگذاری گفتگو جمع‌آوری شدند.' : 'زمان یا حجم جمع‌آوری به حد مجاز رسید؛ این خروجی ممکن است کامل نباشد.'} ${payload.unstableIdentity ? 'شناسهٔ بعضی پیام‌ها در دسترس نبود؛ ترتیب و تکراری نبودن آن‌ها را بررسی کنید. ' : ''}تعداد و ابتدا و انتهای پیام‌ها را بررسی کنید؛ پیام‌های مخفی یا بارگذاری‌نشده قابل تضمین نیستند. ${limits}`;
    await document.fonts.ready;
    printButton.disabled = false;
    wordButton.disabled = false;
  } catch (error) {
    notice.textContent = error.message || 'پیش‌نمایش خوانده نشد. دوباره خروجی بگیرید.';
    document.getElementById('document').hidden = true;
  }
}
void init();
