const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const JSZip=require('jszip');const {chromium,root,output}=require('./harness.cjs');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gptgate-word-')),dist=path.join(root,'dist');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,acceptDownloads:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`]});
 const errors=[],remote=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 try {
  await context.route(/^https?:/,r=>{remote.push(r.request().url());return r.abort();});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
  for(let i=0;i<50&&!await worker.evaluate(()=>!!globalThis.chrome?.storage?.session);i++)await new Promise(r=>setTimeout(r,50));
  const page=await context.newPage();const requests=[];page.on('request',r=>requests.push(r.url()));
  const payloadId='11111111-2222-4333-8444-555555555555';
  await worker.evaluate(({key})=>chrome.storage.session.set({[key]:{title:'گفتگوی آزمایشی',scope:'response',createdAt:Date.now(),messages:[{role:'assistant',html:'<p dir="rtl">سلام <strong>پررنگ</strong> <em>تأکید</em></p><p dir="ltr">English text</p><ol start="3"><li>مورد اول</li><li>مورد دوم</li></ol><table dir="rtl"><tr><th colspan="2">عنوان</th></tr><tr><td>نام</td><td>مقدار</td></tr></table><pre><code>const total = 42;\nconsole.log(total);</code></pre><a href="https://example.com/">Link</a><a href="javascript:alert(1)">Unsafe</a><math dir="ltr"><mfrac><mn>1</mn><mn>2</mn></mfrac></math><details open><summary>جزئیات</summary><p>متن جزئیات</p></details>'}]}}),{key:`pdf:${payloadId}`});
  await page.goto(`chrome-extension://${id}/export.html#${payloadId}`);await page.waitForFunction(()=>!document.querySelector('#word').disabled);
  assert.ok(!requests.some(u=>u.includes('export-docx')),'Word code loaded before a user request');
  // A real locally-generated WebP exercises the format conversion without a fetch.
  await page.evaluate(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);const img=document.createElement('img');img.src=c.toDataURL('image/webp');img.alt='Local test';document.querySelector('.message-content').append(img);});
  const download=page.waitForEvent('download');await page.locator('#word').click();const result=await download;
  assert.ok(result.suggestedFilename().endsWith('.docx'));const file=path.join(output,'conversation-word.docx');await result.saveAs(file);
  await page.waitForFunction(()=>document.querySelector('#word').getAttribute('aria-busy')==='false');assert.ok(requests.some(u=>u.includes('export-docx')));
  const zip=await JSZip.loadAsync(fs.readFileSync(file)),xml=await zip.file('word/document.xml').async('string'),rels=await zip.file('word/_rels/document.xml.rels').async('string');
  for(const text of ['سلام','English text','مورد اول','عنوان','const total = 42;','متن جزئیات'])assert.ok(xml.includes(text),text);
  assert.ok(/<w:bidi(?:\s|\/|>)/.test(xml),'RTL paragraphs');assert.ok(/<w:rtl(?:\s|\/|>)/.test(xml),'RTL runs');
  const paragraphs=xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[];
  for(const text of ['English text','const total']){const paragraph=paragraphs.find(p=>p.includes(text));assert.ok(paragraph.includes('<w:jc w:val="left"'));assert.ok(!/<w:(?:rtl|bidi)[ \/>]/.test(paragraph),'LTR code/English must not inherit RTL flags');}
  assert.ok(xml.includes('Consolas'));assert.ok(xml.includes('<w:numPr>'));assert.ok(xml.includes('<w:gridSpan w:val="2"'));assert.ok(xml.includes('<m:f>'),'MathML fraction becomes an editable Word equation');
  assert.ok(rels.includes('https://example.com/'));assert.ok(!rels.includes('javascript:'));assert.ok(Object.keys(zip.files).some(k=>k.startsWith('word/media/')&&k.endsWith('.png')),'WebP converted to embedded PNG');
  assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(output,'word-preview.png'),fullPage:true});
  await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,'word-preview-320.png'),fullPage:true});
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('#word').isVisible(),false);await page.emulateMedia({media:'screen'});
  // Invalid previews cannot enable either export path.
  await page.goto(`chrome-extension://${id}/export.html#invalid`);await page.reload();assert.equal(await page.locator('#word').isDisabled(),true);
  fs.writeFileSync(path.join(output,'word-results.json'),JSON.stringify({passed:true,lazy:true,noRemoteRequests:true,rtl:true,codeLTR:true,tableMerge:true,numberedList:true,editableMath:true,webpToPng:true,wordRendererTested:false},null,2));
  console.log('PASS local DOCX download, OOXML content/RTL/code/list/table/math/image/link checks, lazy loading, 320px, and invalid preview.');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
