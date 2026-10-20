# Font, PDF, and Persian branding validation

## Approved scope and phase

Repository: gptgateorg/ai-rtl-tool. Original baseline: 244006e; initial Windows
popup port: a3330b1. The user subsequently authorized conversation font family
and weight choices, custom local upload, ChatGPT whole-conversation/assistant
response PDF export, supplied Persian artwork, and removal of the idle ready
sentence. This extends the previous popup-only scope to the needed content,
worker, and packaged-resource paths. The [earlier report](popup-validation.md)
retains its historical scope and numbers.

No account/login, conversation API, export server, runtime dependency, new
permissions/hosts, polling, or supported-site redesign is added.

## Recorded checks

artifacts/qa/final-tests.txt records a successful production build and:

- Scope integrity: six unrelated engines/assets preserved, permissions and host
  access unchanged, and export resources packaged.
- 96 popup checks covering platforms, preferences, persistence, keyboard,
  reduced motion, forced colors, errors/retry, rapid input, and narrow layouts.
- 284 Windows token/geometry/motion comparisons in light, dark, and reduced motion.
- Real MV3 tests on three intercepted supported-origin fixtures, using the actual
  worker, storage, broadcasts, reopen, and worker suspension.
- 111 feature checks covering catalog weights, upload validation/storage/errors,
  missing local fallback, sanitization, virtualized collection/cancel/caps,
  SPA behavior, native UI/code/math preservation, local previews, and PDFs.
  The count includes three uploaded-face loading checks.

After the scoped UI-font correction below, artifacts/qa/final-features.txt and
features-results.json record 112 passing feature checks, including direct
registration/loading of the PDF-control UI face. The earlier 111-check full-run
log remains historical; the post-fix feature result is the current feature count.

Machine-readable results are artifacts/qa/features-results.json,
popup-results.json, motion-results.json, and extension-results.json. The feature
fixture collected 30 virtualized messages. No personal profile was used.

A fresh independent design pass reviewed nine fixture captures and returned
SHIP for local delivery with no requested visual fixes. The named Impeccable
finish role was unavailable; a design-lead used the fallback review contract.
The mechanical detector ran once; its existing findings were reviewed in context
as source-pinned/semantic warnings or false positives, without suppressions or
another scan. Its output is artifacts/qa/feature-design-detector.json.

## Scoped UI-font correction

After the first full test pass, the coordinator found that a UI @font-face
inside each PDF-control shadow root was not registered in Chromium: controls
used fallback text. The correction registers one native GPTGateUI FontFace with
document.fonts and reuses one constructed CSSStyleSheet across the shadow
controls. The 112-check feature rerun passed after the correction, including an
actual loaded-face assertion. Refreshed site performance is recorded separately
below; the old empty resource-timing font lists are not font-loading proof. Independent
review of the correction found no actionable issue and checked single-face
registration, shared stylesheet reuse, rerendering, and graceful font-load failure.

## Font behavior and storage

The popup interface retains Windows Regular/Bold. Conversation choices are
IRANSansX, Vazirmatn, Shabnam, Sahel, and a custom uploaded face; weights follow
[the catalog and provenance](../fonts/README.md). Fonts are selected on demand;
the collapsed popup disclosure does not request sample fonts. Family/weight
choices use Chrome Sync. Uploaded bytes use chrome.storage.local; a custom
choice without a local record falls back to Vazirmatn. Custom uploads accept
WOFF2/WOFF/TTF/OTF up to 2 MiB and must pass native browser parsing. Native site
controls, icons, code, and math are excluded from conversation font overrides.

## Collection, preview, and PDF boundaries

- Only ChatGPT exposes PDF actions. A response action captures that assistant
  message; conversation capture reads the available branch from the DOM.
- Conversation capture waits for top history to settle, then traverses downward,
  deduplicating by stable message IDs when available. It filters nested and
  hidden/inert message containers. Missing stable identities trigger a warning.
- Limits: 20 seconds, 500 messages, and 1.5 × 1024² serialized-message characters
  (JSON string length). The worker separately limits the serialized payload to
  2 × 1024² characters. These are bounded capture limits, not a completeness claim.
- Cancel, wheel/touch, navigation keys, and route changes stop collection. Scroll
  position is restored when the route remains unchanged. Collection does not use
  a conversation API or fetch hidden history from an account service.
- The worker accepts only HTTPS ChatGPT sender hosts and creates a local extension
  preview. At most two recent previews are retained in chrome.storage.session;
  old entries are pruned during new-preview creation, including entries older
  than 30 minutes. This is not an automatic 30-minute expiry timer. Chrome clears
  session storage when it closes.
- Content is sanitized during capture and again before preview rendering.
  Semantic MathML is retained once instead of duplicate visual math trees;
  code keeps LTR treatment. Structural node/depth limits fail explicitly.
- Images use already loaded, canvas-readable pixels or accepted raster data;
  protected/unavailable/oversized images become textual placeholders. There is
  no export image fetch. Raster dimensions cap at 2048px and encoded data must
  remain below the 1 MiB string-length cap per image.
- The preview warns about incomplete collection, unstable identities, images,
  and unavailable history. The user checks count and endpoints, then chooses
  the print action and native Save as PDF.

Actual outputs: artifacts/qa/response-fa.pdf and conversation-fa.pdf. Recorded
pypdf extraction retained Persian/code and avoided duplicate visual math text;
the conversation PDF was rendered with Poppler and visually inspected at
.impeccable/review/conversation-pdf-render.png. These are synthetic local PDFs,
not live-account export acceptance.

## Measured popup performance

artifacts/qa/performance.json: Chromium 140.0.7339.16, seven alternating paired
runs after warmup, local source routing, a one-second idle window, and an 800ms
interaction frame sample; medians on this Mac against original 244006e.

| Metric | Original | Current measured state |
| --- | ---: | ---: |
| DOMContentLoaded | 14.4 ms | 13.5 ms |
| Load event | 15.5 ms | 16.8 ms |
| Idle task time / 1s | 0.444 ms | 0.440 ms |
| Interaction task time | 83.724 ms | 73.790 ms |
| Interaction layout time | 5.347 ms | 0.653 ms |
| 95th-percentile frame interval | 9.2 ms | 9.2 ms |
| Decoded local resources | 191492 bytes | 119373 bytes |

Popup interaction/layout work fell in this sample; load event time rose by
1.3ms. Resource figures describe loaded/decoded local resources, not total
packaged font size. They are not a guarantee for every device or usage pattern.

## Site performance before the UI-font correction

artifacts/qa/site-performance-before-font-fix.json: five
alternating pairs in isolated MV3 Chromium, 40 fixture messages, a 1.2s idle
window, and 60 streamed updates; medians.

| Metric | Original | Current measured state |
| --- | ---: | ---: |
| Idle task time | 0.899 ms | 0.996 ms |
| Streaming task time | 112.541 ms | 131.513 ms |
| Streaming layout time | 24.473 ms | 25.873 ms |

The configured fixture budgets passed, but these site medians increased:
streaming task time rose by 18.972ms (about 16.9%) and layout by 1.400ms (about
5.7%). This result does not establish zero regression. These values are preserved as before-fix evidence; refreshed measurements for
the completed FontFace/shared-stylesheet correction are reported below. The prior resource-timing font list was empty for both
variants due to extension-resource isolation; it is not proof that a face loaded.
The post-fix feature test now asserts the actual loaded face, and the refreshed
site test also records native FontFace state and frame intervals.

## Site performance after the UI-font correction

The refreshed artifacts/qa/site-performance.json and final-site-performance.txt
use the same five-pair, 40-message, 60-update fixture method. Native FontFace
state now confirms GPTGateUI at 400 and the selected GPTGate IranSans at 500
across the current samples; unused family faces do not load. Resource-timing
entries are not used as proof of font registration.

| Metric | Original | Current after fix |
| --- | ---: | ---: |
| Idle task time | 1.729 ms | 1.495 ms |
| Streaming task time | 98.850 ms | 112.490 ms |
| Streaming layout time | 20.089 ms | 22.587 ms |
| 95th-percentile frame interval | 9.2 ms | 9.2 ms |

Configured idle/streaming budgets passed and the measured frame interval is
unchanged. Streaming task time increased by 13.640ms
(about 13.8%) and streaming layout by
2.498ms (about 12.4%). The current fixture also includes
21 export-control instances and the selected new font. The additional streaming
task time is about 0.227ms per fixture update across 60 updates. These results document
the measured tradeoff; passing budgets and equal frame intervals do not establish
zero CPU/layout regression or guarantee live-site performance. The separate
popup numbers above were not remeasured for this site-only font-registration fix.

## Assets and remaining limits

The four supplied brand files and nine IRANSansX weight files were checked
byte-for-byte against the parent archives; mappings are in
[images/README.md](../images/README.md) and [fonts/README.md](../fonts/README.md).
The coordinator also checked representative built logo/mark/font bytes. The
pre-existing Vite duplicate images/logo.png warning remains; it is not a new
feature warning. No account, remote publication, or personal-profile install was
used. Current live ChatGPT/Gemini/Claude revisions and Windows hardware remain
untested; fixtures cannot guarantee future remote DOM compatibility.
