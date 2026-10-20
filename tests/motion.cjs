const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium,output,open}=require('./harness.cjs');
(async()=>{const browser=await chromium.launch({channel:'chromium',headless:true});let checks=0;try{
 for(const theme of ['light','dark'])for(const reduced of [false,true]){
  const {page}=await open(browser,{theme,reduced});
  await page.waitForFunction(()=>!document.querySelector('#settings').disabled);
  const typography=await page.locator('.control-copy label').first().evaluate(el=>({size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight}));
  assert.deepEqual(typography,{size:'13px',weight:'500'});checks++;
  assert.ok(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='IRANSansX'&&f.weight==='500'&&f.status==='loaded')));checks++;
  await page.evaluate(()=>{
   document.documentElement.dataset.motion='pointer';document.querySelectorAll('[data-motion]').forEach(e=>e.dataset.motion='pointer');
   document.querySelector('.seg').dataset.value='ltr';document.querySelector('#mathSwitch').checked=false;
   document.querySelector('#themeToggle').setAttribute('aria-checked','false');
   document.getAnimations().forEach(a=>a.finish());
  });
  await page.waitForTimeout(180);
  for(const [selector,width,height] of [['.switch',44,44],['.theme-toggle',64,44],['.theme-toggle-thumb',24,24],['.seg',null,44]]){
   const size=await page.locator(selector).first().boundingBox();if(width)assert.equal(size.width,width);assert.equal(size.height,height);checks++;
  }
  const results=await page.evaluate(async reduced=>{
   const targets=[['.seg','::before'],['.slider','::before'],['.theme-toggle-thumb',null]];
   const x=([selector,pseudo])=>new DOMMatrixReadOnly(getComputedStyle(document.querySelector(selector),pseudo).transform).m41;
   const start=targets.map(x);
   document.querySelector('.seg').dataset.value='auto';document.querySelector('#mathSwitch').checked=true;
   document.querySelector('#themeToggle').setAttribute('aria-checked','true');
   // Flush style before pausing actual browser transitions.
   targets.forEach(x);
   const animations=document.getAnimations();animations.forEach(a=>a.pause());
   const durations=animations.map(a=>a.effect.getTiming().duration);
   const samples=[0,30,75,150].map(time=>{animations.forEach(a=>a.currentTime=time);return targets.map(x);});
   // Interrupt a movement and return to its original state; no stuck indicator.
   animations.forEach(a=>a.currentTime=60);targets.forEach(x);
   document.querySelector('.seg').dataset.value='ltr';document.querySelector('#mathSwitch').checked=false;
   document.querySelector('#themeToggle').setAttribute('aria-checked','false');targets.forEach(x);
   document.getAnimations().forEach(a=>a.finish());
   return {start,durations,samples,returned:targets.map(x),segmentTravel:(document.querySelector('.seg').clientWidth-8)/3};
  },reduced);
  results.durations.forEach(duration=>assert.ok(duration<=150,`Slow transition ${duration}`));checks++;
  for(let i=0;i<3;i++){
   const end=[results.segmentTravel,-20,32][i];
   assert.ok(Math.abs(results.samples.at(-1)[i]-end)<.02,`Wrong endpoint ${i}`);
   assert.ok(Math.abs(results.returned[i])<.02,`Interrupted control stuck ${i}`);
   if(reduced)results.samples.forEach(row=>assert.ok(Math.abs(row[i]-end)<.02));
   else for(let j=1;j<results.samples.length;j++){
    assert.ok(Math.abs(results.samples[j][i])>=Math.abs(results.samples[j-1][i])-.01,'Motion reversed');
    assert.ok(Math.abs(results.samples[j][i])<=Math.abs(end)+.02,'Motion overshot');
   }
   checks+=3;
  }
  await page.close();
 }
 fs.writeFileSync(path.join(output,'motion-results.json'),JSON.stringify({passed:true,checks,contract:'Compact 150ms controls; real medium face; 44px hit targets; no overshoot; interruption; reduced motion',windowsSnapshot:'Preserved as historical reference; compact sizing supersedes exact geometry parity'},null,2));
 console.log(`PASS ${checks} compact typography, geometry, timeline, interruption and reduced-motion checks.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
