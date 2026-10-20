const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
// Claude/Gemini engines are now in scope; behavioral coverage lives in site-engines.cjs.
const files=['src/claude/selectors.js','src/gemini/selectors.js','fonts/IRANSansX-MediumD4.woff2'];
for(const file of files)assert.deepEqual(fs.readFileSync(path.join(root,file)),execFileSync('git',['show',`244006e:${file}`],{cwd:root}),`Out-of-scope modification: ${file}`);
const dist=path.join(root,'dist');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.json')));
assert.deepEqual(manifest.permissions,['storage','scripting']);
const popup=fs.readFileSync(path.join(root,'popup.js'),'utf8');
assert.ok(!/fetch\(|setInterval|requestAnimationFrame|offsetWidth|offsetLeft/.test(popup),'No popup network/polling/layout animation code');
assert.ok(!/account|password|token|login/i.test(fs.readFileSync(path.join(root,'popup.html'),'utf8')));
assert.deepEqual(manifest.host_permissions,JSON.parse(execFileSync('git',['show','244006e:manifest.json'],{cwd:root})).host_permissions);
for(const f of ['src/shared/fonts.js','src/shared/export-content.js','src/chatgpt/pdf-export.js','export.html'])assert.ok(fs.existsSync(path.join(dist,f)),f);
assert.ok(fs.readFileSync(path.join(dist,'THIRD_PARTY_NOTICES.txt'),'utf8').includes('docx 9.13.0'),'Bundled software notices must ship');
assert.ok(fs.readFileSync(path.join(dist,'fonts/FontLicense.txt'),'utf8').includes('8OHVZX36'),'Owner-supplied font notice must ship');
assert.equal(manifest.default_locale,'fa');
assert.equal(manifest.name,'__MSG_extensionName__');
assert.equal(manifest.description,'__MSG_extensionDescription__');
for(const locale of ['fa','en']){
  const file=`_locales/${locale}/messages.json`;
  assert.deepEqual(fs.readFileSync(path.join(dist,file)),fs.readFileSync(path.join(root,file)),`Packaged locale: ${locale}`);
  const messages=JSON.parse(fs.readFileSync(path.join(dist,file),'utf8'));
  assert.ok(messages.extensionName.message.length<=75,'Store title length');
  assert.ok(messages.extensionDescription.message.length<=132,'Store summary length');
}
assert.ok(!popup.includes('آماده برای'));
assert.ok(!popup.includes('ذخیره شد و روی تب‌های باز اعمال شد'));
console.log(`PASS scope integrity: ${files.length} unrelated engines/assets preserved; minimal permissions, unchanged hosts, notices and export resources packaged.`);
