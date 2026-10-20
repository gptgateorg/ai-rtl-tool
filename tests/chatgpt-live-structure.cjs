const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {chromium,root,output}=require('./harness.cjs');
const title=(id,text,project=false)=>`<div class="sidebar-row" ${project?'data-app-action-sidebar-project-row':''}><svg class="row-icon"></svg><span ${project?'':'data-thread-title'} data-marquee-text id="${id}"><span class="clip"><span class="track"><span data-marquee-content><span dir="auto">${text}</span></span></span></span></span><button aria-label="Options">⋯</button></div>`;
const sidebar=`<style>body{margin:0;font-family:Arial}#app-shell-sidebar{width:280px;background:#161616;color:#eee;padding:8px;box-sizing:border-box;direction:ltr}.sidebar-row{display:flex;align-items:center;gap:8px;height:44px}.row-icon{width:20px;height:20px;flex:none}.sidebar-row button{flex:none;width:24px} [data-marquee-text]{min-width:0;flex:1;white-space:nowrap}.clip{display:block;overflow:hidden}.track{display:inline-flex;min-width:max-content}[data-marquee-content]{min-width:max-content}.sidebar-row:hover .track{transform:translateX(var(--test-scroll,0px))}</style>
<nav id="app-shell-sidebar">
${title('english-first','<bdi id="en-prefix">GPTGate</bdi><span id="fa-tail"> بازطراحی جدول</span>')}
${title('persian-first','<span id="fa-prefix">آزمایش نمایش فارسی </span><bdi id="en-tail">PDF</bdi>')}
${title('english-only','gate design')}
${title('project-title','درس فارسی',true)}
${title('long-title','<bdi>GPTGate</bdi> '+ 'گفتگوی طولانی '.repeat(15))}
</nav>`;
const reminders=`<style>#reminders{width:700px;max-width:100%;background:#161616;color:#ddd;font:400 16px/24px Arial}.reminder-row{position:relative}.reminder-content{display:flex;width:100%;align-items:center;gap:16px;padding:12px 44px 12px 8px;box-sizing:border-box;font:inherit;color:inherit;background:none;border:0;text-align:start}.reminder-icon{width:24px;flex:none}.reminder-text{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dismiss{position:absolute;right:8px;top:12px;width:24px}.overlay{position:absolute;inset:0;width:100%;background:none;border:0}.rich{position:relative;pointer-events:none}.rich a{pointer-events:auto;color:inherit}</style>
<section class="group/home-suggestions" id="reminders">
<div class="group/home-suggestion-list-item reminder-row"><button class="overlay" data-composer-mode="chat" id="reminder-open" aria-label="Open reminder"></button><div class="reminder-content rich" data-composer-mode="chat"><span class="reminder-icon" aria-hidden="true">↗</span><span class="truncate reminder-text" id="reminder-linked"><a href="https://example.test/pr/11" id="reminder-link">PR #11 ↗</a><span id="reminder-link-tail"> را بررسی کن</span></span></div><button class="dismiss" aria-label="Dismiss" id="reminder-dismiss">×</button></div>
<div class="group/home-suggestion-list-item reminder-row"><button class="reminder-content" data-composer-mode="chat" id="reminder-plain-button"><span class="reminder-icon" aria-hidden="true">🛍️</span><span class="truncate reminder-text" id="reminder-persian"><span id="reminder-lead">هر وقت </span><span id="reminder-token">4K</span> تخفیف داشت، خبر بده</span></button><button class="dismiss" aria-label="Dismiss">×</button></div>
<div class="group/home-suggestion-list-item reminder-row"><button class="reminder-content" data-composer-mode="chat"><span class="reminder-icon" aria-hidden="true">●</span><span class="truncate reminder-text" id="reminder-english">Catch me up on changes to my important files</span></button></div>
</section>`;
const fixture=sidebar+reminders+`<main><aside><div data-markdown-text-style="assistant-message">Activity summary, not an answer</div></aside><div data-chatgpt-search-message-ids="user-1"><div data-user-message-bubble="true"><div>سلام، یک تست ساده</div></div></div><div data-chatgpt-selection-message-id="assistant-1"><div data-markdown-text-style="assistant-message" id="old"><div data-dil-message-id="assistant-1"><p>پاسخ قبلی</p></div></div></div><div data-chatgpt-selection-message-id="assistant-2"><div data-markdown-text-style="assistant-message" id="stream"><div data-dil-message-id="assistant-2"><p id="live">Hello</p><ul><li id="item">English</li></ul><pre><code id="code">const n = 1;</code></pre></div></div></div><div class="ProseMirror" contenteditable="true" role="textbox"></div><button id="native">Native</button></main>`;
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
  await page.evaluate(()=>document.fonts.ready);
  const reminderResult=await page.evaluate(()=>{
   const rect=id=>document.getElementById(id).getBoundingClientRect();
   const elements=[...document.querySelectorAll('#reminders .reminder-text')];
   window.reminderActions=[];
   for(const id of ['reminder-link','reminder-open','reminder-dismiss','reminder-plain-button'])document.getElementById(id).addEventListener('click',e=>{e.preventDefault();window.reminderActions.push(id);});
   return{titles:elements.map(e=>({align:getComputedStyle(e).textAlign,bidi:getComputedStyle(e).unicodeBidi,font:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight})),
    persianOrder:rect('reminder-lead').left>=rect('reminder-token').right-1,
    linkFirst:rect('reminder-link').right<=rect('reminder-link-tail').left+1,
    iconX:document.querySelector('.reminder-icon').getBoundingClientRect().x,
    buttonDirection:getComputedStyle(document.querySelector('#reminder-plain-button')).direction,
    iconFont:getComputedStyle(document.querySelector('.reminder-icon')).fontFamily};
  });
  assert.equal(reminderResult.iconX,8);assert.equal(reminderResult.buttonDirection,'ltr');
  assert.ok(reminderResult.persianOrder);assert.ok(reminderResult.linkFirst);
  assert.ok(!reminderResult.iconFont.includes('GPTGate'));
  for(const title of reminderResult.titles){assert.equal(title.align,'right');assert.equal(title.bidi,'plaintext');assert.equal(title.weight,'400');assert.ok(title.font.includes('IranSans'));}
  await page.locator('#reminder-link').click();
  await page.locator('#reminder-plain-button').click();
  await page.locator('#reminder-dismiss').click();
  assert.deepEqual(await page.evaluate(()=>window.reminderActions),['reminder-link','reminder-plain-button','reminder-dismiss']);
  assert.equal(await page.locator('#reminder-link').getAttribute('href'),'https://example.test/pr/11');
  await page.locator('#reminders').screenshot({path:path.join(output,'home-reminders-desktop.png')});
  const sidebarGeometry=()=>page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   return {x:rect('#app-shell-sidebar').x,width:rect('#app-shell-sidebar').width,
    iconX:rect('.row-icon').x,menuX:rect('.sidebar-row button').x,
    englishPrefixFirst:rect('#en-prefix').right<=rect('#fa-tail').left+1,
    persianPrefixFirst:rect('#fa-prefix').left>=rect('#en-tail').right-1,
    shortRight:Math.abs(rect('#english-first .track').right-rect('#english-first .clip').right)<1,
    longStartVisible:Math.abs(rect('#long-title .track').left-rect('#long-title .clip').left)<1,
    projectRight:Math.abs(rect('#project-title .track').right-rect('#project-title .clip').right)<1,
    titleWeight:getComputedStyle(document.querySelector('#english-first')).fontWeight,
    nativeFont:getComputedStyle(document.querySelector('.sidebar-row button')).fontFamily};
  });
  const geometry=await sidebarGeometry();
  assert.equal(geometry.x,0);assert.equal(geometry.width,280);assert.equal(geometry.iconX,8);
  for(const key of ['englishPrefixFirst','persianPrefixFirst','shortRight','longStartVisible','projectRight'])assert.ok(geometry[key],key);
  assert.equal(geometry.titleWeight,'400');assert.ok(!geometry.nativeFont.includes('GPTGate'));
  await worker.evaluate(()=>chrome.storage.sync.set({fontFamily:'vazirmatn',fontWeight:900}));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#english-first')).fontFamily.includes('Vazirmatn'));
  assert.equal(await page.locator('#english-first').evaluate(e=>getComputedStyle(e).fontWeight),'400','Conversation weight must not make sidebar heavy');
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#app-shell-sidebar').screenshot({path:path.join(output,'sidebar-titles-desktop.png')});
  await page.setViewportSize({width:320,height:700});
  assert.ok(await page.locator('#reminders').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
  assert.equal(await page.locator('#reminder-persian').evaluate(e=>getComputedStyle(e).fontWeight),'400');
  await page.locator('#reminders').screenshot({path:path.join(output,'home-reminders-320.png')});
  assert.deepEqual(await sidebarGeometry(),geometry,'Sidebar and buttons must retain their placement across narrow viewport/font changes');
  await page.locator('#app-shell-sidebar').screenshot({path:path.join(output,'sidebar-titles-320.png')});
  // Native marquee transforms still work; oversized titles start at their normal leading edge.
  await page.locator('#long-title').evaluate(e=>e.closest('.sidebar-row').style.setProperty('--test-scroll','-40px'));
  await page.locator('#long-title').hover();
  assert.equal(await page.locator('#long-title .track').evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, -40, 0)');
  await worker.evaluate(()=>chrome.storage.sync.set({fontFix:false}));
  await page.waitForFunction(()=>!getComputedStyle(document.querySelector('#english-first')).fontFamily.includes('GPTGate'));
  assert.ok(!(await page.locator('#reminder-persian').evaluate(e=>getComputedStyle(e).fontFamily)).includes('GPTGate'));
  await worker.evaluate(()=>chrome.storage.sync.set({fontFix:true,fontFamily:'iransans',fontWeight:500}));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#english-first')).fontFamily.includes('IranSans'));
  await page.evaluate(()=>{const e=document.querySelector('#english-first');e.outerHTML=e.outerHTML.replace('GPTGate','AI');});
  await page.locator('#reminder-persian').evaluate(e=>e.textContent='یادآور جدید برای GPTGate');
  assert.equal(await page.locator('#reminder-persian').evaluate(e=>getComputedStyle(e).unicodeBidi),'plaintext');
  assert.ok((await sidebarGeometry()).englishPrefixFirst,'Dynamically replaced title must keep its English prefix without a rescan');
  await page.setViewportSize({width:1280,height:720});
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
