const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {chromium,root,output,open}=require('./harness.cjs');
const KEY='gptgate:first-use-tips';
async function workerContract(){
 let installed,message;const saved={},injections=[];
 const chrome={runtime:{onInstalled:{addListener:f=>installed=f},onMessage:{addListener:f=>message=f},getManifest:()=>({content_scripts:[{matches:['https://chatgpt.com/*'],js:['assets/content-hashed.js']}]})},storage:{local:{get:async key=>({[key]:saved[key]}),set:async v=>Object.assign(saved,v)}},tabs:{query:async()=>[{id:1,url:'https://chatgpt.com/c/test'}],onActivated:{addListener(){}},onUpdated:{addListener(){}}},scripting:{executeScript:async v=>injections.push(v)}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),{chrome,URL,console});
 const claim=surface=>new Promise(resolve=>message({type:'gptgate:claim-tip',surface},{},resolve));
 installed({reason:'install'});const results=await Promise.all([claim('pdf'),claim('pdf'),claim('pdf')]);assert.equal(results.filter(x=>x.show).length,1);assert.equal((await claim('popup')).show,true);
 installed({reason:'update'});assert.equal((await claim('popup')).show,false);assert.equal((await claim('pdf')).show,false);assert.ok(injections.every(i=>i.files[0]==='assets/content-hashed.js'));
}
(async()=>{
 await workerContract();
 const browser=await chromium.launch({channel:'chromium',headless:true});
 try{
   const {page}=await open(browser);
   await page.evaluate(async()=>{
     document.querySelector('main').innerHTML='<article data-message-author-role="assistant"><p>Answer</p></article><textarea id="draft"></textarea><button id="idle">Idle</button>';
     chrome.runtime.sendMessage=()=>new Promise(resolve=>window.resolveTip=resolve);
     const module=await import('/src/chatgpt/pdf-export.js');window.syncTip=module.syncExportUI;module.syncExportUI();
   });
   await page.waitForFunction(()=>!!window.resolveTip);await page.locator('#draft').focus();await page.evaluate(()=>window.resolveTip({show:true}));
   await page.waitForTimeout(30);assert.equal(await page.locator('.gptgate-tip').count(),0);
   await page.locator('#idle').focus();await page.waitForSelector('.gptgate-tip');assert.equal(await page.evaluate(()=>document.activeElement.id),'idle');
 }finally{await browser.close();}
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-tips-')),dist=path.join(root,'dist');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`]});const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 try{
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
  for(let i=0;i<50&&!await worker.evaluate(()=>!!globalThis.chrome?.storage?.local);i++)await new Promise(r=>setTimeout(r,50));
  await worker.evaluate(key=>chrome.storage.local.set({[key]:{popup:true,pdf:true}}),KEY);
  await context.route(/^https?:/,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>header{height:52px;display:flex;justify-content:flex-end}main{padding:32px}</style></head><body><header><div data-testid="thread-header-right-actions-container"></div></header><main><article data-message-author-role="assistant" data-message-id="a"><p>پاسخ فارسی</p></article><textarea id="composer" autofocus>Draft</textarea><button id="native">Native</button></main></body></html>'}));
  const page=await context.newPage();await page.goto('https://chatgpt.com/c/tips');await page.waitForSelector('gptgate-export-tools');await page.waitForTimeout(250);assert.equal(await page.locator('.gptgate-tip').count(),0,'Do not interrupt typing');
  await page.locator('#native').focus();await page.waitForSelector('.gptgate-tip');assert.equal(await page.evaluate(()=>document.activeElement.id),'native','Automatic hint must not steal focus');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(170);await page.screenshot({path:path.join(output,'tips-chatgpt.png')});
  await page.locator('.gptgate-tip button').filter({hasText:'رد کردن'}).click();assert.equal(await page.locator('.gptgate-tip').count(),0);
  await page.reload();await page.waitForSelector('gptgate-export-tools');await page.locator('#native').focus();await page.waitForTimeout(200);assert.equal(await page.locator('.gptgate-tip').count(),0);
  await page.getByRole('button',{name:'خروجی PDF',exact:true}).click();await page.locator('[data-action=help]').click();await page.waitForSelector('.gptgate-tip');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('gptgate-export-tools').shadowRoot.querySelector('.gptgate-tip'));assert.ok(await page.locator('.trigger').evaluate(e=>e===e.getRootNode().activeElement));
  const before=await worker.evaluate(()=>chrome.storage.sync.get(null));
  const popup=await context.newPage();await popup.setViewportSize({width:390,height:600});await popup.goto(`chrome-extension://${id}/popup.html`);await popup.waitForSelector('.gptgate-tip');
  assert.ok((await popup.locator('.gptgate-tip h2').textContent()).includes('جهت'));assert.equal(await popup.locator('#fontSettings').getAttribute('open'),null);await popup.evaluate(()=>document.fonts.ready);await popup.waitForTimeout(170);await popup.screenshot({path:path.join(output,'tips-popup-390.png'),fullPage:true});
  await popup.locator('[data-tip-next]').click();assert.ok((await popup.locator('.gptgate-tip h2').textContent()).includes('فونت'));await popup.setViewportSize({width:320,height:600});await popup.locator('#themeToggle').click();await popup.waitForTimeout(170);await popup.screenshot({path:path.join(output,'tips-font-320-dark.png'),fullPage:true});assert.equal(await popup.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await popup.locator('[data-tip-next]').click();assert.ok((await popup.locator('.gptgate-tip p').textContent()).includes('همیشه روشن'));await popup.locator('[data-tip-next]').click();assert.equal(await popup.locator('.gptgate-tip').count(),0);
  await popup.reload();await popup.waitForFunction(()=>!document.querySelector('#settings').disabled);await popup.waitForTimeout(200);assert.equal(await popup.locator('.gptgate-tip').count(),0);
  await popup.locator('#helpBtn').click();await popup.keyboard.press('Escape');assert.equal(await popup.locator('.gptgate-tip').count(),0);assert.equal(await popup.evaluate(()=>document.activeElement.id),'helpBtn');
  const after=await worker.evaluate(()=>chrome.storage.sync.get(null));assert.deepEqual(after,before,'Tour must not change settings');assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'tips-results.json'),JSON.stringify({passed:true,installOnly:true,atomicClaim:true,hashedInjection:true,noFocusTheft:true,noPreferenceChanges:true,skipReplay:true},null,2));
  console.log('PASS first-install vs update, concurrent claim, typing/focus preservation, popup steps, skip/replay and settings preservation.');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
