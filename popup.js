import { setupTips } from './popup-tips.js';
import { DEFAULT_STATE, normalizeState, HOST_ORIGINS, LEGACY_KEYS } from './src/shared/constants.js';
import { FONT_CATALOG, WEIGHT_LABELS, CUSTOM_FONT_KEY, fontCSS, normalizeFont, readFontFile, validCustomFont } from './src/shared/fonts.js';

const $ = (id) => document.getElementById(id);
const THEME_KEY = 'gptgate_popup_theme';
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let state = { ...DEFAULT_STATE };
let initialized = false;
let saving = false;
let pendingSave = false;
let revision = 0;
let retry = null;
let explicitTheme = null;
let customFont = null;
let uploadRevision = 0;
let previewSignature = '';

function setStatus(text, tone = '', action = null) {
  $('status').textContent = text;
  $('status').closest('.status-row').hidden = !text;
  $('statusDot').className = `status-dot ${tone}`;
  retry = action;
  $('retryBtn').hidden = !action;
}

function applyStateToUI() {
  document.querySelectorAll('.seg').forEach((group) => {
    const key = group.querySelector('[data-key]').dataset.key;
    group.dataset.value = state[key];
    group.querySelectorAll('button').forEach((button) => {
      const active = state[key] === button.dataset.val;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  });
  document.querySelectorAll('input[data-key]').forEach((input) => {
    input.checked = state[input.dataset.key];
  });
  // The existing content engine always fixes math in forced RTL mode.
  const mathRequired = state.responseDir === 'rtl' || state.composerDir === 'rtl';
  $('mathSwitch').disabled = mathRequired;
  $('mathSwitch').checked = mathRequired || state.mathFix;
  $('mathDescription').textContent = mathRequired
    ? 'در حالت راست‌چین، همیشه فعال است'
    : 'ترتیب درست عددها و علامت‌ها';
  updateFontUI();
}

for (const [id,font] of Object.entries(FONT_CATALOG)) $('fontFamily').add(new Option(font.label,id));
const previewStyle = document.createElement('style');
document.head.append(previewStyle);
function updateFontUI() {
  const font = FONT_CATALOG[state.fontFamily];
  $('fontFamily').value = state.fontFamily;
  $('fontFamily').querySelector('[value="custom"]').disabled = !customFont && state.fontFamily !== 'custom';
  const weights = font.weights;
  $('fontWeight').replaceChildren(...weights.map(weight=>new Option(state.fontFamily === 'custom' ? 'وزن خود فایل' : WEIGHT_LABELS[weight],weight)));
  $('fontWeight').value = String(state.fontWeight);
  $('fontWeight').disabled = state.fontFamily === 'custom';
  $('fontSummary').textContent = font.label;
  $('removeFont').hidden = !customFont;
  $('uploadFont').textContent = customFont ? 'جایگزینی فونت من' : 'افزودن فونت من';
  $('fontNote').textContent = customFont ? `${customFont.name} — فقط روی این دستگاه`
    : state.fontFamily === 'custom' ? 'فونت شما روی این دستگاه نیست؛ فعلاً وزیرمتن نمایش داده می‌شود. فایل را دوباره اضافه کنید.'
    : 'فایل WOFF2، WOFF، TTF یا OTF تا ۲ مگابایت؛ فقط روی این دستگاه ذخیره می‌شود.';
  // Collapsed settings never download preview fonts.
  if (!$('fontSettings').open) return;
  const signature = `${state.fontFamily}:${state.fontWeight}:${customFont?.data || ''}`;
  if (previewSignature === signature) return;
  previewSignature = signature;
  const {faces,family,weight} = fontCSS(state,customFont);
  previewStyle.textContent = `${faces} #fontPreview{font-family:"${family}",sans-serif;font-weight:${weight}}`;
}
$('fontSettings').addEventListener('toggle', updateFontUI);
$('fontFamily').addEventListener('change', () => {
  uploadRevision++;
  Object.assign(state,normalizeFont({...state,fontFamily:$('fontFamily').value}));
  state.fontFix = true;
  applyStateToUI();
  void persistAndNotify();
});
$('fontWeight').addEventListener('change', () => {
  state.fontWeight = Number($('fontWeight').value);
  updateFontUI();
  void persistAndNotify();
});
$('uploadFont').addEventListener('click', () => $('fontFile').click());
$('fontFile').addEventListener('change', async () => {
  const file = $('fontFile').files[0];
  if (!file) return;
  const run = ++uploadRevision;
  $('uploadFont').disabled = true;
  try {
    const record = await readFontFile(file);
    if (run !== uploadRevision) return;
    try { await chrome.storage.local.set({[CUSTOM_FONT_KEY]:record}); }
    catch { throw Error('فونت روی این دستگاه ذخیره نشد. دوباره تلاش کنید.'); }
    customFont = record;
    if (run !== uploadRevision) return;
    Object.assign(state,{fontFamily:'custom',fontWeight:400,fontFix:true});
    applyStateToUI();
    await persistAndNotify();
  } catch (error) { if (run === uploadRevision) setStatus(error.message || 'فونت ذخیره نشد. دوباره تلاش کنید.','error'); }
  finally { $('fontFile').value = ''; $('uploadFont').disabled = false; }
});
$('removeFont').addEventListener('click', async () => {
  uploadRevision++;
  try {
    await chrome.storage.local.remove(CUSTOM_FONT_KEY);
    customFont = null;
    if (state.fontFamily === 'custom') Object.assign(state,{fontFamily:'iransans',fontWeight:500});
    applyStateToUI();
    void persistAndNotify();
  } catch { setStatus('فونت حذف نشد. دوباره تلاش کنید.','error'); }
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeToggle').setAttribute('aria-checked', String(theme === 'dark'));
}

function setMotion(instant) {
  const mode = instant ? 'instant' : 'pointer';
  document.documentElement.dataset.motion = mode;
  document.querySelectorAll('.seg, .switch, .theme-switcher').forEach((control) => {
    control.dataset.motion = mode;
  });
}

document.addEventListener('pointerdown', () => setMotion(false), { passive: true });
document.addEventListener('keydown', () => setMotion(true), true);
try { explicitTheme = localStorage.getItem(THEME_KEY); } catch { /* System theme remains available. */ }
if (!['dark', 'light'].includes(explicitTheme)) explicitTheme = null;
applyTheme(explicitTheme || (systemTheme.matches ? 'dark' : 'light'));
systemTheme.addEventListener('change', () => {
  if (!explicitTheme) applyTheme(systemTheme.matches ? 'dark' : 'light');
});
$('themeToggle').addEventListener('click', (event) => {
  setMotion(event.detail === 0);
  explicitTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(explicitTheme);
  try { localStorage.setItem(THEME_KEY, explicitTheme); } catch { /* Theme still works for this popup. */ }
});

function platformFor(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const hosts = {
      'chatgpt.com': ['ChatGPT', 'chatgpt'],
      'chat.openai.com': ['ChatGPT', 'chatgpt'],
      'gemini.google.com': ['Gemini', 'gemini'],
      'claude.ai': ['Claude', 'claude'],
    };
    return hosts[parsed.hostname] || null;
  } catch { return null; }
}

async function sendStateToTab(tab, snapshot, currentRevision) {
  const platform = platformFor(tab.url);
  if (tab.id === undefined || !platform) return false;
  const message = { type: 'gptgate:update', state: snapshot };
  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response?.ok === true;
  } catch {
    if (revision !== currentRevision) return false;
    try {
      // Vite hashes content-script filenames in production; use the shipped manifest.
      const files = chrome.runtime.getManifest().content_scripts.find((entry) =>
        entry.matches.some((pattern) => platformFor(pattern)?.[1] === platform[1])
      )?.js;
      if (!files?.length) return false;
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
      if (revision !== currentRevision) return false;
      const response = await chrome.tabs.sendMessage(tab.id, message);
      return response?.ok === true;
    } catch { return false; }
  }
}

async function notifyTabs(snapshot, currentRevision) {
  // A newer selection owns the feedback, even if an older broadcast finishes later.
  const status = (...args) => { if (revision === currentRevision) setStatus(...args); };
  try {
    const granted = await chrome.permissions.contains({ origins: HOST_ORIGINS });
    if (!granted) {
      status('ذخیره شد؛ دسترسی افزونه به سایت‌ها را فعال کنید.', 'warn');
      return;
    }
    const tabs = await chrome.tabs.query({ url: HOST_ORIGINS });
    if (revision !== currentRevision) return;
    const targets = tabs.filter((tab) => tab.id !== undefined && platformFor(tab.url));
    if (!targets.length) {
      status('ذخیره شد؛ ChatGPT، Gemini یا Claude را باز کنید.', 'warn');
      return;
    }
    const applied = await Promise.all(targets.map((tab) => sendStateToTab(tab, snapshot, currentRevision)));
    if (applied.every(Boolean)) status('');
    else status('ذخیره شد؛ برای اعمال، تب سایت را تازه کنید.', 'warn', persistAndNotify);
  } catch {
    status('ذخیره شد؛ ارتباط با تب‌ها برقرار نشد.', 'warn', persistAndNotify);
  } finally {
    if (revision === currentRevision) $('settings').setAttribute('aria-busy', 'false');
  }
}

async function persistAndNotify() {
  pendingSave = true;
  revision += 1;
  if (saving) return;
  saving = true;
  $('settings').setAttribute('aria-busy', 'true');
  while (pendingSave) {
    pendingSave = false;
    const snapshot = { ...state };
    const currentRevision = revision;
    setStatus('');
    try {
      await chrome.storage.sync.set(snapshot);
      // Migration cleanup is best-effort; a saved modern preference remains valid.
      try { await chrome.storage.sync.remove(LEGACY_KEYS); } catch { /* Retry on the next save. */ }
      if (!pendingSave) void notifyTabs(snapshot, currentRevision);
    } catch {
      if (!pendingSave) {
        setStatus('تنظیمات ذخیره نشد. دوباره تلاش کنید.', 'error', persistAndNotify);
        $('settings').setAttribute('aria-busy', 'false');
      }
    }
  }
  saving = false;
}

document.querySelectorAll('.seg-btn').forEach((button) => {
  button.addEventListener('click', (event) => {
    if (!initialized) return;
    setMotion(event.detail === 0);
    if (state[button.dataset.key] === button.dataset.val) return;
    state[button.dataset.key] = button.dataset.val;
    applyStateToUI();
    void persistAndNotify();
  });
});
document.querySelectorAll('input[data-key]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!initialized) return;
    state[input.dataset.key] = input.checked;
    void persistAndNotify();
  });
});
$('retryBtn').addEventListener('click', () => { if (retry) void retry(); });
$('ctaBtn').addEventListener('click', async () => {
  try { await chrome.tabs.create({ url: 'https://t.me/GptGateAI' }); }
  catch { setStatus('تلگرام باز نشد. دوباره تلاش کنید.', 'error', () => $('ctaBtn').click()); }
});

async function checkAccessStatus() {
  const currentRevision = revision;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const platform = platformFor(tabs[0]?.url);
    const granted = await chrome.permissions.contains({ origins: HOST_ORIGINS });
    if (revision !== currentRevision) return;
    if (!granted) setStatus('دسترسی افزونه به سایت‌ها را فعال کنید.', 'warn');
    else if (platform) setStatus('');
    else setStatus('برای استفاده، ChatGPT، Gemini یا Claude را باز کنید.');
  } catch {
    if (revision === currentRevision) setStatus('تنظیمات آماده است؛ بررسی تب باز ممکن نشد.', 'warn', checkAccessStatus);
  }
}

async function init() {
  setStatus('در حال خواندن تنظیمات…');
  try {
    const saved = await chrome.storage.sync.get([...Object.keys(DEFAULT_STATE), ...LEGACY_KEYS]);
    state = normalizeState(saved);
    try {
      const local = await chrome.storage.local.get(CUSTOM_FONT_KEY);
      customFont = validCustomFont(local[CUSTOM_FONT_KEY]) ? local[CUSTOM_FONT_KEY] : null;
    } catch { /* Built-in fonts remain available when local storage fails. */ }
    for (const key of ['responseDir', 'composerDir']) {
      if (!['rtl', 'ltr', 'auto'].includes(state[key])) state[key] = DEFAULT_STATE[key];
    }
    applyStateToUI();
    if (!initialized) setupTips();
    initialized = true;
    $('settings').disabled = false;
    $('settings').setAttribute('aria-busy', 'false');
    void checkAccessStatus();
  } catch {
    setStatus('تنظیمات خوانده نشد. دوباره تلاش کنید.', 'error', init);
  }
  $('versionText').textContent = `v${chrome.runtime.getManifest().version}`;
}
void init();
