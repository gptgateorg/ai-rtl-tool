const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium,root,output}=require('./harness.cjs');
(async()=>{
 const dist=path.join(root,'dist');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-rtl-test-'));
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`],viewport:{width:390,height:600}});
 const errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
 try{
  const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host;
  await context.route(/^https?:/,route=>{
   const host=new URL(route.request().url()).hostname;
   if(!['chatgpt.com','gemini.google.com','claude.ai'].includes(host))return route.abort();
   return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><title>Isolated ${host} fixture</title></head><body><main><article data-message-author-role="assistant" class="font-claude-message markdown prose"><model-response><p id="persian">این یک متن فارسی برای آزمایش است.</p><p id="english">English explanation with Persian مثال.</p><p>فرمول <span class="katex" id="math">x + y = 2</span></p></model-response></article><textarea id="prompt-textarea" name="prompt-textarea">سلام Hello</textarea><button id="native">Native site control</button></main></body></html>`});
  });
  const sites=[];
  for(const host of ['chatgpt.com','gemini.google.com','claude.ai']){
   const page=await context.newPage();await page.goto(`https://${host}/`);
   await page.waitForFunction(()=>document.body.classList.contains('gptgate-math-fix'));
   sites.push(page);
  }
  const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(()=>!document.querySelector('#settings').disabled);
  await popup.locator('#respLtr').click();await popup.locator('#compRtl').click();
  for(const page of sites){
   await page.waitForFunction(()=>document.body.classList.contains('gptgate-ltr-response')&&document.body.classList.contains('gptgate-rtl-composer'));
   assert.equal(await page.locator('#native').textContent(),'Native site control');
   assert.equal(await page.locator('#math').evaluate(e=>getComputedStyle(e).direction),'ltr');
  }
  assert.equal(await popup.locator('#mathSwitch').isDisabled(),true);
  await popup.locator('#compLtr').click();
  await popup.locator('label.switch:has(#fontSwitch)').click();
  await popup.locator('label.switch:has(#mathSwitch)').click();
  await popup.waitForFunction(()=>document.querySelector('#settings').getAttribute('aria-busy')==='false');
  for(const page of sites)await page.waitForFunction(()=>!document.body.classList.contains('gptgate-math-fix'));
  const saved=await worker.evaluate(()=>chrome.storage.sync.get(null));
  assert.equal(saved.responseDir,'ltr');assert.equal(saved.composerDir,'ltr');assert.equal(saved.fontFix,false);assert.equal(saved.mathFix,false);
  await popup.close();
  const reopened=await context.newPage();await reopened.goto(`chrome-extension://${id}/popup.html`);
  await reopened.waitForFunction(()=>!document.querySelector('#settings').disabled);
  assert.equal(await reopened.locator('#respLtr').getAttribute('aria-pressed'),'true');assert.equal(await reopened.locator('#fontSwitch').isChecked(),false);
  // Stop the worker; popup and saved preferences must survive its restart.
  const cdp=await context.newCDPSession(reopened);await cdp.send('ServiceWorker.enable');await cdp.send('ServiceWorker.stopAllWorkers');
  await reopened.locator('#respAuto').click();
  for(const page of sites)await page.waitForFunction(()=>document.body.classList.contains('gptgate-auto-response'));
  await reopened.evaluate(()=>document.fonts.ready);await reopened.waitForTimeout(450);
  await reopened.screenshot({path:path.join(output,'real-extension.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'extension-results.json'),JSON.stringify({passed:true,platforms:3,realWorker:true,realStorage:true,fixtureOrigins:true,personalProfileUsed:false},null,2));
  console.log('PASS real MV3 build: 3 isolated site fixtures, worker, storage, broadcasting, reopen, worker suspension.');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
