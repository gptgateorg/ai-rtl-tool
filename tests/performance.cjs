const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {chromium,root,output,open}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
const baseline=path.join(root,'artifacts/baseline');
if(!fs.existsSync(path.join(baseline,'popup.html'))){fs.mkdirSync(baseline,{recursive:true});execFileSync('tar',['-x','-C',baseline],{input:execFileSync('git',['archive','244006e'],{cwd:root})});}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function measure(browser,baseline){
 const {page}=await open(browser,{baseline});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 // Measure from a fresh navigation after instrumentation, with local font caching equivalent on both sides.
 await page.reload();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(550);
 const nav=await page.evaluate(()=>{
  const n=performance.getEntriesByType('navigation')[0];return {domMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd,bytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.decodedBodySize,0)+n.decodedBodySize};
 });
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const before=await metrics();await page.waitForTimeout(1000);const idle=await metrics();
 // The baseline and port both use the same three-option response control.
 await page.evaluate(()=>{window.frameSamples=[];let last=performance.now();const end=last+800;function tick(now){frameSamples.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);}requestAnimationFrame(tick);});
 await page.locator('#respLtr').click();await page.waitForTimeout(850);const active=await metrics();
 const frames=await page.evaluate(()=>frameSamples.slice(1));
 const result={...nav,idleTaskMs:(idle.TaskDuration-before.TaskDuration)*1000,interactionTaskMs:(active.TaskDuration-idle.TaskDuration)*1000,interactionLayoutMs:(active.LayoutDuration-idle.LayoutDuration)*1000,frameP95Ms:[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)]};
 await page.close();return result;
}
(async()=>{const browser=await chromium.launch({channel:'chromium',headless:true});try{
 await measure(browser,true);await measure(browser,false);const samples={baseline:[],port:[]};
 for(let i=0;i<7;i++)for(const name of (i%2?['port','baseline']:['baseline','port']))samples[name].push(await measure(browser,name==='baseline'));
 const summary=Object.fromEntries(Object.entries(samples).map(([name,rows])=>[name,Object.fromEntries(Object.keys(rows[0]).map(key=>[key,Number(median(rows.map(r=>r[key])).toFixed(3))]))]));
 const result={browser:browser.version(),method:'7 alternating paired runs after warmup; local source routing; 1 second idle; 800ms RAF interaction; medians',summary,samples};
 fs.writeFileSync(path.join(output,'performance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(summary,null,2));
 // Generous noise bands reject material regressions, not sub-millisecond scheduling differences.
 assert.ok(summary.port.domMs<=summary.baseline.domMs*1.3+10,'startup regression');
 assert.ok(summary.port.idleTaskMs<=summary.baseline.idleTaskMs+3,'idle regression');
 assert.ok(summary.port.interactionTaskMs<=summary.baseline.interactionTaskMs*1.3+5,'interaction regression');
 assert.ok(summary.port.frameP95Ms<=summary.baseline.frameP95Ms+5,'frame regression');
 console.log('PASS popup performance budgets. Interpret local synthetic measurements within their stated scope.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
