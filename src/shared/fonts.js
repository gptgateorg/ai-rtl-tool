// Local assets only. Declaring faces does not download unused families or weights.
export const CUSTOM_FONT_KEY = 'gptgateCustomFont';
export const MAX_FONT_BYTES = 2 * 1024 * 1024;
export const FONT_CATALOG = {
  iransans: { label: 'ایران‌سنس', family: 'GPTGate IranSans', weights: [100,200,300,400,500,600,700,800,900],
    files: ['Thin','UltraLight','Light','Regular','Medium','DemiBold','Bold','ExtraBold','Black'].map(n => `IRANSansX-${n}.woff2`) },
  vazirmatn: { label: 'وزیرمتن', family: 'GPTGate Vazirmatn', weights: [100,200,300,400,500,600,700,800,900], variable: '100 900', files: ['Vazirmatn-Variable.woff2'] },
  shabnam: { label: 'شبنم', family: 'GPTGate Shabnam', weights: [100,300,400,500,700],
    files: ['Shabnam-Thin.woff2','Shabnam-Light.woff2','Shabnam.woff2','Shabnam-Medium.woff2','Shabnam-Bold.woff2'] },
  sahel: { label: 'ساحل', family: 'GPTGate Sahel', weights: [300,400,600,700,900], variable: '300 900', files: ['Sahel-Variable.woff2'] },
  custom: { label: 'فونت من', family: 'GPTGate Custom', weights: [400], files: [] },
};
export const WEIGHT_LABELS = {100:'خیلی نازک',200:'نازک',300:'سبک',400:'معمولی',500:'متوسط',600:'نیمه‌ضخیم',700:'ضخیم',800:'خیلی ضخیم',900:'سنگین'};

export function normalizeFont(raw = {}) {
  const fontFamily = Object.hasOwn(FONT_CATALOG, raw.fontFamily) ? raw.fontFamily : 'iransans';
  const weights = FONT_CATALOG[fontFamily].weights;
  const requested = Number(raw.fontWeight ?? 500);
  const fontWeight = weights.includes(requested) ? requested : weights.reduce((a,b) => Math.abs(b-requested)<Math.abs(a-requested)?b:a,400);
  return { fontFamily, fontWeight: weights.includes(fontWeight) ? fontWeight : weights[0] };
}

export function validCustomFont(record) {
  return !!record && typeof record.name === 'string' && record.name.length <= 180
    && typeof record.data === 'string' && record.data.length <= Math.ceil(MAX_FONT_BYTES * 4 / 3) + 100
    && /^data:font\/(?:woff2?|ttf|otf);base64,[A-Za-z0-9+/]+=*$/.test(record.data);
}

export async function readFontFile(file) {
  if (!file || !/\.(woff2?|ttf|otf)$/i.test(file.name)) throw Error('یک فایل WOFF2، WOFF، TTF یا OTF انتخاب کنید.');
  if (file.size > MAX_FONT_BYTES) throw Error('حجم فونت باید کمتر از ۲ مگابایت باشد.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = String.fromCharCode(...bytes.slice(0,4));
  const format = signature === 'wOF2' ? 'woff2' : signature === 'wOFF' ? 'woff' : signature === 'OTTO' ? 'otf' : bytes[0]===0 && bytes[1]===1 && bytes[2]===0 && bytes[3]===0 ? 'ttf' : null;
  if (!format) throw Error('این فایل، فونت معتبر نیست.');
  try { await new FontFace('GPTGate Upload Check', bytes.buffer).load(); }
  catch { throw Error('فایل فونت خوانده نشد. فایل دیگری انتخاب کنید.'); }
  let binary = '';
  for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  return { name: file.name.slice(0,180), data: `data:font/${format};base64,${btoa(binary)}` };
}

export function fontCSS(raw, custom, getURL = p => chrome.runtime.getURL(p)) {
  let {fontFamily, fontWeight} = normalizeFont(raw);
  if (fontFamily === 'custom' && !validCustomFont(custom)) fontFamily = 'vazirmatn';
  const font = FONT_CATALOG[fontFamily];
  const faces = fontFamily === 'custom'
    ? `@font-face{font-family:"${font.family}";src:url("${custom.data}");font-weight:400;font-display:swap;}`
    : font.files.map((file,i)=>`@font-face{font-family:"${font.family}";src:url("${getURL(`fonts/${file}`)}") format("woff2");font-weight:${font.variable || font.weights[i]};font-style:normal;font-display:swap;}`).join('\n');
  return {faces, family: font.family, weight: fontWeight};
}

export function createFontController(selectors) {
  let signature = '';
  let generation = 0;
  return async function update(state, force = false) {
    const next = `${state.fontFamily}:${state.fontWeight}:${state.fontFix}`;
    if (next === signature && !force) return;
    signature = next;
    const run = ++generation;
    let custom;
    if (state.fontFamily === 'custom' && state.fontFix) {
      try { custom = (await chrome.storage.local.get(CUSTOM_FONT_KEY))[CUSTOM_FONT_KEY]; } catch { /* Local fallback. */ }
    }
    if (run !== generation) return;
    const {faces,family,weight} = fontCSS(state,custom);
    const scope = `:is(${[...selectors.responses,...selectors.composer].join(',')})`;
    const protectedNodes = 'pre,pre *,code,code *,kbd,kbd *,samp,samp *,math,math *,.katex,.katex *,mjx-container,mjx-container *,.mjx-container,.mjx-container *,svg,svg *,button,button *,mat-icon,mat-icon *,[data-cds="Icon"],[class*="material-"],[class*="google-symbols"],.lumi-symbols,[class*="code-"],[class*="code-"] *,.hljs,.hljs *';
    const text = `html body.gptgate-use-font :is(${scope},${scope} *):not(${protectedNodes})`;
    const sidebar = selectors.sidebarTitles?.length ? `html body.gptgate-use-font :is(${selectors.sidebarTitles.join(',')})` : null;
    let style = document.getElementById('gptgate-font-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'gptgate-font-style';
      document.documentElement.append(style);
    }
    style.textContent = `${faces}
      ${text}{font-family:"${family}",sans-serif!important}
      ${text}:not(strong,strong *,b,b *,h1,h1 *,h2,h2 *,h3,h3 *,h4,h4 *,h5,h5 *,h6,h6 *){font-weight:${weight}!important}
      ${sidebar ? `${sidebar},${sidebar} :is(span,bdi){font-family:"${family}",sans-serif!important}` : ''}`;
  };
}
