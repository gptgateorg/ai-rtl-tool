<div align="center">
  <img src="images/logo.png" width="112" alt="GptGate logo">
  <h1>GptGate Browser Extension</h1>
  <p>Persian direction, reading fonts, and local ChatGPT PDF export.</p>
  <p><a href="README.fa.md">فارسی</a> · <strong>English</strong></p>
</div>

GptGate helps Persian speakers read and write mixed Persian, English, and math
in ChatGPT, Gemini, and Claude. It uses Chrome Manifest V3; the package version
is 0.1.1. No GptGate account or login is required.

## Features

- Separate right, left, and automatic direction controls for responses and composer.
- Existing math correction for right-to-left content and a Claude-only dark surface.
- IRANSansX, Vazirmatn, Shabnam, Sahel, and a custom local conversation font;
  available weight choices and an in-popup mixed-language sample.
- ChatGPT PDF preview for an individual assistant response or the available
  conversation branch, finished with the browser's native Save as PDF.
- Windows-style popup controls and motion with the supplied Persian brand artwork.
- Automatic preference saving, keyboard focus, reduced motion, and recovery feedback.

| Service | Websites | Direction and fonts | PDF preview |
| --- | --- | --- | --- |
| ChatGPT | chatgpt.com, chat.openai.com | Yes | Response and conversation |
| Gemini | gemini.google.com | Yes | No |
| Claude | claude.ai | Yes; existing black-surface option | No |

## Install from source

Use Node.js 22 or newer, npm, and a Chromium browser. Validation used Node.js
24.21 and Chromium 140; the earlier broad Node 18+ requirement is unverified.

```bash
npm ci
npm run build
```

1. Open chrome://extensions (or edge://extensions).
2. Enable Developer mode and choose Load unpacked.
3. Select the generated dist folder.
4. Reload any already open supported-site tabs after loading or reloading dist.

## Direction and reading preferences

Open a supported site, then open GptGate from the browser toolbar. Choose each
text direction independently. When either direction is forced right-to-left,
the existing engine requires math correction: the popup displays it as enabled
and explains why its switch is disabled. The stored math choice remains available
for automatic/left-to-right modes.

The sun/moon switch changes only the popup. The separate Claude black-surface
preference applies only to Claude. The idle ready sentence is omitted; saving,
warning, and failure messages still describe the result of an action.

## Choose a font

1. Enable the conversation-font switch and expand the font/weight section.
2. Choose a family and an available weight; inspect the Persian/English sample.
3. To use your own face, select the upload action and choose WOFF2, WOFF, TTF,
   or OTF, at most 2 MiB. The browser must successfully parse the font.

Custom fonts expose their uploaded face at weight 400. Their bytes stay on this
device in chrome.storage.local; only family and weight choices sync. A synced
custom choice without a local file falls back to Vazirmatn. Removing the uploaded
font is available in the same section. Selected fonts target message/composer
text, while native buttons, code, math, and icons retain their own rendering.
The popup interface continues to use its Windows fonts. See
[font files and provenance](fonts/README.md).

ChatGPT sidebar conversation/project titles also use the selected family while
keeping the native interface weight. Titles align right without moving the
sidebar or its controls. Mixed-language titles retain their natural first-letter
reading direction; an English prefix is not forced to the end by RTL layout.
Native scrolling of long titles is preserved. Turning off font correction
restores the native title font.

## Save ChatGPT content as PDF or Word

1. Open the PDF menu in the ChatGPT conversation header. Choose the whole
   conversation, or Select response: click an answer (or use Previous/Next),
   then choose Export selected response. Escape or Cancel exits selection.
2. For a conversation, allow the temporary top-to-bottom collection to finish.
   Use Cancel, or scroll/touch/use a navigation key to stop it.
3. Inspect the extension preview: check the message count, beginning/end,
   missing-image notes, and any incomplete-collection warning.
4. Choose the PDF action and select Save as PDF in the browser dialog, or choose
   Download Word to save a real `.docx` file locally.

Word preserves editable text, lists, tables, code and supported MathML formulas.
Fonts are not embedded: install the selected family on the device opening the
file for consistent typography. Uploaded custom fonts use Tahoma in Word.
Browser layout and Word pagination can differ; inspect the file before sharing.
The converter loads only after choosing Word, not while browsing ChatGPT.

Collection reads the currently available branch from the page DOM, with no
conversation API. It restores the original scroll position if the route remains
the same. It stops at 20 seconds, 500 messages, or the serialized-content cap;
hidden or unavailable history is not guaranteed. Only already loaded images
whose pixels the browser permits are included, within the image-size cap;
protected or large images become text placeholders. Native MathML is retained
where available. See [the measured scope and limits](docs/font-pdf-validation.md).

## First-use help

New installations offer a short export tip in ChatGPT when the composer is not
focused, and three arrow tips on the first popup opening: direction, fonts and
math. Skip or finish to dismiss them. Replay from Help in the popup or Export
help in the ChatGPT export menu. Completion is local to the device; updates do
not restart the guide. No account is required.

## Storage and privacy

Preferences use chrome.storage.sync, so Chrome may sync them when browser sync
is enabled. The popup theme uses localStorage. Custom font bytes use
chrome.storage.local. PDF payloads use chrome.storage.session with at most two
recent previews; older entries are pruned when a new preview is created and
session data clears when Chrome closes. Export does not send conversations to
an account, API, or export server. Image export uses already loaded pixels and
does not fetch missing images. The Telegram action opens only when chosen.

The feature adds no permissions or host domains. Existing storage, tabs, and
scripting permissions support preferences and supported-site integration.

## Development and validation

```bash
npm run dev
npm test
npm run test:performance
```

Install Playwright's Chromium if it is not already available:

```bash
npx playwright install chromium
```

Tests build the production extension, check preserved scope and Windows motion,
exercise popup/font/storage/export failures, and load the real MV3 extension on
three isolated supported-origin fixtures. Actual PDF fixtures include Persian,
code, and math. They do not certify compatibility with current live accounts or
every remote website revision. Performance tests compare the original 244006e
baseline with current code and write results under artifacts/qa/; measured
increases and limits are reported in [current validation](docs/font-pdf-validation.md).
The [earlier popup-port report](docs/popup-validation.md) preserves historical figures.
See [Word and onboarding validation](docs/onboarding-word-validation.md) for the
new export, first-install behavior, live Chrome checks and scoped performance comparison.

## Project structure

- popup.html / popup.css / popup.js: popup preferences and font sample.
- background.js: existing worker behavior and bounded local PDF preview handling.
- src/shared/: direction/math/font integration and export sanitization/collection.
- src/chatgpt/: ChatGPT integration and scoped PDF actions.
- src/gemini/ and src/claude/: existing supported-site integrations.
- export.html / export.css / export.js: local preview and native print action.
- export-docx.js: lazily loaded local Word conversion.
- popup-tips.js / src/shared/tips.js: first-use guidance and replay.
- fonts/: bundled faces, source mapping, and open-font licenses.
- images/: supplied brand artwork; see [asset provenance](images/README.md).

Bug reports should name the affected service and describe the trigger. Community
updates are available on the [GptGate Telegram channel](https://t.me/GptGateAI).
