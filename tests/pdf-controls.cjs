const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {chromium,root,output}=require('./harness.cjs');
(async()=>{
 const dist=path.join(root,'dist'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-pdf-controls-'));
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`],viewport:{width:1000,height:800}});
 const errors=[];let checks=0;
 try{
  await context.route(/^https?:/,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:16px Arial}header{position:fixed;inset:0 0 auto;height:56px;background:#fafafa;display:flex;justify-content:flex-end;border-bottom:1px solid #ddd}header>div{display:flex;align-items:center;gap:8px}main{padding:80px 20px 20px;max-width:720px;margin:auto}article{padding:24px 8px}article p{line-height:2}.dark{background:#121714;color:#eee}.dark header{background:#121714}button{font:14px Arial}.native{height:40px}#composer{margin-top:24px}</style></head><body><header><div data-testid="thread-header-right-actions-container"><button class="native" id="share">Share</button></div></header><main><article data-message-id="u1" data-message-author-role="user"><p>لطفاً یک مثال ساده بنویس</p></article><article data-message-id="a1" data-message-author-role="assistant"><p id="a1">این پاسخ اول است. متن فارسی باید خوانا بماند.</p><button id="native-action" onclick="window.nativeClicked=true">Copy</button></article><article data-message-id="a2" data-message-author-role="assistant"><p id="a2">این پاسخ دوم است؛ انتخاب و خروجی آن مستقل است.</p></article><textarea id="composer" placeholder="Message"></textarea></main></body></html>`}));
  const page=await context.newPage(),cdp=await context.newCDPSession(page);
  cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');
  await page.goto('https://chatgpt.com/c/controls');await page.waitForSelector('gptgate-export-tools');
  const trigger=page.getByRole('button',{name:'خروجی PDF',exact:true});
  const menu=()=>trigger.click();const picker=async()=>{await menu();await page.locator('[data-action=select]').click();};
  assert.equal(await page.locator('header gptgate-export-tools').count(),1);assert.equal(await page.locator('article gptgate-export-tools,#gptgate-floating-panel').count(),0);checks+=2;
  await trigger.focus();await page.keyboard.press('Enter');
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('.panel').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.keyboard.press('ArrowDown');assert.ok(await page.locator('[data-action=select]').evaluate(e=>e===e.getRootNode().activeElement));
  await page.keyboard.press('Escape');assert.ok(await trigger.evaluate(e=>e===e.getRootNode().activeElement));checks+=4;
  await menu();await page.locator('#composer').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'composer');await page.keyboard.press('Escape');checks++;
  await menu();await page.locator('#composer').click();await page.waitForFunction(()=>document.querySelector('gptgate-export-tools').shadowRoot.querySelector('.trigger').getAttribute('aria-expanded')==='false');checks++;
  for(const theme of ['light','dark'])for(const width of [1000,320]){
   await page.setViewportSize({width,height:800});await page.evaluate(t=>document.documentElement.className=t,theme);await menu();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(170);
   const bounds=await page.locator('.panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
   assert.equal(await page.locator('.brand').textContent(),'ساخته‌شده با عشق ❤️ توسط GPTGate');
   assert.equal(await page.locator('.options button').first().evaluate(e=>getComputedStyle(e).fontWeight),'500');
   assert.equal(await page.locator('.brand').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
   await page.screenshot({path:path.join(output,`pdf-menu-${theme}-${width}.png`)});await page.keyboard.press('Escape');checks+=4;
  }
  await page.setViewportSize({width:1000,height:800});await page.evaluate(()=>document.documentElement.className='light');
  await picker();assert.equal(await page.locator('[data-action=export]').isDisabled(),true);
  await page.locator('#native-action').click();assert.equal(await page.evaluate(()=>window.nativeClicked),true);assert.equal(await page.locator('[data-gptgate-pdf-selected]').count(),0);checks+=3;
  await page.locator('#a2').click();assert.equal(await page.locator('[data-gptgate-pdf-selected]').getAttribute('data-message-id'),'a2');assert.equal(await page.locator('[data-action=export]').isEnabled(),true);checks+=2;
  await page.locator('[data-action=prev]').click();assert.equal(await page.locator('[data-gptgate-pdf-selected]').getAttribute('data-message-id'),'a1');
  await page.locator('[data-action=next]').click();assert.equal(await page.locator('[data-gptgate-pdf-selected]').getAttribute('data-message-id'),'a2');checks+=2;
  await page.screenshot({path:path.join(output,'pdf-picker.png')});
  // Virtualization can reuse the very same node for a different response.
  await page.evaluate(()=>document.querySelector('[data-message-id=a2]').dataset.messageId='replacement');await page.locator('[data-action=export]').click();
  assert.equal(await page.locator('[data-action=export]').isDisabled(),true);assert.ok((await page.locator('.status').textContent()).includes('دوباره انتخاب'));checks+=2;
  await page.locator('#a1').click();await page.locator('[data-action=cancel]').click();assert.equal(await page.locator('[data-gptgate-pdf-selected]').count(),0);checks++;
  await picker();await page.locator('[data-action=next]').click();await page.evaluate(()=>{document.querySelector('[data-gptgate-pdf-selected]').remove();});
  await page.waitForFunction(()=>document.querySelector('gptgate-export-tools').shadowRoot.querySelector('[data-action=export]').disabled);checks++;
  // The current renderer may identify a recycled root only through its child DIL ID.
  await page.evaluate(()=>{const a=document.querySelector('[data-message-author-role=assistant]');a.removeAttribute('data-message-id');a.innerHTML='<div data-dil-message-id="dil-1"><p id="dil">پاسخ اول</p></div>';});
  await page.locator('#dil').click();
  await page.evaluate(()=>{document.querySelector('[data-dil-message-id]').dataset.dilMessageId='dil-2';document.querySelector('#dil').textContent='پاسخ دوم';});
  await page.locator('[data-action=export]').click();assert.equal(await page.locator('[data-action=export]').isDisabled(),true);checks++;
  // Route changes close the picker without capturing a response from the next chat.
  await page.evaluate(()=>history.pushState({},'', '/c/changed'));await page.waitForFunction(()=>document.querySelector('gptgate-export-tools').shadowRoot.querySelector('.trigger').getAttribute('aria-expanded')==='false');checks++;
  // A replaced header receives one control; the body never keeps a floating badge.
  await page.evaluate(()=>{document.querySelector('header').innerHTML='<div data-testid="thread-header-right-actions-container"><button>Share</button></div>';});
  await page.waitForSelector('header gptgate-export-tools');assert.equal(await page.locator('gptgate-export-tools').count(),1);checks++;
  await page.emulateMedia({reducedMotion:'reduce'});await menu();assert.equal(await page.locator('.panel').evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Escape');checks++;
  // Cancel whole-conversation collection before it can open a preview.
  const before=context.pages().length;await menu();await page.locator('[data-action=all]').click();await page.locator('[data-action=cancel]').click();await page.waitForTimeout(700);assert.equal(context.pages().length,before);assert.ok(await trigger.evaluate(e=>e===e.getRootNode().activeElement));checks+=2;
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'pdf-controls.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(`PASS ${checks} PDF header, picker, keyboard, responsive, stale selection, cancellation and native-control checks.`);
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
