const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts/qa');
fs.mkdirSync(output, { recursive: true });
const types = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.woff2':'font/woff2', '.png':'image/png' };
async function open(browser, options = {}) {
  const page = await browser.newPage({ viewport:{width:options.width || 390,height:600}, colorScheme:options.theme || 'light', reducedMotion:options.reduced ? 'reduce':'no-preference', forcedColors:options.forced ? 'active':'none' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = options.baseline ? path.join(root,'artifacts/baseline') : root;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'popup.test') return route.abort();
    const file = path.resolve(base, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:''});
    return route.fulfill({contentType:types[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.addInitScript((options) => {
    const saved = JSON.parse(sessionStorage.getItem('fixtureState') || JSON.stringify(options.state || {}));
    window.fixture = {
      saved, calls:[], faults:{...options.faults},
      tabs: options.tabs || [{id:1,url:options.url || 'https://chatgpt.com/c/fixture'}],
    };
    const invoke = (name, args, callback, action) => {
      fixture.calls.push({name,args:structuredClone(args)});
      const work = async () => {
        if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        if (fixture.faults[name]) throw Error(name + ' fixture failure');
        return action();
      };
      if (!callback) return work();
      work().then(result => callback(result), error => {
        chrome.runtime.lastError = {message:error.message}; callback(undefined); chrome.runtime.lastError = undefined;
      });
    };
    window.chrome = {
      runtime:{getManifest:()=>({version:'0.1.1',content_scripts:[
        {matches:['https://chatgpt.com/*','https://chat.openai.com/*'],js:['src/chatgpt/content.js']},
        {matches:['https://gemini.google.com/*'],js:['src/gemini/content.js']},
        {matches:['https://claude.ai/*'],js:['src/claude/content.js']},
      ]})},
      storage:{sync:{
        get:(keys,cb)=>invoke('get',keys,cb,()=>{
          const result = typeof keys === 'object' && !Array.isArray(keys) ? {...keys} : {};
          for (const key of (Array.isArray(keys) ? keys : Object.keys(keys))) if (key in saved) result[key]=saved[key];
          return result;
        }),
        set:(values,cb)=>invoke('set',values,cb,()=>{Object.assign(saved,values);sessionStorage.setItem('fixtureState',JSON.stringify(saved));}),
        remove:(keys,cb)=>invoke('remove',keys,cb,()=>{keys.forEach(key=>delete saved[key]);sessionStorage.setItem('fixtureState',JSON.stringify(saved));}),
      }},
      permissions:{contains:(args,cb)=>invoke('permissions',args,cb,()=>options.granted !== false)},
      tabs:{
        query:(query,cb)=>invoke(query.active?'activeTab':'query',query,cb,()=>query.active ? fixture.tabs.slice(0,1) : fixture.tabs),
        sendMessage:(id,msg,cb)=>invoke('send',{id,msg},cb,()=>({ok:true})),
        create:(args,cb)=>invoke('create',args,cb,()=>({id:9})),
      },
      scripting:{executeScript:(args,cb)=>invoke('inject',args,cb,()=>{if(!fixture.faults.permanentSend)fixture.faults.send=false;return [];})},
    };
  }, options);
  await page.goto('https://popup.test/popup.html');
  await page.evaluate(()=>document.fonts.ready);
  if (!options.faults?.get) await page.waitForFunction(()=>document.querySelector('#respRtl').hasAttribute('aria-pressed'));
  return {page,errors};
}
module.exports={chromium,open,root,output};
