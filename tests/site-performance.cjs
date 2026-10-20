const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');
const {chromium,root,output}=require('./harness.cjs');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function measure(baseline){
 const dist=path.join(root,baseline?(process.env.GPTGATE_PERF_BASELINE||'artifacts/baseline-dist'):'dist');assert.ok(fs.existsSync(path.join(dist,'manifest.json')),'Build baseline first');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-perf-'));
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`],viewport:{width:1000,height:800}});
 try{
  await context.route(/^https?:/,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"></head><body><main>${Array.from({length:40},(_,i)=>`<article data-message-author-role="${i%2?'assistant':'user'}" data-message-id="${i}"><div class="markdown"><p>پیام شماره ${i} برای آزمایش کارایی افزونه.</p><p>English paragraph ${i}</p></div></article>`).join('')}<textarea id="prompt-textarea"></textarea></main></body></html>`}));
  const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  await page.goto('https://chatgpt.com/c/performance');await page.waitForFunction(()=>document.body.classList.contains('gptgate-use-font'));await page.waitForTimeout(1600);
  const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const start=await metrics();await page.waitForTimeout(1200);const idle=await metrics();
  const frames=await page.evaluate(async()=>{
   const text=document.querySelector('article:last-of-type p').firstChild;
   const samples=[];let previous=performance.now();
   for(let i=0;i<60;i++){text.data+=' کلمه';const now=await new Promise(requestAnimationFrame);samples.push(now-previous);previous=now;}
   return samples.slice(1).sort((a,b)=>a-b);
  });await page.waitForTimeout(200);const active=await metrics();
  const tools=await page.locator('gptgate-export-tools').count();
  // Extension resource timings are hidden from the host page. Inspect real
  // loaded FontFaces instead of interpreting an empty timing list as success.
  const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,weight:f.weight})));
  if(!baseline){
   assert.equal(tools,1);
   assert.ok(fonts.some(f=>f.family==='GPTGate IranSans'&&f.weight==='500'),'Selected conversation face did not load');
   assert.ok(fonts.some(f=>f.family==='GPTGateUI'),'PDF controls UI face did not load');
   assert.ok(!fonts.some(f=>/Shabnam|Vazirmatn|Sahel/.test(f.family)),'Unused font family loaded');
  }
  return {idleTaskMs:(idle.TaskDuration-start.TaskDuration)*1000,streamTaskMs:(active.TaskDuration-idle.TaskDuration)*1000,streamLayoutMs:(active.LayoutDuration-idle.LayoutDuration)*1000,frameP95Ms:frames[Math.floor(frames.length*.95)],tools,fonts};
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
}
(async()=>{
 const samples={baseline:[],current:[]};
 for(let i=0;i<5;i++)for(const name of i%2?['current','baseline']:['baseline','current'])samples[name].push(await measure(name==='baseline'));
 const summary=Object.fromEntries(Object.entries(samples).map(([name,rows])=>[name,Object.fromEntries(['idleTaskMs','streamTaskMs','streamLayoutMs','frameP95Ms'].map(k=>[k,+median(rows.map(r=>r[k])).toFixed(3)]))]));
 fs.writeFileSync(path.join(output,'site-performance.json'),JSON.stringify({method:'5 alternating pairs in isolated MV3 Chromium; 40 messages; 1.2s idle; 60 streamed updates; medians',summary,samples},null,2));console.log(JSON.stringify(summary,null,2));
 assert.ok(summary.current.idleTaskMs<summary.baseline.idleTaskMs+2,'Site idle regression');
 assert.ok(summary.current.streamTaskMs<summary.baseline.streamTaskMs*1.10+2,'Site streaming regression');
 assert.ok(summary.current.frameP95Ms<=summary.baseline.frameP95Ms+5,'Site frame regression');
 console.log('PASS site idle/streaming budgets and unused-font loading checks (synthetic fixture).');
})().catch(e=>{console.error(e);process.exitCode=1});
