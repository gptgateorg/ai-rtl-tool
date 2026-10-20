const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium,root,output}=require('./harness.cjs');
const dist=path.join(root,process.env.GPTGATE_ENGINE_DIST||'dist');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-site-engines-'));
const fixture=`<!doctype html><html data-mode="dark"><head><meta charset="utf-8"><style>:root,.cds-root{--cds-surface-1:#151515;--cds-page-bg:var(--cds-surface-1);--background-color-page:var(--cds-page-bg);--cds-surface-3:#20201f;--native-text:#f0efec}:root[data-mode=light],:root[data-mode=light] .cds-root,[data-mode=light].cds-root,[data-mode=light] .cds-root{--cds-surface-1:#faf9f5;--cds-page-bg:var(--cds-surface-1);--cds-surface-3:#fff;--native-text:#141413}main,.bg-page{background:var(--cds-page-bg)}body{background:var(--cds-surface-1);color:var(--native-text)}.bg-surface-3{background:var(--cds-surface-3)}.rounded-composer{border-radius:14px;padding:8px;max-width:768px;box-sizing:border-box}[contenteditable=true]{direction:ltr!important;min-height:44px;border:1px solid #888}rich-textarea{display:block}body{margin:0}.prose{padding:4px}</style></head><body><div class="cds-root" data-mode="dark"><main class="cds-root"><div class="cds-root bg-page" id="canvas"><div class="cds-root bg-page" id="popover" style="--cds-page-bg:var(--cds-surface-3)">Popover</div><div class="cds-root" data-mode="light"><div class="cds-root bg-page" id="light-island">Light panel</div></div>
${Array.from({length:40},(_,i)=>`<model-response><message-content><div class="prose markdown font-claude-message" id="answer-${i}"><p id="${i===0?'old':i===39?'live':'p-'+i}">سلام</p>${i===39?'<pre><code>const value = "سلام";</code></pre><span class="katex">x + y</span>':''}</div></message-content></model-response>`).join('')}
<rich-textarea class="rounded-composer bg-surface-3"><div contenteditable="true" role="textbox" data-testid="chat-input" class="tiptap ql-editor" id="editor"><p dir="auto"></p></div></rich-textarea><textarea id="textarea"></textarea><button id="native" class="bg-surface-3" style="background:var(--cds-surface-3)">Native</button></div></main></div></body></html>`;
(async()=>{
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`],viewport:{width:1000,height:800}});
 const report=[];
 try{
  await context.route(/^https?:/,route=>route.fulfill({contentType:'text/html',body:fixture}));
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  for(let i=0;i<100&&!await worker.evaluate(()=>!!globalThis.chrome?.storage?.sync);i++)await new Promise(r=>setTimeout(r,20));
  await worker.evaluate(()=>chrome.storage.sync.set({responseDir:'auto',composerDir:'auto',fontFix:true,fontFamily:'vazirmatn',fontWeight:400}));
  for(const host of ['claude.ai','gemini.google.com']){
   const service=host==='claude.ai'?'claude':'gemini';
   const page=await context.newPage();const cdp=await context.newCDPSession(page);let worlds=[];const errors=[];
   cdp.on('Runtime.executionContextCreated',e=>worlds.push(e.context));
   cdp.on('Runtime.executionContextDestroyed',e=>worlds=worlds.filter(c=>c.id!==e.executionContextId));
   cdp.on('Runtime.executionContextsCleared',()=>worlds=[]);
   cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
   await cdp.send('Runtime.enable');await cdp.send('Performance.enable');await page.goto(`https://${host}/`);
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#live')).direction==='rtl');
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1800);
   if(service==='claude'){
    const appearance=()=>page.evaluate(()=>{const box=document.querySelector('.rounded-composer'),s=getComputedStyle(box),r=box.getBoundingClientRect();return {page:getComputedStyle(document.body).backgroundColor,canvas:getComputedStyle(document.querySelector('#canvas')).backgroundColor,main:getComputedStyle(document.querySelector('main')).backgroundColor,popover:getComputedStyle(document.querySelector('#popover')).backgroundColor,lightIsland:getComputedStyle(document.querySelector('#light-island')).backgroundColor,box:{background:s.backgroundColor,color:s.color,width:r.width,height:r.height,radius:s.borderRadius},button:getComputedStyle(document.querySelector('#native')).backgroundColor}});
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('gptgate-claude-dark-surface')),false,'Fresh install preserves native theme');
    const native=await appearance();assert.equal(native.page,'rgb(21, 21, 21)');
    await worker.evaluate(()=>chrome.storage.sync.set({claudeDarkSurface:true}));
    await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(2, 2, 2)');
    const black=await appearance();assert.equal(black.canvas,'rgb(2, 2, 2)','Nested theme root must not hide the black canvas');assert.equal(black.main,'rgb(2, 2, 2)');assert.equal(black.popover,native.popover);assert.equal(black.lightIsland,'rgb(250, 249, 245)');assert.deepEqual(black.box,native.box,'Black canvas preserves native composer surface and geometry');assert.equal(black.button,native.button,'Native buttons preserve their surface');
    await page.bringToFront();
    assert.equal(await page.evaluate(()=>document.hidden),false);
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal((await appearance()).canvas,'rgb(2, 2, 2)','A storage-only theme update survives tab activation without popup broadcast');
    await worker.evaluate(()=>chrome.storage.sync.set({fontWeight:500}));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).fontWeight==='500');
    assert.equal((await appearance()).canvas,'rgb(2, 2, 2)','A later synced preference must not revert the synced theme');
    await worker.evaluate(()=>chrome.storage.sync.set({fontWeight:400}));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).fontWeight==='400');
    await page.evaluate(()=>document.documentElement.dataset.mode='light');
    const light=await appearance();assert.equal(light.page,'rgb(250, 249, 245)','Black preference must not override native light mode');assert.equal(light.box.background,'rgb(255, 255, 255)');assert.equal(light.canvas,'rgb(250, 249, 245)');
    await page.evaluate(()=>document.documentElement.dataset.mode='dark');
    await worker.evaluate(()=>chrome.storage.sync.set({claudeDarkSurface:false}));
    await page.waitForFunction(()=>!document.documentElement.classList.contains('gptgate-claude-dark-surface'));
    assert.deepEqual(await appearance(),native,'Turning off restores complete native appearance immediately');
   }
   let world;
   for(const candidate of worlds){const result=await cdp.send('Runtime.evaluate',{contextId:candidate.id,expression:'Boolean(window.__gptgate_loaded)',returnByValue:true});if(result.result.value)world=candidate;}
   assert.ok(world,'Extension isolated world exists');
   const doc=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:'document'});
   const {listeners}=await cdp.send('DOMDebugger.getEventListeners',{objectId:doc.result.objectId});
   assert.ok(listeners.some(l=>l.type==='visibilitychange'),'A disconnected worker port must not remove valid page listeners');
   const evaluate=async expression=>(await cdp.send('Runtime.evaluate',{contextId:world.id,expression,returnByValue:true,awaitPromise:true})).result.value;
   await evaluate(`(()=>{window.qa={documentQueries:0,oldReads:0,editorBindings:0};const bind=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,...args){if(this.id==='editor'&&['input','compositionend'].includes(type))qa.editorBindings++;return bind.call(this,type,...args)};const query=Document.prototype.querySelectorAll;Document.prototype.querySelectorAll=function(...args){qa.documentQueries++;return query.apply(this,args)};const descriptor=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');Object.defineProperty(Node.prototype,'textContent',{...descriptor,get(){if(this.id==='old'||this.id==='answer-0')qa.oldReads++;return descriptor.get.call(this)}});})()`);
   const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const start=await metrics();await page.waitForTimeout(3200);const idleEnd=await metrics();const idle=await evaluate('({...qa})');
   assert.equal(idle.documentQueries,0,`${service}: no repeated idle document queries`);
   await page.locator('#editor').fill('JavaScript برای آزمایش فارسی');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).direction==='rtl');
   assert.equal(await page.locator('#editor p').evaluate(e=>getComputedStyle(e).direction),'rtl','Native dir=auto paragraph inherits Persian composer direction');
   // Simulate the native editor replacing paragraphs after a keystroke. The
   // extension must not rewrite its attributes or start a mutation feedback loop.
   await page.evaluate(()=>{document.querySelector('#editor').innerHTML='<p dir="auto">JavaScript برای آزمایش فارسی</p>';window.nativeParagraphWrites=0;window.nativeObserver=new MutationObserver(ms=>nativeParagraphWrites+=ms.filter(m=>m.type==='attributes').length);nativeObserver.observe(document.querySelector('#editor p'),{attributes:true});});
   await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>nativeParagraphWrites),0,'Native paragraph attributes untouched');
   assert.equal(await page.locator('#editor p').evaluate(e=>getComputedStyle(e).direction),'rtl');
   await page.locator('#editor').fill('English draft');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).direction==='ltr');
   await page.locator('#textarea').fill('سلام');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#textarea')).direction==='rtl');
   await page.locator('#textarea').fill('word');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#textarea')).direction==='ltr');
   await page.locator('#live').evaluate(e=>e.textContent='word');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#live')).direction==='ltr');
   await page.locator('#live').evaluate(e=>e.textContent='سلام');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#live')).direction==='rtl');
   await page.waitForTimeout(400);await evaluate('qa.documentQueries=0;qa.oldReads=0');
   await page.evaluate(async()=>{for(let i=0;i<60;i++){document.querySelector('#live').firstChild.data+=' کلمه';await new Promise(requestAnimationFrame);}});
   const stream=await evaluate('({...qa})');assert.equal(stream.oldReads,0,`${service}: streaming must not revisit older messages`);
   await page.evaluate(()=>document.body.classList.add('native-theme-change'));await page.waitForTimeout(100);
   assert.equal((await evaluate('qa.oldReads')),0,`${service}: unrelated body class must not rescan answers`);
   await page.evaluate(()=>{const old=document.querySelector('#editor'),replacement=old.cloneNode(false);replacement.innerHTML='<p dir="auto">تازه</p>';old.replaceWith(replacement);});
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).direction==='rtl');
   await page.locator('#editor').fill('new English draft');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#editor')).direction==='ltr');
   const bindings=await evaluate('qa.editorBindings');assert.equal(bindings,2,'Replacement editor receives one listener per event');
   for(let i=0;i<3;i++){
    await page.evaluate(()=>{window.detachedEditor=document.querySelector('#editor');detachedEditor.remove();});await page.waitForTimeout(50);
    await page.evaluate(()=>document.querySelector('rich-textarea').append(detachedEditor));await page.waitForTimeout(50);
   }
   assert.equal(await evaluate('qa.editorBindings'),bindings,'Reinserting the same editor must not duplicate listeners');
   if(service==='gemini'){
    await page.evaluate(()=>{const e=document.querySelector('#editor');e.innerHTML='<p dir="auto">English draft</p><p dir="auto">این نوشته فارسی است</p>';e.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForTimeout(100);
    const alignment=await page.locator('#editor p').evaluateAll(es=>es.map(e=>{const range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),box=e.getBoundingClientRect();return {left:text.left-box.left,right:box.right-text.right};}));
    assert.ok(alignment[0].left<2&&alignment[0].right>100,'Auto English paragraph aligns left');
    assert.ok(alignment[1].right<2&&alignment[1].left>100,'Auto Persian paragraph aligns right');
   }
   for(const dir of ['rtl','ltr']){
    await worker.evaluate(dir=>chrome.storage.sync.set({responseDir:dir,composerDir:dir}),dir);
    await page.waitForFunction(dir=>getComputedStyle(document.querySelector('#live')).direction===dir&&getComputedStyle(document.querySelector('#editor')).direction===dir,dir);
    assert.equal(await page.locator('pre code').evaluate(e=>getComputedStyle(e).direction),'ltr');assert.equal(await page.locator('.katex').evaluate(e=>getComputedStyle(e).direction),'ltr');
   }
   await worker.evaluate(()=>chrome.storage.sync.set({responseDir:'auto',composerDir:'auto'}));
   assert.ok(!(await page.locator('#native').evaluate(e=>getComputedStyle(e).fontFamily)).includes('GPTGate'));
   assert.deepEqual(errors,[]);report.push({service,idleTaskMs:(idleEnd.TaskDuration-start.TaskDuration)*1000,idle,stream,nativeParagraphWrites:0,errors});await page.close();
  }
  fs.writeFileSync(path.join(output,'site-engines.json'),JSON.stringify(report,null,2));console.log('PASS Claude/Gemini idle scans, incremental streaming, equal-length replacements, native editor remount, textarea, direction changes, code/math and isolated-world errors');console.log(JSON.stringify(report));
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
