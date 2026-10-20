// Marketing compositions use unmodified UI captures with public sample content.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {chromium, root, open} = require('../tests/harness.cjs');
const output = path.join(root, 'artifacts/chrome-web-store');
fs.mkdirSync(output, {recursive:true});
const uri = bytes => `data:image/png;base64,${bytes.toString('base64')}`;
const brand = 'https://popup.test/images/brand-fa.svg';
const css = `
@font-face{font-family:Store;src:url('https://popup.test/fonts/Vazirmatn-Variable.woff2');font-weight:100 900;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:1280px;height:800px;overflow:hidden}
body{font:400 24px/1.8 Store,sans-serif;background:#f4f7f6;color:#0d3b32;font-synthesis:none}
.sheet{width:100%;height:100%;position:relative;padding:40px 56px 32px;display:flex;flex-direction:column}
.brand{height:48px;display:flex;align-items:center;justify-content:space-between;flex:none;color:#3d6159;font-size:20px}
.brand img{width:148px;height:48px;object-fit:contain}
.stage{display:flex;direction:ltr;align-items:center;justify-content:space-between;gap:64px;flex:1;min-height:0}
.copy{width:520px;direction:rtl;text-align:right}
h1{font-size:52px;line-height:1.5;font-weight:500;margin:0 0 24px;letter-spacing:0}h1 b{font-weight:500;color:#26775e}
p{margin:0;color:#3d6159;font-size:24px;line-height:1.9}
.detail{border-top:1px solid #bdcfc6;margin-top:28px;padding-top:20px;font-size:20px;line-height:1.9}
.media{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;flex:none;width:496px}
.media img{display:block;max-width:100%;height:auto;border:1px solid #c6d6cf;border-radius:16px}
.media small{font-size:15px;line-height:1.6;color:#3d6159;direction:rtl;text-align:center}
footer{border-top:1px solid #bdcfc6;height:48px;padding-top:16px;display:flex;justify-content:space-between;align-items:center;direction:rtl;font-size:18px;color:#3d6159;flex:none}
.hero{background:#103d33;color:#f4faf7}.hero .brand,.hero p,.hero footer,.hero .media small{color:#c0dbd0}.hero h1 b{color:#b5e8d6}.hero footer,.hero .detail{border-color:#45695d}.hero .media img{width:390px;border:0}
.fonts .media img{width:390px}.fonts .copy{width:520px}.fonts .detail{line-height:2.1}
.export .stage{gap:36px}.export .media{width:744px}.export .copy{width:388px}.export h1{font-size:44px}.export p{font-size:22px}.export .media img{border-radius:12px}.export .detail{font-size:18px}
.promo{width:440px;height:280px;background:#103d33;color:#f4faf7;padding:28px 32px;direction:rtl;text-align:right}
.promo img{width:120px;height:40px;object-fit:contain;filter:invert(1)}.promo h1{font-size:30px;line-height:1.6;margin:18px 0 12px}.promo p{color:#c0dbd0;font-size:15px;line-height:1.6}
`;
function sheet(kind, screenshot, heading, description, detail, caption) {
  return `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>${css}</style><body><main class="sheet ${kind}">
  <header class="brand" dir="ltr"><span>GptGate</span><img src="${brand}" alt="جی‌پی‌تی گیت" ${kind==='hero'?'style="filter:invert(1)"':''}></header>
  <section class="stage"><div class="media"><img src="${uri(screenshot)}" alt="${caption}"><small>${caption}</small></div><div class="copy"><h1>${heading}</h1><p>${description}</p><p class="detail">${detail}</p></div></section>
  <footer><span>بدون ساخت حساب GptGate</span><span dir="ltr">ChatGPT · Gemini · Claude</span></footer></main></body></html>`;
}
async function capture(page, name, html, size={width:1280,height:800}) {
  await page.setViewportSize(size);
  await page.setContent(html);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  const problems=await page.evaluate(()=>{
    const issues=[];
    for(const el of document.querySelectorAll('.copy,.media,.brand,footer,.promo h1,.promo p')){
      const r=el.getBoundingClientRect();
      if(r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1||el.scrollWidth>el.clientWidth+1)issues.push(el.className||el.tagName);
      const stage=el.closest('.stage')?.getBoundingClientRect();
      if(stage&&(r.top<stage.top-1||r.bottom>stage.bottom+1))issues.push(`Stage overlap: ${el.className}`);
    }
    return issues;
  });
  assert.deepEqual(problems,[],`Artwork overflow: ${name}`);
  await page.screenshot({path:path.join(output,name)});
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  let settings,fonts;
  try {
    const sourceContext=await browser.newContext({deviceScaleFactor:2});
    const {page:source,errors}=await open(sourceContext,{state:{responseDir:'auto',composerDir:'auto',fontFix:true,fontFamily:'vazirmatn',fontWeight:500}});
    await source.setViewportSize({width:390,height:540});
    settings=await source.locator('body').screenshot();
    await source.locator('#fontSettings').evaluate(e=>e.open=true);
    await source.setViewportSize({width:390,height:850});
    await source.evaluate(()=>document.fonts.ready);
    fonts=await source.locator('.reading-panel').screenshot();
    assert.deepEqual(errors,[],'Popup screenshot errors');
    await sourceContext.close();
    const {page}=await open(browser);
    await capture(page,'01-settings-1280x800.png',sheet('hero',settings,
      'فارسی را<br><b>راحت‌تر بخوانید.</b>',
      'در <bdi>ChatGPT</bdi>، <bdi>Gemini</bdi> و <bdi>Claude</bdi><br>جهت متن و فونت را خودتان انتخاب کنید.',
      'پاسخ‌ها و کادر نوشتن،<br>هرکدام با تنظیم جداگانه.',
      'پنجرهٔ واقعی افزونه · تنظیم جهت و خوانایی'));
    await capture(page,'02-fonts-1280x800.png',sheet('fonts',fonts,
      'متن شما،<br><b>با فونت دلخواه.</b>',
      'ایران‌سنس، وزیرمتن، شبنم و ساحل؛<br>با انتخاب وزن نوشته‌ها.',
      'فونت خودتان را هم اضافه کنید.<br>فایل فونت روی دستگاه شما می‌ماند.',
      'جزئیات واقعی تنظیمات فونت · نمونهٔ وزیرمتن'));
    await capture(page,'promo-440x280.png',`<!doctype html><html lang="fa"><meta charset="utf-8"><style>${css}html,body{width:440px;height:280px}</style><body><main class="promo"><img src="${brand}" alt="جی‌پی‌تی گیت"><h1>فارسی را<br>راحت‌تر بخوانید.</h1><p dir="ltr">ChatGPT · Gemini · Claude</p></main></body></html>`,{width:440,height:280});
    await capture(page,'store-icon-128.png',`<style>html,body{margin:0;width:128px;height:128px;background:#b5e8d6}img{width:96px;height:96px;margin:16px;filter:brightness(0)}</style><img src="https://popup.test/images/brand-mark.svg" alt="GptGate">`,{width:128,height:128});
  }finally{await browser.close();}

  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-store-art-')),dist=path.join(root,'dist');
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1000,height:780},deviceScaleFactor:2,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`]});
  let preview;
  try {
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    for(let i=0;i<50&&!await worker.evaluate(()=>!!globalThis.chrome?.storage?.session);i++)await new Promise(r=>setTimeout(r,50));
    const id=new URL(worker.url()).host,key='11111111-2222-4333-8444-555555555555';
    await worker.evaluate(async({key})=>{
      await chrome.storage.sync.set({fontFamily:'vazirmatn',fontWeight:400});
      await chrome.storage.session.set({['pdf:'+key]:{title:'برنامهٔ مطالعهٔ هفتگی',scope:'conversation',createdAt:1792440000000,boundaryReached:true,messages:[
        {role:'user',html:'<p dir="rtl">یک برنامهٔ کوتاه برای یادگیری JavaScript پیشنهاد بده.</p>'},
        {role:'assistant',html:'<h2 dir="rtl">هر روز، یک تمرین کوچک</h2><p dir="rtl">با مفاهیم پایه شروع کنید و نتیجهٔ هر تمرین را یادداشت کنید.</p><ol dir="rtl"><li>روز اول: متغیرها و نوع داده</li><li>روز دوم: شرط‌ها و حلقه‌ها</li><li>روز سوم: نوشتن اولین تابع</li></ol><pre dir="ltr"><code>const greeting = \"Hello, world!\";\nconsole.log(greeting);</code></pre>'}
      ]}});
    },{key});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`chrome-extension://${id}/export.html#${key}`);
    await page.waitForFunction(()=>!document.querySelector('#word').disabled);
    await page.evaluate(()=>document.fonts.ready);
    preview=await page.screenshot();
    assert.deepEqual(errors,[],'Export preview screenshot errors');
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
  const artwork=await chromium.launch({headless:true});
  try{
    const {page}=await open(artwork);
    await capture(page,'03-export-1280x800.png',sheet('export',preview,
      'از گفتگو<br><b>به فایل.</b>',
      'گفتگوی ChatGPT را<br>PDF ذخیره کنید یا در<br>Word ویرایش کنید.',
      'کل گفتگوی در دسترس یا یک پاسخ<br>آماده‌سازی فایل روی دستگاه شما',
      'پیش‌نمایش واقعی خروجی · محتوای نمونهٔ آموزشی'));
  }finally{await artwork.close();}
  const names=['01-settings-1280x800.png','02-fonts-1280x800.png','03-export-1280x800.png','promo-440x280.png'];
  fs.writeFileSync(path.join(output,'preview.html'),`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>پیش‌نمایش تصاویر فروشگاه GptGate</title><style>body{background:#e4ece8;margin:32px auto;max-width:1280px;font:18px/1.8 sans-serif;color:#103d33}img{display:block;max-width:100%;height:auto;margin:24px 0}h1{font-size:24px}a{color:inherit}</style><h1>تصاویر آمادهٔ فروشگاه GptGate</h1><p>پیش‌نویس محلی؛ هنوز در فروشگاه منتشر نشده است.</p>${names.map(n=>`<a href="${n}"><img src="${n}" alt="${n}"></a>`).join('')}</html>`);
  console.log(`PASS: real UI captures, fonts/images loaded, no artwork overflow; assets in ${output}`);
})().catch(e=>{console.error(e);process.exitCode=1});
