/**
 * popup.js – GptGate popup logic
 *
 * Now an ES module: imports shared constants to eliminate code duplication (B3/B4).
 * Handles UI ↔ storage ↔ content-script communication.
 */

import {
  DEFAULT_STATE,
  normalizeState,
  HOST_ORIGINS,
  LEGACY_KEYS,
  CLAUDE_DARK_SURFACE_KEY,
} from './src/shared/constants.js';

let state = { ...DEFAULT_STATE };
let syncingUI = false;
let wired = false;

const $ = (id) => document.getElementById(id);

/* ── Status display (U6: loading state support) ── */

function setStatus(text, tone) {
  const el = $('status');
  const dot = $('statusDot');
  if (el) el.textContent = text;
  if (dot) {
    dot.className = 'status-dot';
    if (tone === 'ok') dot.classList.add('ok');
    else if (tone === 'warn') dot.classList.add('warn');
    else if (tone === 'error') dot.classList.add('error');
    else if (tone === 'loading') dot.classList.add('loading');
  }
}

/* ── Sync state to UI controls ── */

function ensureSegmentIndicators() {
  document.querySelectorAll('.seg').forEach((seg) => {
    if (seg.querySelector('.seg-indicator')) return;
    const indicator = document.createElement('span');
    indicator.className = 'seg-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    seg.prepend(indicator);
  });
}

function syncSegmentIndicator(seg) {
  if (!seg) return;
  const active = seg.querySelector('.seg-btn.active');
  seg.classList.toggle('has-active', !!active);
  if (!active) return;

  const nextWidth = active.offsetWidth + 'px';
  const nextX = (active.offsetLeft - 3) + 'px';
  const moved =
    seg.style.getPropertyValue('--seg-indicator-width') &&
    (seg.style.getPropertyValue('--seg-indicator-width') !== nextWidth ||
      seg.style.getPropertyValue('--seg-indicator-x') !== nextX);

  seg.style.setProperty('--seg-indicator-width', nextWidth);
  seg.style.setProperty('--seg-indicator-x', nextX);

  if (moved) {
    seg.classList.remove('is-bubbling');
    void seg.offsetWidth;
    seg.classList.add('is-bubbling');
    window.clearTimeout(seg._gptgateBubbleTimer);
    seg._gptgateBubbleTimer = window.setTimeout(() => {
      seg.classList.remove('is-bubbling');
    }, 460);
  }
}

function syncSegmentIndicators() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.seg').forEach(syncSegmentIndicator);
  });
}

function applyStateToUI(s) {
  syncingUI = true;
  ensureSegmentIndicators();

  ['respRtl', 'respLtr', 'respAuto', 'compRtl', 'compLtr', 'compAuto'].forEach((id) => {
    const btn = $(id);
    if (!btn) return;
    const key = btn.dataset.key;
    const val = btn.dataset.val;
    const isActive = s[key] === val;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  const mathSw = $('mathSwitch');
  const mathLbl = $('mathLabel');
  if (mathSw) mathSw.checked = !!s.mathFix;
  if (mathLbl) mathLbl.textContent = s.mathFix ? 'روشن' : 'خاموش';

  const fontSw = $('fontSwitch');
  const fontLbl = $('fontLabel');
  if (fontSw) fontSw.checked = !!s.fontFix;
  if (fontLbl) fontLbl.textContent = s.fontFix ? 'روشن' : 'خاموش';
  const claudeThemeSw = $('claudeThemeSwitch');
  const claudeThemeLbl = $('claudeThemeLabel');
  if (claudeThemeSw) claudeThemeSw.checked = !!s[CLAUDE_DARK_SURFACE_KEY];
  if (claudeThemeLbl) claudeThemeLbl.textContent = s[CLAUDE_DARK_SURFACE_KEY] ? 'روشن' : 'خاموش';
  syncSegmentIndicators();
  syncingUI = false;
}

/* ── Send state to a single tab ── */

function getScriptForUrl(url) {
  if (!url) return null;
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'src/chatgpt/content.js';
  if (url.includes('gemini.google.com')) return 'src/gemini/content.js';
  if (url.includes('claude.ai')) return 'src/claude/content.js';
  return null;
}

function sendStateToTab(tabId, url, s) {
  // B11: Use new message type, with fallback re-injection
  chrome.tabs.sendMessage(tabId, { type: 'gptgate:update', state: s }, () => {
    if (!chrome.runtime.lastError) return;
    const script = getScriptForUrl(url);
    if (!script) return;
    chrome.scripting.executeScript(
      { target: { tabId }, files: [script] },
      () => {
        if (chrome.runtime.lastError) {
          console.warn('[GptGate] Failed to inject content script to tab:', tabId, chrome.runtime.lastError);
          return;
        }
        chrome.tabs.sendMessage(tabId, { type: 'gptgate:update', state: s }, () => {
          void chrome.runtime.lastError;
        });
      }
    );
  });
}

/* ── Broadcast state to all ChatGPT tabs ── */

function broadcastToTabs(s) {
  chrome.tabs.query({ url: HOST_ORIGINS }, (tabs) => {
    if (chrome.runtime.lastError) {
      setStatus('تب‌های هوش مصنوعی پیدا نشد.', 'error');
      return;
    }
    const targets = tabs.filter((t) => t.id !== undefined);
    if (!targets.length) {
      setStatus('ذخیره شد؛ یک تب هوش مصنوعی باز کنید.', 'warn');
      return;
    }
    targets.forEach((tab) => sendStateToTab(tab.id, tab.url, s));
    setStatus('تنظیمات اعمال شد.', 'ok');
  });
}

/* ── Permission check (B10 note: host_permissions are auto-granted,
      but this provides a good UX fallback for edge cases) ── */

function ensureAccess(cb) {
  chrome.permissions.contains({ origins: HOST_ORIGINS }, (granted) => {
    if (chrome.runtime.lastError) {
      setStatus('امکان بررسی مجوزها وجود ندارد.', 'error');
      cb(false);
      return;
    }
    if (granted) {
      cb(true);
    } else {
      setStatus('دسترسی به سایت‌ها غیرفعال است.', 'warn');
      cb(false);
    }
  });
}

/* ── Persist and notify (U6: show loading state) ── */

function persistAndNotify() {
  setStatus('در حال ذخیره…', 'loading');

  chrome.storage.sync.set(state, () => {
    chrome.storage.sync.remove(LEGACY_KEYS, () => {
      ensureAccess((granted) => {
        if (granted) broadcastToTabs(state);
      });
    });
  });
}

/* ── UI event handlers ── */

function handleSegClick(btn) {
  if (syncingUI) return;
  const key = btn.dataset.key;
  const val = btn.dataset.val;
  if (!key || !val) return;
  state[key] = val;
  applyStateToUI(state);
  persistAndNotify();
}

function triggerSwitchBubble(input) {
  const track = input?.nextElementSibling;
  if (!track?.classList?.contains('switch-track')) return;
  track.classList.remove('is-bubbling');
  void track.offsetWidth;
  track.classList.add('is-bubbling');
  window.clearTimeout(track._gptgateBubbleTimer);
  track._gptgateBubbleTimer = window.setTimeout(() => {
    track.classList.remove('is-bubbling');
  }, 450);
}


/* ── Wire up event listeners ── */

function wire() {
  if (wired) return;
  wired = true;

  ensureSegmentIndicators();

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleSegClick(btn));
  });

  window.addEventListener('resize', syncSegmentIndicators);

  const mathSw = $('mathSwitch');
  if (mathSw) {
    mathSw.addEventListener('change', (e) => {
      if (syncingUI) return;
      triggerSwitchBubble(e.target);
      state.mathFix = e.target.checked;
      applyStateToUI(state);
      persistAndNotify();
    });
  }

  const fontSw = $('fontSwitch');
  if (fontSw) {
    fontSw.addEventListener('change', (e) => {
      if (syncingUI) return;
      triggerSwitchBubble(e.target);
      state.fontFix = e.target.checked;
      applyStateToUI(state);
      persistAndNotify();
    });
  }

  const claudeThemeSw = $('claudeThemeSwitch');
  if (claudeThemeSw) {
    claudeThemeSw.addEventListener('change', (e) => {
      if (syncingUI) return;
      triggerSwitchBubble(e.target);
      state[CLAUDE_DARK_SURFACE_KEY] = e.target.checked;
      applyStateToUI(state);
      persistAndNotify();
    });
  }

  const cta = $('ctaBtn');
  if (cta) {
    cta.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: 'https://t.me/GptGateAI' });
      } else {
        window.open('https://t.me/GptGateAI', '_blank');
      }
    });
  }

  wireAdvancedPanel();
}

/* ── Collapsible "advanced settings" section ── */

const ADVANCED_EXPANDED_KEY = 'gptgate_popup_advanced_expanded';

function setAdvancedExpanded(expanded) {
  const panel = $('advancedPanel');
  const toggle = $('advancedToggle');
  if (panel) panel.classList.toggle('expanded', expanded);
  if (toggle) toggle.setAttribute('aria-expanded', String(expanded));
  try { localStorage.setItem(ADVANCED_EXPANDED_KEY, expanded ? '1' : '0'); } catch (_) {}
}

function wireAdvancedPanel() {
  const toggle = $('advancedToggle');
  if (!toggle) return;

  let expanded = false;
  try { expanded = localStorage.getItem(ADVANCED_EXPANDED_KEY) === '1'; } catch (_) {}
  setAdvancedExpanded(expanded);

  toggle.addEventListener('click', () => {
    const panel = $('advancedPanel');
    setAdvancedExpanded(!panel?.classList.contains('expanded'));
  });
}

/* ── Only show the Claude dark-theme toggle while on claude.ai ── */

function updateClaudeThemeVisibility(isClaudeTab) {
  const row = $('claudeThemeRow');
  const divider = $('claudeThemeDivider');
  if (row) row.style.display = isClaudeTab ? 'flex' : 'none';
  if (divider) divider.style.display = isClaudeTab ? '' : 'none';
}

/* ── G6: Show version from manifest ── */

function showVersion() {
  const versionEl = $('versionText');
  if (versionEl && chrome.runtime?.getManifest) {
    const manifest = chrome.runtime.getManifest();
    versionEl.textContent = `v${manifest.version}`;
  }
}

/* ── Check access status ── */

function getPlatformName(url) {
  if (!url) return 'هوش مصنوعی';
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'ChatGPT';
  if (url.includes('gemini.google.com')) return 'Gemini';
  if (url.includes('claude.ai')) return 'Claude';
  return 'هوش مصنوعی';
}

function checkAccessStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const platformName = getPlatformName(currentTab?.url);
    updateClaudeThemeVisibility(platformName === 'Claude');

    chrome.permissions.contains({ origins: HOST_ORIGINS }, (granted) => {
      if (chrome.runtime.lastError) return;
      const badge = $('connBadge');
      if (granted && platformName !== 'هوش مصنوعی') {
        setStatus(`متصل به ${platformName}`, 'ok');
        if (badge) {
          badge.classList.add('visible');
        }
      } else if (granted) {
        setStatus('یک تب هوش مصنوعی باز کنید.', 'warn');
      } else {
        setStatus('جهت اعطای دسترسی، یک گزینه را تغییر دهید.', 'warn');
      }
    });
  });
}

/* ── Initialize ── */

function init() {
  chrome.storage.sync.get({ ...DEFAULT_STATE }, (saved) => {
    chrome.storage.sync.get(LEGACY_KEYS, (legacy) => {
      state = normalizeState({ ...saved, ...legacy });
      applyStateToUI(state);
      wire();
      checkAccessStatus();
      showVersion();
    });
  });
}

// ES modules are deferred — DOM might already be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
