const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium,root,output,open}=require('./harness.cjs');
const ready=p=>p.waitForFunction(()=>!document.querySelector('#settings').disabled);
const saved=p=>p.waitForFunction(()=>document.querySelector('#settings').getAttribute('aria-busy')==='false');
(async()=>{
 const browser=await chromium.launch({channel:'chromium',headless:true});
 let checks=0;
 try{
  const {page,errors}=await open(browser);await ready(page);
  await page.locator('summary').click();
  for(const [family,weights] of [['iransans',9],['vazirmatn',9],['shabnam',5],['sahel',5]]){
   await page.selectOption('#fontFamily',family);await saved(page);
   assert.equal(await page.locator('#fontWeight option').count(),weights);
   await page.selectOption('#fontWeight','700');await saved(page);
   assert.equal(await page.evaluate(()=>fixture.saved.fontWeight),700);checks+=2;
  }
  await page.locator('#fontFile').setInputFiles({name:'fake.woff2',mimeType:'font/woff2',buffer:Buffer.from('not a font')});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('معتبر نیست'));checks++;
  await page.locator('#fontFile').setInputFiles({name:'large.ttf',mimeType:'font/ttf',buffer:Buffer.alloc(2*1024*1024+1)});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('۲ مگابایت'));checks++;
  await page.locator('#fontFile').setInputFiles(path.join(root,'fonts/Shabnam.woff2'));await saved(page);
  await page.waitForFunction(()=>fixture.saved.fontFamily==='custom');
  assert.equal(await page.locator('#fontWeight').isDisabled(),true);
  assert.ok(!(await page.evaluate(()=>JSON.stringify(fixture.saved))).includes('base64'));checks+=2;
  await page.reload();await ready(page);assert.equal(await page.locator('#fontFamily').inputValue(),'custom');
  await page.locator('summary').click();assert.ok((await page.locator('#fontNote').textContent()).includes('Shabnam'));
  await page.locator('#removeFont').click();await page.waitForFunction(()=>fixture.saved.fontFamily==='iransans');checks+=3;
  await page.evaluate(()=>fixture.faults.localSet=true);
  await page.locator('#fontFile').setInputFiles(path.join(root,'fonts/Shabnam.woff2'));
  await page.waitForFunction(()=>document.querySelector('#statusDot').classList.contains('error'));
  assert.equal(await page.locator('#fontFamily').inputValue(),'iransans');checks++;
  await page.evaluate(()=>{
    fixture.faults.localSet=false;
    const Original=window.FontFace;
    window.FontFace=function(...args){return args[0]==='GPTGate Upload Check'?{load:()=>new Promise((_,reject)=>window.rejectFont=reject)}:new Original(...args)};
  });
  await page.locator('#fontFile').setInputFiles(path.join(root,'fonts/Shabnam.woff2'));
  await page.waitForFunction(()=>typeof window.rejectFont==='function');
  await page.selectOption('#fontFamily','sahel');await saved(page);
  await page.evaluate(()=>rejectFont(Error('stale upload')));await page.waitForTimeout(50);
  assert.equal(await page.locator('#status').textContent(),'');checks++;
  assert.deepEqual(errors,[]);
  const moduleTests=await page.evaluate(async()=>{
   const {safeContent,collectConversation}=await import('/src/shared/export-content.js');
   const t=document.createElement('template');
   t.innerHTML='<p onclick="evil()">سلام <strong>پررنگ</strong></p><a href="javascript:evil()">bad</a><img src="https://evil.test/a" onerror="evil()"><script>evil()</script><iframe src="https://evil.test"></iframe><pre><code>const x = 1 &lt; 2;</code></pre><span class="katex"><span class="katex-mathml"><math><mfrac><mn>1</mn><mn>2</mn></mfrac></math></span><span class="katex-html">duplicate</span></span><gptgate-export-tools>UI</gptgate-export-tools><details open><summary>Details</summary><p>Expanded answer</p></details>';
   const out=document.createElement('div');out.append(safeContent(t.content));
   const sanitized=out.innerHTML;
   const huge=document.createElement('template');huge.innerHTML='<span>x</span>'.repeat(26000)+'END_OF_ANSWER';
   let limitError=false;try{safeContent(huge.content);}catch(e){limitError=e.message.includes('PDF ناقص');}

   const host=document.createElement('main');host.id='virtual';host.style.cssText='height:320px;overflow:auto;';
   const spacer=document.createElement('div');spacer.style.height='4800px';host.append(spacer);document.body.append(host);
   let modern=false;
   const render=()=>{
    const start=Math.floor(host.scrollTop/160);
    spacer.replaceChildren();
    for(let i=start;i<Math.min(30,start+4);i++){
     const a=document.createElement('article');a.dataset.messageAuthorRole=i%2?'assistant':'user';a.dataset.messageId=String(i);a.style.cssText=`position:absolute;top:${i*160}px`;
     a.textContent=i===8||i===12?'identical content':`Message ${i}`;
     if(modern){
      delete a.dataset.messageAuthorRole;delete a.dataset.messageId;
      if(i%2)a.dataset.markdownTextStyle='assistant-message';else a.dataset.userMessageBubble='true';
      a.dataset.chatgptSelectionConversationId='fixture';
      if(i%3===0)a.dataset.chatgptSelectionMessageId=String(i);
      else if(i%3===1)a.dataset.chatgptSearchMessageIds=String(i);
      else {const child=document.createElement('span');child.dataset.dilMessageId=String(i);child.textContent=a.textContent;a.replaceChildren(child);}
     }
     spacer.append(a);
    }
    if(start>=26)for(let i=30;i<32;i++){const hidden=document.createElement('article');hidden.hidden=true;hidden.dataset.messageAuthorRole='assistant';hidden.dataset.messageId=String(i);hidden.textContent=`Hidden ${i}`;spacer.append(hidden);}
   };
   spacer.style.position='relative';host.addEventListener('scroll',render);host.scrollTop=1000;render();
   const original=host.scrollTop;
   const result=await collectConversation({settleMs:20,maxMs:10000});
   const restored=host.scrollTop===original;
   modern=true;render();
   const modernResult=await collectConversation({settleMs:20,maxMs:10000});
   const abort=new AbortController();abort.abort();let cancelled=false;
   try{await collectConversation({signal:abort.signal});}catch(e){cancelled=e.name==='AbortError';}
   let capResult;host.scrollTop=0;render();
   capResult=await collectConversation({maxMs:800,settleMs:20});
   host.remove();
   const many=document.createElement('main');many.innerHTML=Array.from({length:501},(_,i)=>`<article data-message-author-role="assistant" data-message-id="m${i}">Message ${i}</article>`).join('');document.body.append(many);
   const messageCap=await collectConversation({maxMs:5000,settleMs:20});many.remove();
   return {sanitized,result,modernResult,restored,cancelled,capResult,limitError,messageCap};
  });
  assert.ok(!/onclick|onerror|<script|<iframe|javascript:|<img|gptgate-export-tools|duplicate/.test(moduleTests.sanitized));
  assert.equal(moduleTests.limitError,true);assert.ok(moduleTests.sanitized.includes('<details open="">'));
  assert.equal(moduleTests.messageCap.messages.length,500);assert.equal(moduleTests.messageCap.boundaryReached,false);checks+=4;
  assert.ok(moduleTests.sanitized.includes('<mfrac>'));assert.ok(moduleTests.sanitized.includes('const x'));
  assert.equal(moduleTests.result.messages.length,30);assert.equal(moduleTests.result.boundaryReached,true);
  assert.equal(moduleTests.result.messages.filter(m=>m.html==='identical content').length,2);
  assert.equal(moduleTests.modernResult.messages.length,30);
  assert.equal(moduleTests.modernResult.unstableIdentity,false);
  assert.deepEqual(moduleTests.modernResult.messages.map(m=>({role:m.role,text:m.html.replace(/<[^>]*>/g,'')})),moduleTests.result.messages.map(m=>({role:m.role,text:m.html})));checks+=3;
  assert.equal(moduleTests.result.unstableIdentity,false);assert.equal(moduleTests.restored,true);assert.equal(moduleTests.cancelled,true);assert.equal(moduleTests.capResult.boundaryReached,false);checks+=10;
  await page.close();
  const missing=await open(browser,{state:{fontFamily:'custom',fontWeight:400}});await ready(missing.page);await missing.page.locator('summary').click();
  assert.ok((await missing.page.locator('#fontNote').textContent()).includes('روی این دستگاه نیست'));checks++;
  await missing.page.close();
 }finally{await browser.close();}
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-features-'));
 const dist=path.join(root,'dist');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`],viewport:{width:1100,height:850}});
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 try{
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
  await context.route(/^https?:/,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><title>گفتگوی فارسی و کد</title><style>body{font:16px Arial;margin:24px}article{margin:12px}pre{font-family:monospace}.katex .special{font-family:serif}#native{font-family:Arial}</style></head><body><main><article data-message-author-role="user" data-message-id="u1"><p>سلام، یک مثال بزن</p></article><article data-message-author-role="assistant" data-message-id="a1" class="font-claude-message prose"><model-response><p id="persian">پاسخ فارسی <strong>پررنگ</strong></p><p dir="ltr">English paragraph</p><pre><code id="code">const example = 42;</code></pre><p class="katex"><span class="katex-mathml"><math display="block"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></span><span class="katex-html special">visual duplicate</span></p><details open><summary>توضیحات بیشتر</summary><p>جزئیات پاسخ در چاپ</p></details><table><tr><th>نام</th><th>مقدار</th></tr><tr><td>تست</td><td>۱۲۳</td></tr></table></model-response></article><textarea id="prompt-textarea">سلام</textarea><button id="native">Original UI</button></main></body></html>`}));
  const sites=[];
  for(const host of ['chatgpt.com','gemini.google.com','claude.ai']){
   const p=await context.newPage();await p.goto(`https://${host}/c/test`);await p.waitForFunction(()=>document.body.classList.contains('gptgate-use-font'));sites.push(p);
  }
  const site=sites[0];
  await site.waitForSelector('gptgate-export-tools[data-gptgate-export="conversation"]');
  assert.ok(await site.evaluate(async()=>{const faces=await document.fonts.load('12px GPTGateUI');return faces.length===1 && faces[0].status==='loaded';}));checks++;
  assert.equal(await site.locator('gptgate-export-tools').count(),1);checks++;
  const popup=await context.newPage();await popup.setViewportSize({width:390,height:600});await popup.goto(`chrome-extension://${id}/popup.html`);await ready(popup);await popup.locator('summary').click();
  for(const [family,computed] of [['iransans','IranSans'],['vazirmatn','Vazirmatn'],['shabnam','Shabnam'],['sahel','Sahel']]){
   await popup.selectOption('#fontFamily',family);await popup.selectOption('#fontWeight','700');await saved(popup);
   for(const p of sites){
    await p.waitForFunction(name=>getComputedStyle(document.querySelector('#persian')).fontFamily.includes(name),computed);
    assert.equal(await p.locator('#persian').evaluate(e=>getComputedStyle(e).fontWeight),'700');
    assert.ok(await p.locator('#persian').evaluate(async e=>{const s=getComputedStyle(e);const faces=await document.fonts.load(`${s.fontWeight} 16px ${s.fontFamily.split(',')[0]}`);return faces.length>0&&faces.every(f=>f.status==='loaded');}));checks++;

    assert.ok((await p.locator('#native').evaluate(e=>getComputedStyle(e).fontFamily)).includes('Arial'));
    assert.ok(!(await p.locator('#code').evaluate(e=>getComputedStyle(e).fontFamily)).includes('GPTGate'));
    assert.ok(!(await p.locator('.special').evaluate(e=>getComputedStyle(e).fontFamily)).includes('GPTGate'));checks+=4;
   }
  }
  await popup.locator('#fontFile').setInputFiles(path.join(root,'fonts/Shabnam.woff2'));
  for(const p of sites){await p.waitForFunction(()=>getComputedStyle(document.querySelector('#persian')).fontFamily.includes('Custom'));assert.ok(await p.evaluate(async()=>{const faces=await document.fonts.load('400 16px "GPTGate Custom"');return faces.length>0&&faces.every(f=>f.status==='loaded');}));checks++;}
  assert.ok(!(JSON.stringify(await worker.evaluate(()=>chrome.storage.sync.get(null)))).includes('base64'));checks+=2;
  await popup.selectOption('#fontFamily','vazirmatn');await popup.selectOption('#fontWeight','400');await saved(popup);
  await popup.evaluate(()=>document.fonts.ready);await popup.screenshot({path:path.join(output,'fonts-light.png'),fullPage:true});
  await popup.locator('#themeToggle').click();await popup.waitForTimeout(450);await popup.screenshot({path:path.join(output,'fonts-dark.png'),fullPage:true});
  await popup.setViewportSize({width:320,height:600});await popup.screenshot({path:path.join(output,'fonts-320.png'),fullPage:true});
  await site.evaluate(()=>{document.querySelector('#persian').append(' متن تازه');document.querySelector('main').append(document.createElement('div'));});
  await site.waitForTimeout(400);assert.equal(await site.locator('gptgate-export-tools').count(),1);checks++;
  let opened=context.waitForEvent('page');
  await site.getByRole('button',{name:'خروجی PDF',exact:true}).click();
  await site.locator('[data-action=select]').click();
  await site.locator('#persian').click();
  await site.getByRole('button',{name:'خروجی پاسخ انتخاب‌شده',exact:true}).click();
  let preview=await opened;await preview.waitForFunction(()=>!document.querySelector('#print')?.disabled);
  assert.equal(await preview.locator('.message').count(),1);assert.ok((await preview.locator('#messages').textContent()).includes('متن تازه'));
  assert.equal(await preview.locator('math mfrac').count(),1);assert.ok(!(await preview.locator('#messages').textContent()).includes('visual duplicate'));checks+=4;
  await preview.screenshot({path:path.join(output,'pdf-response.png'),fullPage:true});
  await preview.emulateMedia({media:'print'});assert.equal(await preview.locator('details').getAttribute('open'),'');assert.ok((await preview.locator('details').innerText()).includes('جزئیات'));checks++;
  await preview.pdf({path:path.join(output,'response-fa.pdf'),format:'A4',printBackground:true});await preview.emulateMedia({media:'screen'});
  await preview.evaluate(()=>{window.print=()=>window.printCalled=true;});await preview.locator('#print').click();assert.equal(await preview.evaluate(()=>window.printCalled),true);checks++;
  opened=context.waitForEvent('page');await site.getByRole('button',{name:'خروجی PDF',exact:true}).click();await site.locator('[data-action=all]').click();
  preview=await opened;await preview.waitForFunction(()=>!document.querySelector('#print')?.disabled);
  assert.equal(await preview.locator('.message').count(),2);assert.equal(await preview.locator('.role').first().textContent(),'شما');
  await preview.screenshot({path:path.join(output,'pdf-conversation.png'),fullPage:true});
  await preview.pdf({path:path.join(output,'conversation-fa.pdf'),format:'A4',printBackground:true});checks+=2;
  await site.evaluate(()=>{history.pushState({},'', '/c/other');document.querySelector('main').innerHTML='<article data-message-author-role="assistant" data-message-id="new"><p>گفتگوی جدید</p></article>';});
  await site.waitForSelector('gptgate-export-tools[data-gptgate-export="conversation"]');assert.equal(await site.locator('gptgate-export-tools').count(),1);checks++;
  await site.screenshot({path:path.join(output,'pdf-site-controls.png'),fullPage:true});
  await site.evaluate(()=>{document.querySelector('article').dataset.messageAuthorRole='user';document.querySelector('article p').firstChild.data='Reused user node';});
  await site.waitForFunction(()=>document.querySelectorAll('gptgate-export-tools[data-gptgate-export="response"]').length===0);
  await site.evaluate(()=>{document.querySelector('article').dataset.messageAuthorRole='assistant';document.querySelector('article p').firstChild.data='Reused assistant node';});
  await site.getByRole('button',{name:'خروجی PDF',exact:true}).click();await site.locator('[data-action=select]').click();await site.locator('article p').click();
  assert.equal(await site.locator('[data-gptgate-pdf-selected]').count(),1);await site.keyboard.press('Escape');checks+=2;
  // Session payloads from non-ChatGPT origins must be rejected.
  const rejected=await worker.evaluate(async()=>{
   const tabs=await chrome.tabs.query({url:'https://gemini.google.com/*'});
   const result=await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:()=>chrome.runtime.sendMessage({type:'gptgate:export-pdf',payload:{scope:'response',messages:[{role:'assistant',html:'bad'}]}})});
   return result[0].result;
  });assert.equal(rejected.ok,false);checks++;
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'features-results.json'),JSON.stringify({passed:true,checks,realMV3:true,isolatedSites:3,virtualizedMessages:30,pdfFiles:['response-fa.pdf','conversation-fa.pdf'],personalProfileUsed:false},null,2));
  console.log(`PASS ${checks} new-feature checks: font families/weights/upload/errors, sanitization, virtualized collection/cancel/cap, actual MV3 PDF previews and PDFs, SPA, native UI/code/math preservation.`);
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
