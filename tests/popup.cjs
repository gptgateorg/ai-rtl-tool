const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,open,output}=require('./harness.cjs');
const waitReady=page=>page.waitForFunction(()=>!document.querySelector('#settings').disabled && !document.querySelector('#status').textContent.includes('خواندن'));
const waitSaved=page=>page.waitForFunction(()=>document.querySelector('#settings').getAttribute('aria-busy')==='false');
(async()=>{
 const browser=await chromium.launch({channel:'chromium',headless:true});
 let checks=0;
 try {
  for(const theme of ['light','dark']) for(const platform of ['chatgpt.com','gemini.google.com','claude.ai']){
   const {page,errors}=await open(browser,{theme,url:`https://${platform}/`});await waitReady(page);
   assert.equal(await page.locator('#respRtl').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#compAuto').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#claudeThemeRow').isVisible(),true);
   assert.equal(await page.locator('#claudeThemeSwitch').isChecked(),false,'Native Claude appearance is the fresh-install default');
   for(const group of ['resp','comp'])for(const value of ['Ltr','Auto','Rtl']){
    await page.locator('#'+group+value).click();await waitSaved(page);
    assert.equal(await page.locator('#'+group+value).getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(key=>fixture.saved[key],group==='resp'?'responseDir':'composerDir'),value.toLowerCase()); checks++;
   }
   assert.equal(await page.locator('#mathSwitch').isDisabled(),true);
   await page.locator('#respAuto').click();await page.locator('#compAuto').click();await waitSaved(page);
   for(const id of ['mathSwitch','fontSwitch','claudeThemeSwitch']){
    await page.locator(`label.switch:has(#${id})`).click();await waitSaved(page);
    assert.equal(await page.locator('#'+id).isChecked(),id==='claudeThemeSwitch');
    await page.reload();await waitReady(page);assert.equal(await page.locator('#'+id).isChecked(),id==='claudeThemeSwitch');checks++;
   }
   // Popup-only theme never broadcasts or changes any content preference.
   const before=await page.evaluate(()=>({saved:{...fixture.saved},sends:fixture.calls.filter(c=>c.name==='send').length}));
   await page.locator('#themeToggle').click();await page.waitForTimeout(420);
   assert.equal(await page.locator('#themeToggle').getAttribute('aria-checked'),String(theme==='light'));
   assert.deepEqual(await page.evaluate(()=>fixture.saved),before.saved);
   assert.equal(await page.evaluate(()=>fixture.calls.filter(c=>c.name==='send').length),before.sends);
   await page.reload();await waitReady(page);
   assert.equal(await page.locator('#themeToggle').getAttribute('aria-checked'),String(theme==='light'));checks++;
   assert.deepEqual(errors,[]);await page.close();
  }
  for(const options of [{theme:'light'},{theme:'dark'},{theme:'light',url:'https://claude.ai/'},{theme:'dark',width:320},{theme:'light',forced:true},{theme:'dark',reduced:true}]){
   const {page,errors}=await open(browser,options);await waitReady(page);await page.waitForTimeout(450);
   const size=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,height:document.documentElement.scrollHeight}));
   assert.ok(size.width<=size.viewport,JSON.stringify(size));
   const sizes=await page.locator('.seg-btn,.switch,.theme-toggle,.community-link').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height]));
   sizes.forEach(([w,h])=>assert.ok(w>=44 && h>=44,`small target ${w}x${h}`));
   const name=`${options.theme}-${options.url?'claude':options.width||390}${options.forced?'-forced':''}${options.reduced?'-reduced':''}`;
   await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
   await page.locator('#compLtr').focus();await page.keyboard.press('Enter');await waitSaved(page);
   assert.equal(await page.locator('html').getAttribute('data-motion'),'instant');
   assert.equal(await page.locator('#compLtr').getAttribute('aria-pressed'),'true');
   await page.locator('#fontSwitch').focus();await page.keyboard.press('Space');await waitSaved(page);
   assert.equal(await page.locator('#fontSwitch').isChecked(),false);
   const duration=await page.locator('.slider').first().evaluate(el=>getComputedStyle(el,'::before').transitionDuration);
   assert.equal(duration,'0s');assert.deepEqual(errors,[]);checks+=4;await page.close();
  }
  for(const scenario of [
   {name:'legacy',state:{rtlResponses:false,rtlComposer:true},expected:['auto','rtl']},
   {name:'modern-wins',state:{rtlResponses:false,responseDir:'rtl',composerDir:'ltr'},expected:['rtl','ltr']},
   {name:'invalid',state:{responseDir:'broken',composerDir:'invalid'},expected:['rtl','auto']},
  ]){
   const {page}=await open(browser,scenario);await waitReady(page);
   assert.deepEqual(await page.locator('.seg').evaluateAll(els=>els.map(e=>e.dataset.value)),scenario.expected);
   await page.locator('label.switch:has(#fontSwitch)').click();await waitSaved(page);
   assert.equal(await page.evaluate(()=>('rtlResponses'in fixture.saved)||('rtlComposer'in fixture.saved)),false);checks++;await page.close();
  }
  const failures=[
   {faults:{get:true},match:'خوانده نشد',action:'load'},
   {faults:{set:true},match:'ذخیره نشد'},
   {faults:{send:true,inject:true},match:'تب سایت را تازه'},
   {faults:{query:true},match:'ارتباط با تب‌ها'},
   {granted:false,match:'دسترسی'},
   {tabs:[],match:'ChatGPT، Gemini'},
   {url:'https://chatgpt.com.evil.test/',match:'ChatGPT، Gemini'},
  ];
  for(const scenario of failures){
   const {page,errors}=await open(browser,scenario);
   if(scenario.action!=='load'){await waitReady(page);await page.locator('#compLtr').click();}
   await page.waitForFunction(text=>document.querySelector('#status').textContent.includes(text),scenario.match);
   if(scenario.faults?.set){
    await page.waitForTimeout(450);
    await page.screenshot({path:path.join(output,'light-error.png'),fullPage:true});
    const contrast=await page.evaluate(()=>{
     const luminance=color=>{const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
     const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
     const status=getComputedStyle(document.querySelector('.status-row')),button=getComputedStyle(document.querySelector('#retryBtn'));
     return [ratio(status.color,getComputedStyle(document.body).backgroundColor),ratio(button.color,button.backgroundColor)];
    });
    contrast.forEach(value=>assert.ok(value>=4.5,`Error text contrast ${value}`));
   }
   if(scenario.faults){
    assert.equal(await page.locator('#retryBtn').isVisible(),true);
    await page.evaluate(()=>fixture.faults={});await page.locator('#retryBtn').click();
    if(scenario.action==='load')await waitReady(page);else await waitSaved(page);
   }
   assert.deepEqual(errors,[]);checks++;await page.close();
  }
  {const {page}=await open(browser,{faults:{send:true}});await waitReady(page);await page.locator('#compLtr').click();await waitSaved(page);
   assert.ok(await page.evaluate(()=>fixture.calls.some(c=>c.name==='inject'&&c.args.files[0]==='src/chatgpt/content.js')));checks++;await page.close();}
  {const {page}=await open(browser,{delay:20,tabs:[{id:1,url:'https://chatgpt.com/'},{id:2,url:'https://gemini.google.com/'},{id:3,url:'https://claude.ai/'}]});await waitReady(page);
   await page.evaluate(()=>{for(let i=0;i<12;i++)document.querySelector(i%2?'#respLtr':'#respAuto').click(); document.querySelector('#compRtl').click();});
   await waitSaved(page);await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>fixture.saved.responseDir),'ltr');assert.equal(await page.evaluate(()=>fixture.saved.composerDir),'rtl');
   for(const id of [1,2,3]){const last=await page.evaluate(id=>fixture.calls.filter(c=>c.name==='send'&&c.args.id===id).at(-1)?.args.msg.state,id);assert.equal(last.responseDir,'ltr');assert.equal(last.composerDir,'rtl');}checks+=5;await page.close();}
  {const {page}=await open(browser);await waitReady(page);
   await page.evaluate(()=>{const original=chrome.tabs.sendMessage;let first=true;chrome.tabs.sendMessage=(...args)=>{if(first){first=false;window.firstSendStarted=true;return new Promise(resolve=>window.releaseFirstSend=()=>resolve({ok:true}));}return original(...args);};});
   await page.locator('#respLtr').click();await page.waitForFunction(()=>window.firstSendStarted);
   await page.locator('#respAuto').click();await page.waitForFunction(()=>fixture.saved.responseDir==='auto');
   await waitSaved(page);assert.equal(await page.locator('#status').textContent(),'');
   await page.evaluate(()=>window.releaseFirstSend());await page.waitForTimeout(30);
   assert.equal(await page.locator('#respAuto').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#status').textContent(),'');checks+=3;await page.close();}
  console.log(`PASS ${checks} popup checks: platforms, preferences, persistence, motion accessibility, error recovery, rapid input.`);
  fs.writeFileSync(path.join(output,'popup-results.json'),JSON.stringify({checks,passed:true},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
