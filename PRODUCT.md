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
- ChatGPT-only local previews for an assistant response or the currently available
  conversation branch; PDF uses native print and Word downloads a real DOCX file.
- First-install contextual guidance for PDF export and popup preferences, with
  skip and replay. Updates preserve completion and do not restart onboarding.
- No GptGate account, login, subscription, conversation API, or export server.
- Existing preferences retain their Chrome Sync keys. New family/weight choices
  also use Sync; uploaded font bytes stay in chrome.storage.local on that device.
- Approved feature work extends the initial popup-only port to narrowly scoped
  message/composer fonts, ChatGPT export controls, local preview handling, and
  supplied Persian brand assets. It does not authorize a supported-site redesign.
- ChatGPT sidebar conversation/project titles are right-aligned and use the
  selected font family at native interface weight. Preserve first-strong text
  direction, long-title marquee, sidebar placement and row controls.
- Home reminder/suggestion text receives the same narrowly scoped alignment and
  font-family correction; native icons, links and row actions remain in place.
- No new permissions, host access, or polling. The DOCX converter is the one
  scoped runtime dependency: loaded only after choosing Word in the preview,
  never in supported-site content scripts or the popup.
- Fonts load on demand. Control motion remains interruptible and respects reduced
  motion; performance claims must identify the measured fixture and limits.

## Brand commitments

Windows settings supply the brand and sun/moon artwork. The user-approved
compact refinement supersedes their exact geometry: 13px/500 labels, a 4px
spacing scale, understated borders and 150ms pointer feedback. The popup uses the supplied Persian wordmark; the
ChatGPT PDF menu carries a small love attribution and the standalone mark.
Gemini/Claude keep their existing floating control. Asset provenance is recorded
in fonts/README.md and images/README.md. The popup interface keeps its Windows
Regular/Medium faces; conversation font choices are a separate user preference.

## Evidence

The intended repository is gptgateorg/ai-rtl-tool. Original baseline: 244006e;
the earlier popup port was committed as a3330b1. Windows reference:
tests/fixtures/windows-settings.css, sourced from the sibling Windows settings
implementation. The earlier phase is recorded in docs/popup-validation.md;
current feature validation and limits are in docs/font-pdf-validation.md.

## Accessibility

Persian labels, native controls, visible focus, reduced motion, forced colors,
and truthful status/recovery messages. Idle ready and successful-save sentences are omitted;
loading, save, warning, and error feedback remains. Font changes preserve native
site controls, code, mathematical notation, and icons. PDF previews expose
incomplete-collection and image limitations before the user prints.
