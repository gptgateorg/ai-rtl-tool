const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium,root,output,open}=require('./harness.cjs');
const referenceCSS=fs.readFileSync(path.join(__dirname,'fixtures/windows-settings.css'),'utf8');
const sourceHTML=fs.readFileSync(path.join(root,'popup.html'),'utf8');
const themeMarkup=sourceHTML.slice(sourceHTML.indexOf('<div class="theme-switcher"'),sourceHTML.indexOf('</header>'));
const tokens=['--bg','--surface','--surface-2','--surface-3','--brand','--accent','--action','--on-action','--text','--text-muted','--text-subtle','--radius-sm','--radius-md','--radius-lg','--motion-fast','--motion-base','--motion-slow','--ease-brand','--ease-sharp'];
async function reference(browser,theme,reduced){
 const page=await browser.newPage({viewport:{width:390,height:600},colorScheme:theme,reducedMotion:reduced?'reduce':'no-preference'});
 await page.setContent(`<html lang="en" dir="rtl"><head><style>${referenceCSS.replaceAll(/@font-face\s*\{[^}]*\}/g,'')}</style><style>body{padding:16px}.lang-switcher{width:208px}.sample{margin:20px 0}</style></head><body><div class="lang-switcher sample"><button>English</button><button>فارسی</button></div><label class="switch sample"><input id="refSwitch" type="checkbox"><span class="slider"></span></label>${themeMarkup}</body></html>`);
 await page.locator('.theme-switcher').evaluate(e=>delete e.dataset.motion);
 return page;
}
async function capture(page,selector,pseudo){return page.locator(selector).first().evaluate((el,pseudo)=>{
 const style=getComputedStyle(el,pseudo);return {transform:style.transform,transitionDuration:style.transitionDuration,transitionTimingFunction:style.transitionTimingFunction,width:style.width,height:style.height,background:style.backgroundColor,borderRadius:style.borderRadius};
},pseudo);}
async function sample(page,selector,pseudo,time){
 return page.evaluate(({selector,pseudo,time})=>{
  document.getAnimations().forEach(a=>{a.pause();a.currentTime=time;});
  return getComputedStyle(document.querySelector(selector),pseudo).transform;
 },{selector,pseudo,time});
}
(async()=>{const browser=await chromium.launch({channel:'chromium',headless:true});let checks=0;try{
 for(const theme of ['light','dark'])for(const reduced of [false,true]){
  const ref=await reference(browser,theme,reduced);const {page}=await open(browser,{theme,reduced});
  await page.waitForFunction(()=>!document.querySelector('#settings').disabled);
  const readTokens=(page)=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()])),tokens);
  assert.deepEqual(await readTokens(page),await readTokens(ref));checks+=tokens.length;
  await page.evaluate(()=>{
   document.documentElement.dataset.motion='pointer';document.querySelectorAll('[data-motion]').forEach(e=>e.dataset.motion='pointer');
   document.querySelector('.seg').style.width='308px';document.querySelector('.seg').dataset.value='ltr';document.querySelector('#mathSwitch').checked=false;
   document.querySelector('#themeToggle').setAttribute('aria-checked','false');
  });
  await page.waitForTimeout(450);
  // Settle the setup transition deterministically under concurrent CPU load.
  // The independent timeline comparisons below still sample the real curves.
  await Promise.all([page,ref].map(p=>p.evaluate(()=>document.getAnimations().forEach(a=>a.finish()))));
  for(const [actual,expected,pseudo] of [['.slider','.slider','::before'],['.slider','.slider','::after'],['.theme-toggle','.theme-toggle',null],['.theme-toggle-thumb','.theme-toggle-thumb',null]]){
   const a=await capture(page,actual,pseudo),b=await capture(ref,expected,pseudo);
   // The reduced-motion global fallback has 0s instead of Windows' 0.01ms; geometry remains exact.
   if(reduced){delete a.transitionDuration;delete b.transitionDuration;delete a.transitionTimingFunction;delete b.transitionTimingFunction;}
   assert.deepEqual(a,b,`${actual} ${pseudo} ${theme}`);checks++;
  }
  // Start the same movement in the source component and the port; freeze on each timeline sample.
  await ref.evaluate(()=>{document.documentElement.lang='fa';document.querySelector('#refSwitch').checked=true;document.querySelector('#themeToggle').setAttribute('aria-checked','true');});
  await page.evaluate(()=>{document.querySelector('.seg').dataset.value='auto';document.querySelector('#mathSwitch').checked=true;document.querySelector('#themeToggle').setAttribute('aria-checked','true');});
  await Promise.all([ref,page].map(p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>{document.getAnimations().forEach(a=>a.pause());r();})))));
  for(const t of [0,60,120,180,240,300,360,380])for(const [a,b,pseudo] of [['.seg','.lang-switcher','::before'],['.slider','.slider','::before'],['.slider','.slider','::after'],['.theme-toggle-thumb','.theme-toggle-thumb',null],['.theme-moon-cutout','.theme-moon-cutout',null],['.theme-sun-rays','.theme-sun-rays',null]]){
   const actual=await sample(page,a,pseudo,t),expected=await sample(ref,b,pseudo,t);
   assert.equal(actual,expected,`${theme} reduced=${reduced} ${a} @${t}`);checks++;
  }
  await ref.screenshot({path:path.join(output,`windows-controls-${theme}${reduced?'-reduced':''}.png`),fullPage:true});
  await ref.close();await page.close();
 }
 fs.writeFileSync(path.join(output,'motion-results.json'),JSON.stringify({passed:true,checks,source:'Windows settings CSS snapshot',adaptations:'2 to 3 equal columns; 0ms reduced motion'},null,2));
 console.log(`PASS ${checks} Windows token/geometry/motion samples in light, dark and reduced motion.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
