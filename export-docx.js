// Loaded only by the preview's explicit Word action, never by a content script.
import { Document, Packer } from 'docx';
import { htmlToContent } from 'docx/html';

export async function createWordBlob(source, {title, fontFamily='iransans'} = {}) {
  const clone = source.cloneNode(true);
  const warnings = [];
  const auto = source.querySelectorAll('[dir="auto"]');
  clone.querySelectorAll('[dir="auto"]').forEach((element,index)=>element.dir=getComputedStyle(auto[index]).direction);
  clone.dir = 'rtl';
  // Word cannot display WebP; convert only pixels already embedded in this preview.
  for (const image of clone.querySelectorAll('img')) {
    if (!image.src.startsWith('data:image/webp;base64,')) continue;
    try {
      await image.decode();
      if (!image.naturalWidth || image.naturalWidth*image.naturalHeight>16000000) throw Error('Image too large');
      const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.src=canvas.toDataURL('image/png');
    } catch {
      const note=document.createElement('p');note.textContent=`[تصویر: ${image.alt||'در فایل Word قابل نمایش نیست'}]`;image.replaceWith(note);
      warnings.push({code:'unsupported-image'});
    }
  }
  const font={iransans:'IRANSansX',vazirmatn:'Vazirmatn',shabnam:'Shabnam',sahel:'Sahel'}[fontFamily] || 'Tahoma';
  const stylesheet=`
    body { font-family: "${font}"; font-size: 11pt; line-height: 1.8; }
    [dir="rtl"] { direction: rtl; text-align: right; }
    [dir="ltr"] { direction: ltr; text-align: left; }
    h1,h2,h3,h4,h5,h6 { font-family: "${font}"; }
    .role { color: #52665E; font-size: 9pt; font-weight: bold; }
    #meta { color: #52665E; font-size: 9pt; }
    pre,pre *,code,code *,kbd,samp { direction: ltr; font-family: Consolas; font-size: 10pt; }
    pre { text-align: left; white-space: pre-wrap; }
    table { border-collapse: collapse; width: 100%; }
    td,th { border: 1px solid #cccccc; padding: 6px; }
    a { color: #2A7360; text-decoration: underline; }
  `;
  const children=htmlToContent(clone.outerHTML,{stylesheet,maxImageWidth:600,onWarning:w=>warnings.push(w)});
  const doc=new Document({creator:'GPTGate',title,sections:[{children}]});
  return {blob:await Packer.toBlob(doc),warnings};
}
