# Claude and Gemini validation

## Scope and status

Local version 0.1.2, tested in the owner's Google Chrome 155.0.8059.85 on
macOS. The unpacked extension was reloaded through Chrome's extension manager.
No upload, store submission, publication, account configuration or other
extension change was performed.

Claude was tested on the real authenticated site with a new public synthetic
conversation. Gemini's real `https://gemini.google.com/app` tab returned Google's
403 page. Its live composer, responses, streaming and CPU remain unverified;
fixture success is not live Gemini approval. The owner was asked to restore
normal Gemini access. Release readiness remains conditional on that check.

## Changes

- Remove recurring Claude/Gemini document scans and panel placement polls.
  Batch only changed response blocks, editors and code containers. Keep native
  resize/DOM observation and Claude transition-end placement updates.
- Fix equal-length response edits invalidating Claude's direction cache, and
  read textarea values correctly.
- Apply Claude composer direction despite native CSS and paragraph replacement,
  without rewriting ProseMirror paragraph attributes.
- Keep one input/composition listener per editor even if a detached editor is
  reinserted. Preserve Gemini's per-paragraph automatic direction through CSS
  without changing native paragraph attributes.
- Stabilize the MV3 test startup: wait for worker listener readiness using a
  Node timer, since the earliest worker context can precede timer initialization.

## Real Claude checks

Passed on the installed unpacked extension:

- IRANSans, Vazirmatn, Shabnam and Sahel, each at weights 400 and 700; font changes
  reach existing replies and the composer. Native code font and LTR math survive.
- Forced response RTL/LTR, automatic Persian/English/mixed-language composer,
  replacement of native composer paragraphs and reuse after sending.
- Forced composer RTL/LTR, sidebar collapse/expand with the extension panel
  remaining inside the viewport, navigation to a new chat and back.
- Font, math and Claude dark-surface toggles; custom open-source WOFF2 upload,
  application, persistence after page reload and removal.
- A second real streamed reply with Persian and English paragraphs, JavaScript
  code and math. Newly rendered Persian paragraphs receive RTL and the chosen
  font; code/math remain LTR.

Original settings restored: response/composer auto, IRANSans 500, font fix on,
math fix on, Claude dark surface on. The temporary uploaded QA font was removed;
no existing user font or draft was replaced. Only public synthetic prompts were
sent. The test conversation remains available in the user's history.

Local evidence: `artifacts/qa/claude-live-functional.json`,
`claude-extra-live.json`, `claude-stream-live.json`, `claude-navigation-live.json`
and the `real-cpu-*.json`
files in that same directory. These are actual Chrome checks, distinct from
headless fixtures below.

Chrome's retained error ledger contains one early QA-injected `popup.html:1`
error: Apple Events JavaScript cannot access `chrome.storage` in its isolated
world. Subsequent checks used the actual popup controls. This is recorded in
`artifacts/qa/real-chrome-error-ledger.json`; the entry was preserved rather than
cleared, and is not an error in a packaged source file.

## CPU measurement

Each row uses three ten-second samples of OS cumulative CPU time for the actual
Claude renderer. Chrome Process Internals resolves its renderer client ID,
which is matched to the OS PID. The tab stays visible and focused, generation
has finished, and the composer is blurred. A value of 100% means one CPU core.
Other installed extensions remain enabled and are included, together with
Claude itself. Headless test suites were not run during these samples.

| Conversation | Extension state | Median of three samples |
| --- | --- | ---: |
| First synthetic reply | Previous implementation on | 47.33% |
| First synthetic reply | Off | 41.22% |
| First synthetic reply | Fixed implementation on | 37.75% |
| First synthetic reply | Off, repeat | 40.84% |
| After second synthetic reply | Fixed implementation on | 40.06% |
| After second synthetic reply | Off | 40.05% |

The final same-conversation on/off comparison is effectively equal (40.06% vs
40.05%). No sustained added idle CPU cost was detectable in these short samples.
The initial implementation's measured median was higher, but the native page
and other extensions are noisy; these measurements do not establish a precise
causal saving or a zero-overhead guarantee. The roughly 40% renderer baseline
also exists with GptGate off. Real Gemini and prolonged real streaming CPU are
not characterized by this idle comparison.

## Automated checks and review

`npm test` passed: build, scope/permissions/locales, 99 popup checks, 64 motion
checks, real MV3 isolated fixtures, the new engine regression test, 115 feature
checks, current ChatGPT renderer fixture, 41 PDF control checks, onboarding and
Word export. Existing PDF/Word coverage is for ChatGPT, not a claim of those
features on Claude/Gemini.

The new engine regression exercises both sites in a real Chromium extension
context with synthetic DOM: no recurring document queries over 3.2 seconds idle;
60 streamed text mutations do not read older replies; equal-length language
changes; textarea input; native editor paragraph replacement; detach/reinsert
without accumulating listeners; Gemini multiline bidi; forced modes; code/math
and native button preservation; no isolated-world exceptions. The original
build fails the idle-query assertion (two queries instead of zero), confirming
that the regression test detects the previous polling behavior.

An independent reviewer reproduced two issues (duplicate Claude listeners and
Gemini multiline direction), then verified both fixes. The test startup change
was also reviewed. No dependency or host/permission expansion was introduced.

## Outstanding before publication

1. Restore normal Gemini access in the owner's Chrome profile, then run real
   font/weight/upload, direction, multiline input, code/math, streaming,
   navigation and on/off CPU checks. The 403 page is not a supported-site test.
2. Complete the existing public privacy-policy URL and store draft approval
   requirements in `store/README.md`.
