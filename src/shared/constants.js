/**
 * constants.js – Shared constants & utilities for GptGate extension
 * Single source of truth for DEFAULT_STATE, normalizeState, host origins, etc.
 */

/* ── Default settings ── */
export const DEFAULT_STATE = {
  responseDir: 'rtl',
  composerDir: 'auto',
  mathFix: true,
  fontFix: true,
  claudeDarkSurface: true
};

export const CLAUDE_DARK_SURFACE_KEY = 'claudeDarkSurface';

/* ── URL / permission patterns ── */
export const HOST_ORIGINS = [
  'https://chat.openai.com/*',
  'https://chatgpt.com/*',
  'https://gemini.google.com/*',
  'https://claude.ai/*'
];

/* ── Legacy storage keys (for migration) ── */
export const LEGACY_KEYS = ['rtlResponses', 'rtlComposer'];

/* ── Allowed domains for open-link handler (S1/S2) ── */
export const ALLOWED_LINK_DOMAINS = ['t.me', 'telegram.me'];

/**
 * Normalize a raw settings object into a valid state shape.
 * Handles both new keys (responseDir/composerDir/mathFix)
 * and legacy boolean keys (rtlResponses/rtlComposer).
 *
 * Uses `!= null` to treat both null and undefined consistently (B3 fix).
 */
export function normalizeState(raw = {}) {
  const responseDir =
    raw.responseDir ||
    (typeof raw.rtlResponses === 'boolean'
      ? raw.rtlResponses ? 'rtl' : 'auto'
      : DEFAULT_STATE.responseDir);

  const composerDir =
    raw.composerDir ||
    (typeof raw.rtlComposer === 'boolean'
      ? raw.rtlComposer ? 'rtl' : 'auto'
      : DEFAULT_STATE.composerDir);

  const mathFix = raw.mathFix != null ? !!raw.mathFix : DEFAULT_STATE.mathFix;
  const fontFix = raw.fontFix != null ? !!raw.fontFix : DEFAULT_STATE.fontFix;
  const claudeDarkSurface =
    raw.claudeDarkSurface != null ? !!raw.claudeDarkSurface : DEFAULT_STATE.claudeDarkSurface;

  return { responseDir, composerDir, mathFix, fontFix, claudeDarkSurface };
}

/**
 * Detect direction of a text string based on its first "strong" character.
 * Returns 'rtl' for Arabic/Persian/Hebrew, 'ltr' for Latin/Greek, or defaultDir.
 * (R5 – Smart Bidi)
 */
export function detectTextDirection(text, defaultDir = 'rtl') {
  if (!text) return defaultDir;
  // RTL ranges: Arabic, Arabic Supplement, Hebrew, Arabic Presentation Forms
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  // LTR ranges: Basic Latin, Latin Extended, Greek
  const ltrRegex = /[A-Za-z\u00C0-\u024F\u0370-\u03FF]/;
  for (const char of text) {
    if (rtlRegex.test(char)) return 'rtl';
    if (ltrRegex.test(char)) return 'ltr';
  }
  return defaultDir;
}

/**
 * Detect direction for composer based on the first 200 words.
 * If there is any RTL character in the first 200 words, it becomes RTL.
 */
export function detectComposerDirection(text, defaultDir = 'ltr') {
  if (!text) return defaultDir;
  
  const words = text.trim().split(/\s+/).slice(0, 200);
  const sampleText = words.join(' ');
  
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const ltrRegex = /[A-Za-z\u00C0-\u024F\u0370-\u03FF]/;
  
  if (rtlRegex.test(sampleText)) {
    return 'rtl';
  }
  
  if (ltrRegex.test(sampleText)) {
    return 'ltr';
  }
  
  return defaultDir;
}
