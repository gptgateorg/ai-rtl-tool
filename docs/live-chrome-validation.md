> The PDF interaction below records the earlier per-response design. The current header-menu implementation and its validation are in [pdf-controls-validation.md](pdf-controls-validation.md).

# Installed Chrome validation and compact refinement

## Changes

The user authorized installation and live testing in their existing Chrome,
correction of the streaming CPU increase, a compact visual refinement, and
removal of the successful-save sentence. This supersedes exact Windows control
size/timing parity while retaining the supplied brand and sun/moon artwork.

- Stream mutations queue the affected response, code block or composer. They
  no longer scan every earlier response on each token. Nested response roots are
  deduplicated and the 1.5-second composer/code scan has been removed.
- Restored the missing shared FONT_STYLE_ID constant. Tests now observe CDP
  isolated-world exceptions rather than relying only on Playwright pageerror.
- The installed ChatGPT renderer uses data-markdown-text-style="assistant-message"
  and data-user-message-bubble instead of the old role selectors. Font, direction,
  PDF role detection and stable export identity support both structures.
- Hydration can replace body or reset its classes after document_start. Observers
  reattach and restore only the extension state. Stream updates remain scoped.
- PDF controls survive replacement of a response's children. Activity summaries
  outside a message selection wrapper are excluded from PDF message discovery.
- Popup labels use the real IRANSansX Medium face at 13px/500, helpers 12px/400,
  a 4/8/12/16px spacing scale, quieter surfaces and one-pixel borders. Visible
  controls are smaller while hit targets remain at least 44px. Pointer motion is
  150ms without overshoot; keyboard and reduced motion remain immediate.
- Successful saves are silent. Errors/retry and actionable warnings remain.
  Tab acknowledgments cannot block persistence of later changes; stale replies
  cannot overwrite the latest feedback or busy state.

## Actual browser evidence

Installed the unpacked dist directory in the user's existing Chrome 155.0.8059.85,
using Chrome's Load unpacked UI. No profile copy, cookie extraction, account setup,
new permission, server deployment, or remote publishing was involved.

On real logged-in ChatGPT:

- Reproduced font failure on new-renderer messages, despite working composer fonts.
- Reproduced and corrected state loss during page hydration. After reloading the
  installed build, response and user text computed to the selected GPTGate face;
  both PDF controls appeared.
- Sent one public, synthetic test prompt in a separate conversation. Its response
  contained Persian and English paragraphs, a list, a formula and JavaScript.
- Selected IRANSansX, Vazirmatn, Shabnam and Sahel through the real popup. All four
  loaded and computed at weight 400 on the real response. Native site buttons
  retained their system font and code retained its monospace/LTR presentation.
- Opened a one-response preview and a whole-conversation preview through the real
  controls. They contained one and two messages respectively, with user/assistant
  order, the test code, stable identifiers and no horizontal overflow in the
  single-response preview. The whole-conversation preview retained LTR code.
- Restored the user's original conversation font preference (IRANSansX 800).
- Reloaded the final installed build and checked 13px/500 popup labels and the
  absence of the removed success sentence. A real save hides the status row.

Only structural metadata, counts and font measurements were recorded from the
existing user conversation. Export checks used the synthetic test conversation.
The live checks cover the observed ChatGPT renderer, not every account rollout.

Native Save as PDF remains the user's final print-dialog action. Printable PDF
files were generated and inspected in isolated Chromium by the automated suite;
this does not claim an automated save through the user's native Chrome dialog.
Custom font upload/error paths were tested in isolated MV3, not by overwriting a
custom file in the personal Chrome profile. Gemini/Claude remain fixture-tested.

## Automated validation

- Build and scope/permissions/resource integrity: pass.
- 99 popup checks, including a deliberately unresponsive first tab reply while
  a newer preference still persists; success stays silent.
- 64 compact typography/geometry/real transition, interruption and reduced-motion
  checks; light/dark, 320/390px, forced-color and keyboard coverage also pass.
- Real MV3 extension checks on three isolated supported-site fixtures: pass.
- 115 font/PDF feature checks: pass. The 30-message remounting fixture now also
  cycles the new selection-message, search-message and nested DIL identifiers,
  preserving exact order and two identical-but-distinct messages without warnings.
- Current-renderer regression suite: pass. Body replacement/class resets, font
  scope, streamed text/list/code, composer replacement, PDF rediscovery after
  response replacement and isolated-world exception checks are covered.
- Instrumentation in the actual isolated content-script world confirms zero
  rescans of an earlier unchanged response during the tested streaming updates.
- Independent review: the PDF-control replacement and slow-tab persistence
  regressions found during review were corrected and independently reproduced as
  resolved. Design finish review found no material blocker.

Raw local results/screenshots/PDFs are in artifacts/qa (ignored by Git).

## Performance

Baseline is original commit 244006e. Measurements use local deterministic fixtures
in isolated Chromium, alternating pairs and medians on this Mac. They measure
renderer TaskDuration, not OS-wide CPU percentage. These are controlled regression
results, not a claim about all real ChatGPT workloads or total personal-browser CPU.

| Metric | Original baseline | Final |
| --- | ---: | ---: |
| Site idle task time, 1.2 seconds | 0.893ms | 0.887ms |
| Site streaming task time, 60 updates / 40 messages | 109.562ms | 86.885ms |
| Site streaming layout time | 22.853ms | 24.040ms |
| Site frame interval P95 | 9.3ms | 9.2ms |
| Popup interaction task time | 102.124ms | 76.356ms |
| Popup interaction layout time | 5.681ms | 1.064ms |
| Popup decoded startup resources | 191492 bytes | 119439 bytes |

The five-pair site run reduced total streaming task time by 20.7%; layout alone
rose by 1.187ms and is not described as an improvement. Seven paired popup runs
reduced interaction task time by 25.2%. Unused conversation font families remain
unloaded. Raw data: site-performance.json and performance.json. The site CPU gate
was tightened from 35% + 10ms tolerance to 10% + 2ms scheduling tolerance; the
observed final result is below baseline, not merely below that threshold.

A live page frame probe was inconclusive because the tab remained hidden during
that capture. It is not used as evidence of real-site CPU or frame-rate parity.
