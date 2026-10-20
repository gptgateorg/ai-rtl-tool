// Store artwork uses the actual popup/preview with public sample content only.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {chromium, root, open} = require('../tests/harness.cjs');
const output = path.join(root, 'artifacts/chrome-web-store');
fs.mkdirSync(output, {recursive:true});

(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for(const expanded of [false,true]){
      const {page}=await open(browser,{state:{responseDir:'auto',composerDir:'auto',fontFix:true,fontFamily:'vazirmatn',fontWeight:500}});
      if(expanded)await page.locator('#fontSettings').evaluate(e=>e.open=true);
      await page.evaluate(({expanded})=>{
        const frame=document.createElement('div');frame.className='store-popup';
        frame.append(...document.body.childNodes);document.body.append(frame);
        const copy=document.createElement('aside');copy.className='store-copy';
        copy.innerHTML=expanded
          ? '<h1>فونت دلخواه،<br>خواندن راحت‌تر</h1><p>انتخاب فونت و وزن<br>امکان افزودن فونت از دستگاه شما</p>'
          : '<h1>فارسی، خواناتر<br>در گفت‌وگو با هوش مصنوعی</h1><p>تنظیم جداگانهٔ جهت پاسخ و پیام<br>فونت فارسی و نمایش مرتب فرمول‌ها</p>';
        copy.insertAdjacentHTML('beforeend','<div class="store-services" dir="ltr">ChatGPT · Gemini · Claude</div><small>GptGate · بدون حساب جداگانه</small>');
        document.body.append(copy);
      },{expanded});
      await page.addStyleTag({content:`
        @font-face{font-family:Store;src:url('/fonts/Vazirmatn-Variable.woff2')}
        html{background:#f4f7f6}body{width:1280px!important;min-width:1280px!important;height:800px!important;padding:56px 80px!important;margin:0!important;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:96px;direction:ltr;background:#f4f7f6;color:#0d3b32}
        .store-popup{direction:rtl;width:390px;flex:none;padding:12px;box-sizing:border-box;background:#fff;border:1px solid #dce4e0;border-radius:16px}
        .store-copy{direction:rtl;text-align:right;flex:1;font:400 23px/1.9 Store,sans-serif}
        .store-copy h1{font:500 38px/1.65 Store,sans-serif;letter-spacing:0;margin:0 0 24px}
        .store-copy p{margin:0 0 32px;color:#3d6159}
        .store-services{font:500 20px/1.6 Store,sans-serif;text-align:right;margin:0 0 32px}
        .store-copy small{font:400 17px/1.6 Store,sans-serif;color:#3d6159}
      `});
      await page.setViewportSize({width:1280,height:800});
      await page.evaluate(()=>document.fonts.ready);
      const box=await page.locator('.store-popup').boundingBox();
      if(box.y<0||box.y+box.height>800)throw Error('Popup clipped in store screenshot');
      await page.screenshot({path:path.join(output,expanded?'02-fonts-1280x800.png':'01-settings-1280x800.png')});
      await page.close();
    }
    const {page}=await open(browser);
    await page.evaluate(()=>document.body.innerHTML='<main class="promo"><img src="/images/brand-fa.svg" alt="GptGate"><h1>فارسی روان‌تر<br>در گفتگوهای هوش مصنوعی</h1><p dir="ltr">ChatGPT · Gemini · Claude</p></main>');
    await page.addStyleTag({content:`@font-face{font-family:Store;src:url('/fonts/Vazirmatn-Variable.woff2')}html,body{width:440px!important;min-width:440px!important;height:280px!important;margin:0!important;padding:0!important;background:#f4f7f6!important;color:#0d3b32!important}.promo{display:block;text-align:right;direction:rtl;padding:28px 32px}.promo img{width:124px;height:42px;object-fit:contain}.promo h1{font:500 25px/1.7 Store,sans-serif;margin:16px 0 10px}.promo p{font:400 14px/1.5 Store,sans-serif;text-align:right;margin:0}`});
    await page.setViewportSize({width:440,height:280});await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(output,'promo-440x280.png')});
    await page.evaluate(()=>document.body.innerHTML='<img src="/images/brand-mark.svg" style="width:96px;height:96px;filter:brightness(0);margin:16px" alt="GptGate">');
    await page.addStyleTag({content:'html,body{width:128px!important;min-width:128px!important;height:128px!important;background:#b5e8d6!important}'});
    await page.setViewportSize({width:128,height:128});
    await page.screenshot({path:path.join(output,'store-icon-128.png')});
  }finally{await browser.close();}

  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-store-art-')),dist=path.join(root,'dist');
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1280,height:800},args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`]});
  try {
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    for(let i=0;i<50&&!await worker.evaluate(()=>!!globalThis.chrome?.storage?.session);i++)await new Promise(r=>setTimeout(r,50));
    const id=new URL(worker.url()).host,key='11111111-2222-4333-8444-555555555555';
    await worker.evaluate(async({key})=>{
      await chrome.storage.sync.set({fontFamily:'vazirmatn',fontWeight:400});
      await chrome.storage.session.set({['pdf:'+key]:{title:'برنامهٔ مطالعهٔ هفتگی',scope:'conversation',createdAt:Date.now(),boundaryReached:true,messages:[
        {role:'user',html:'<p dir="rtl">یک برنامهٔ کوتاه برای یادگیری JavaScript پیشنهاد بده.</p>'},
        {role:'assistant',html:'<h2 dir="rtl">هر روز، یک تمرین کوچک</h2><p dir="rtl">با مفاهیم پایه شروع کنید و نتیجهٔ هر تمرین را یادداشت کنید.</p><ol dir="rtl"><li>روز اول: متغیرها و نوع داده</li><li>روز دوم: شرط‌ها و حلقه‌ها</li><li>روز سوم: نوشتن اولین تابع</li></ol><pre dir="ltr"><code>const greeting = \"Hello, world!\";\nconsole.log(greeting);</code></pre><p dir="rtl">در پایان هفته، تمرین‌ها را در یک پروژهٔ کوچک کنار هم قرار دهید.</p>'}
      ]}});
    },{key});
    const page=await context.newPage();await page.goto(`chrome-extension://${id}/export.html#${key}`);
    await page.waitForFunction(()=>!document.querySelector('#word').disabled);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(output,'03-export-1280x800.png')});
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
  console.log(`Store screenshots, promo and icon saved in ${output}`);
})().catch(e=>{console.error(e);process.exitCode=1});
