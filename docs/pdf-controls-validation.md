# ChatGPT header PDF control

## Scope

Replaces the response-level controls and ChatGPT floating badge with one header
PDF trigger. Its menu offers the whole conversation or a temporary response
picker. The picker supports click, Previous/Next, explicit export, Cancel and
Escape. It leaves native links, copy actions, the composer and text selection
usable. The supplied standalone mark and the approved love attribution sit in a
small footer below the options. Gemini and Claude retain their existing controls.

The menu uses native popovers and local extension fonts, with no new dependency,
permission, account, service or network upload. The local preview, sanitization,
collection bounds and native print path remain the existing implementation.
No persistent controls are attached to responses. Selection listeners exist only
while selecting. ChatGPT floating-panel polling, mutation and resize watchers,
placement geometry and CSS were removed.

Header discovery supports the observed app-shell layout and older named action
slots. If neither exists, one normal-flow toolbar is prepended to main. Unknown
future ChatGPT layouts may need selector updates. Selecting a response covers
currently mounted answers; users can scroll to other answers. It does not load
the entire history just to populate a separate index.

## Automated verification

- Build and integrity: unrelated engines/assets and permissions preserved.
- 99 popup checks and 64 motion/compact geometry checks.
- Real MV3 worker/storage tests on three isolated site fixtures.
- 115 font/PDF feature checks, including sanitization, virtualized history,
  collection cancellation/limits and real generated PDF files.
- Current-renderer tests: hydration/body reset, scoped fonts and streaming,
  zero rescans of unchanged earlier responses, and isolated-world exceptions.
- 41 header/picker checks: keyboard, outside dismissal, native copy/composer,
  320/1000px light/dark, reduced motion, cancellation/focus, header replacement,
  navigation, and same-node identity reuse including nested DIL identifiers.
- Independent code and visual review. Corrected stale DIL selection, menu arrows
  affecting the composer, and focus restoration after collection cancellation.

Screenshots and generated PDFs are in ignored artifacts/qa. The final screenshots
include the footer mark's light/dark contrast correction. No visual blocker was
reported by the independent design review.

## Actual installed Chrome

Tested the unpacked dist in Chrome 155.0.8059.85 with the existing personal profile,
using the dedicated public test conversation created earlier in this task.

- Exactly one control in the real conversation header; 44px trigger; zero controls
  under responses; no floating badge. The native Share control remains present.
- Clicking the real assistant text selects one answer. Its preview contains one
  assistant message, retains LTR code and has no horizontal overflow.
- Whole-conversation preview contains two messages in user/assistant order,
  retains LTR code and has no horizontal overflow.
- Cancel removes the answer outline and closes the picker.
- Both previews enable the native print action. No account or remote PDF service
  is involved; existing conversation font preferences were not changed.

Raw structural results: artifacts/qa/live-toolbar.json. Test scripts must foreground
the real ChatGPT tab and wait for hydration; inspecting a hidden/loading tab can
otherwise produce false failures. Native Save as PDF is still the user's final
print-dialog action. Actual PDF files are verified in isolated Chromium; this
report does not claim saving a file through the personal browser's native dialog.

## Performance

Compared against the immediately preceding installed build, commit 4aab690,
preserved as artifacts/pre-toolbar-dist. Five alternating pairs use isolated
MV3 Chromium, 40 messages, 1.2 seconds idle and 60 streamed text mutations. They
measure renderer task time, not OS-wide CPU percentage. Frame/idle/streaming
regression budgets remain unchanged. A first run overlapped live-browser testing;
its raw result is preserved as toolbar-performance-first.json. The final run is
performed after live checks, without another test suite running concurrently.

| Median metric | Previous build | New header control |
| --- | ---: | ---: |
| Idle task time / 1.2s | 0.904ms | 0.917ms |
| Streaming task time / 60 updates | 75.300ms | 53.568ms |
| Streaming layout time | 20.232ms | 15.199ms |
| Frame interval P95 | 9.1ms | 9.3ms |

Final controlled run passes all existing budgets. Streaming task time is 28.9%
lower in this run; idle differs by 0.013ms. The earlier overlapping run also
passed budgets, but recorded 93.374→97.490ms streaming and 1.491→0.893ms idle.
Both runs are retained rather than treating one sample as an absolute CPU claim.
The independent zero-old-response-rescan regression also passes. No OS-wide
personal-Chrome CPU percentage or universal performance guarantee is claimed.

