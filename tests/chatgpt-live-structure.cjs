const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {chromium,root,output}=require('./harness.cjs');
const fixture=`<main><aside><div data-markdown-text-style="assistant-message">Activity summary, not an answer</div></aside><div data-chatgpt-search-message-ids="user-1"><div data-user-message-bubble="true"><div>سلام، یک تست ساده</div></div></div><div data-chatgpt-selection-message-id="assistant-1"><div data-markdown-text-style="assistant-message" id="old"><div data-dil-message-id="assistant-1"><p>پاسخ قبلی</p></div></div></div><div data-chatgpt-selection-message-id="assistant-2"><div data-markdown-text-style="assistant-message" id="stream"><div data-dil-message-id="assistant-2"><p id="live">Hello</p><ul><li id="item">English</li></ul><pre><code id="code">const n = 1;</code></pre></div></div></div><div class="ProseMirror" contenteditable="true" role="textbox"></div><button id="native">Native</button></main>`;
(async()=>{
 const dist=path.join(root,'dist');const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-live-structure-'));
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`]});const errors=[];
 try{
  await context.route(/^https?:/,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body>'+fixture+'</body></html>'}));
  const page=await context.newPage(),cdp=await context.newCDPSession(page);let worlds=[];
  cdp.on('Runtime.executionContextCreated',e=>worlds.push(e.context));
  cdp.on('Runtime.executionContextDestroyed',e=>worlds=worlds.filter(c=>c.id!==e.executionContextId));
  cdp.on('Runtime.executionContextsCleared',()=>worlds=[]);
  cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
  cdp.on('Runtime.consoleAPICalled',e=>{if(e.type==='error')errors.push(e.args.map(a=>a.value||a.description).join(' '));});
  await cdp.send('Runtime.enable');await page.goto('https://chatgpt.com/c/live-structure');
  await page.waitForFunction(()=>document.querySelectorAll('gptgate-export-tools').length===1);
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');await worker.evaluate(()=>chrome.storage.sync.set({responseDir:'auto',composerDir:'auto'}));
  await page.waitForFunction(()=>document.querySelector('#live').dir==='ltr');
  // Real ChatGPT hydration can replace body after the content script initializes.
  await page.evaluate(html=>{const body=document.createElement('body');body.innerHTML=html;document.body.replaceWith(body);},fixture);
  await page.waitForFunction(()=>document.body.classList.contains('gptgate-use-font')&&document.querySelectorAll('gptgate-export-tools').length===1);
  await page.evaluate(()=>document.body.className='host-theme');
  await page.waitForFunction(()=>document.body.classList.contains('gptgate-use-font'));
  assert.ok(await page.locator('#live').evaluate(e=>getComputedStyle(e).fontFamily.includes('GPTGate IranSans')));
  assert.ok(!(await page.locator('#native').evaluate(e=>getComputedStyle(e).fontFamily)).includes('GPTGate'));
  let world;
  for(const context of worlds){const result=await cdp.send('Runtime.evaluate',{contextId:context.id,expression:'Boolean(window.__gptgate_chatgpt_engine)',returnByValue:true});if(result.result.value)world=context;}
  assert.ok(world,'Content-script isolated world not found');
  await cdp.send('Runtime.evaluate',{contextId:world.id,expression:`window.oldScans=0;const originalQuery=Element.prototype.querySelectorAll;Element.prototype.querySelectorAll=function(...args){if(this.id==='old')window.oldScans++;return originalQuery.apply(this,args)}`});
  await page.evaluate(async()=>{
   for(let i=0;i<12;i++){
    const p=document.querySelector('#live');if(i%2)p.textContent='سلام '+i;else p.firstChild.data='Hello '+i;
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   }
   document.querySelector('#item').textContent='مورد فارسی';
   document.querySelector('#code').textContent='توضیح فارسی';
   document.querySelector('[contenteditable]').outerHTML='<div class="ProseMirror" contenteditable="true" role="textbox">سلام</div>';
  });
  await page.waitForFunction(()=>document.querySelector('#live').dir==='rtl'&&document.querySelector('ul').dir==='rtl'&&document.querySelector('[contenteditable]').dir==='rtl');
  await page.waitForFunction(()=>document.querySelector('pre').dir==='rtl');
  const scans=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:'window.oldScans',returnByValue:true});assert.equal(scans.result.value,0,'Stream rescanned an unchanged earlier response');
  await page.evaluate(()=>document.querySelector('#stream').innerHTML='<p>پاسخ جایگزین</p>');
  await page.waitForFunction(()=>document.querySelector('#stream p').dir==='rtl');assert.equal(await page.locator('#stream gptgate-export-tools').count(),0);
  // Native role changes, visibility and new DIL response roots remain discoverable.
  await page.evaluate(()=>{document.querySelector('#stream').hidden=true;const el=document.createElement('div');el.id='new';el.setAttribute('data-chatgpt-selection-message-id','assistant-3');el.setAttribute('data-markdown-text-style','assistant-message');el.innerHTML='<p>پاسخ تازه</p>';document.querySelector('main').append(el);});
  await page.waitForFunction(()=>document.querySelector('#new p').dir==='rtl');
  await page.evaluate(()=>document.querySelector('#stream').hidden=false);
  await page.waitForTimeout(300);assert.equal(await page.locator('gptgate-export-tools[data-gptgate-export="conversation"]').count(),1);
  const capture=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:`(async()=>{const m=await import(chrome.runtime.getURL('src/shared/export-content.js'));return m.messageElements().map(e=>({role:m.captureMessage(e).role,html:m.captureMessage(e).html}))})()`,awaitPromise:true,returnByValue:true});
  assert.deepEqual(capture.result.value.map(x=>x.role),['user','assistant','assistant','assistant']);assert.ok(capture.result.value.every(x=>!x.html.includes('gptgate-export-tools')));
  assert.deepEqual(errors,[],'Isolated-world errors must not be hidden by Playwright pageerror');
  fs.writeFileSync(path.join(output,'chatgpt-live-structure.json'),JSON.stringify({passed:true,bodyReplacement:true,classReset:true,newRenderer:true,oldResponseRescans:0,isolatedErrors:errors},null,2));
  console.log('PASS current ChatGPT renderer, hydration, font scope, streamed text/list/code, composer replacement, PDF discovery and isolated-world errors.');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
