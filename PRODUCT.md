# GptGate browser extension

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Persian speakers reading and writing mixed Persian, English and mathematical
content in ChatGPT, Gemini and Claude. Ordinary users should understand the
controls without knowing RTL/LTR terminology.

## Capabilities and constraints

- Independent response/composer direction: Persian/right, English/left, automatic.
- Existing math correction and Claude-only dark-surface preference.
- Conversation font family/weight selection: IRANSansX, Vazirmatn, Shabnam,
  Sahel, or a locally uploaded font, with an in-popup sample.
- ChatGPT-only PDF previews for an assistant response or the currently available
  conversation branch; the user finishes through the browser's native print UI.
- No GptGate account, login, subscription, conversation API, or export server.
- Existing preferences retain their Chrome Sync keys. New family/weight choices
  also use Sync; uploaded font bytes stay in chrome.storage.local on that device.
- Approved feature work extends the initial popup-only port to narrowly scoped
  message/composer fonts, ChatGPT export controls, local preview handling, and
  supplied Persian brand assets. It does not authorize a supported-site redesign.
- No new permissions, host access, runtime dependencies, or polling.
- Fonts load on demand. Control motion remains interruptible and respects reduced
  motion; performance claims must identify the measured fixture and limits.

## Brand commitments

Windows settings remain the authority for popup tokens, control geometry,
typography, and motion. The popup uses the supplied Persian wordmark; the
floating control uses the supplied standalone mark. Asset provenance is recorded
in fonts/README.md and images/README.md. The popup interface keeps its Windows
Regular/Bold faces; conversation font choices are a separate user preference.

## Evidence

The intended repository is gptgateorg/ai-rtl-tool. Original baseline: 244006e;
the earlier popup port was committed as a3330b1. Windows reference:
tests/fixtures/windows-settings.css, sourced from the sibling Windows settings
implementation. The earlier phase is recorded in docs/popup-validation.md;
current feature validation and limits are in docs/font-pdf-validation.md.

## Accessibility

Persian labels, native controls, visible focus, reduced motion, forced colors,
and truthful status/recovery messages. The idle ready sentence is omitted;
loading, save, warning, and error feedback remains. Font changes preserve native
site controls, code, mathematical notation, and icons. PDF previews expose
incomplete-collection and image limitations before the user prints.
