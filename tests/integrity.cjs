const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const files=execFileSync('git',['ls-tree','-r','--name-only','244006e'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('src/')||p==='manifest.json'||p==='background.js'||p.startsWith('images/')||p==='fonts/IRANSansX-MediumD4.woff2');
for(const file of files)assert.deepEqual(fs.readFileSync(path.join(root,file)),execFileSync('git',['show',`244006e:${file}`],{cwd:root}),`Out-of-scope modification: ${file}`);
const baseline=path.join(root,'artifacts/baseline-dist');const dist=path.join(root,'dist');
if(fs.existsSync(baseline)){
 const manifest=JSON.parse(fs.readFileSync(path.join(baseline,'manifest.json')));
 for(const entry of manifest.content_scripts)for(const file of entry.js)assert.deepEqual(fs.readFileSync(path.join(dist,file)),fs.readFileSync(path.join(baseline,file)),`Changed bundled content script ${file}`);
 for(const file of fs.readdirSync(path.join(baseline,'assets')).filter(f=>f.startsWith('background.')))assert.deepEqual(fs.readFileSync(path.join(dist,'assets',file)),fs.readFileSync(path.join(baseline,'assets',file)));
}
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.json')));
assert.deepEqual(manifest.permissions,['storage','tabs','scripting']);
const popup=fs.readFileSync(path.join(root,'popup.js'),'utf8');
assert.ok(!/fetch\(|setInterval|requestAnimationFrame|offsetWidth|offsetLeft/.test(popup),'No popup network/polling/layout animation code');
assert.ok(!/account|password|token|login/i.test(fs.readFileSync(path.join(root,'popup.html'),'utf8')));
console.log(`PASS scope integrity: ${files.length} original runtime/assets files byte-identical; bundled site scripts and permissions unchanged.`);
