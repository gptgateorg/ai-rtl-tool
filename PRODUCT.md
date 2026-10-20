# GptGate browser extension

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Persian speakers reading and writing mixed Persian, English and mathematical
content in ChatGPT, Gemini and Claude. Ordinary users should understand the
controls without knowing RTL/LTR terminology.

## Capabilities and constraints

- Response and composer direction: Persian/right, English/left, automatic.
- Existing math, Persian font and Claude dark-surface preferences.
- No GptGate account, login, subscription or remote account service.
- Preserve the existing Chrome Sync preference keys and supported-site behavior.
- This redesign changes the extension popup only. Do not redesign host websites,
  modify content scripts, add permissions or alter the service worker.
- Preserve performance; no runtime UI or animation dependency.

## Brand commitments

The user explicitly selected the Windows client's current controls, assets,
typography and motion as the visual authority, using Impeccable and Emil guidance.

## Evidence

The user confirmed `gptgateorg/ai-rtl-tool` as the intended repository.
Its original implementation is commit `244006e`.
Windows settings source: `gptgate-window/browser-v2/src/renderer/settings/`.
The unrelated `ex` checkout is preserved outside this repository.

## Accessibility

Persian labels, visible keyboard focus, native controls, reduced-motion and
forced-colors support. Success means usable settings and accurate feedback.
