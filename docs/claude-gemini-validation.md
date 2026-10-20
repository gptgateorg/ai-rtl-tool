# Claude and Gemini validation

## Scope and status

Local version 0.1.2, tested in the owner's Google Chrome 155.0.8059.85 on
macOS. The unpacked extension was reloaded through Chrome's extension manager.
No upload, store submission, publication, account configuration or other
extension change was performed.

Both Claude and Gemini were tested on the real authenticated sites with new
public synthetic conversations. Gemini initially returned Google's 403 page;
after the owner restored normal access, its live tests were completed in the
same Chrome profile. No network, proxy or account settings were changed by the
agent. Store publication requirements remain separate from these checks.

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

## Real Gemini checks

Passed on the same installed unpacked extension after access was restored:

- IRANSans, Vazirmatn, Shabnam and Sahel at 400/700 in existing responses and
  the composer. Actual FontFace entries reached `loaded` for every family.
- Forced response and composer RTL/LTR, automatic Persian/English/mixed input,
  and a two-paragraph English/Persian draft with independently correct visual
  alignment. Code and mathematical expressions retained LTR.
- Font/math toggles, a temporary open-source WOFF2 upload, its successful load
  after a real page refresh, and removal with IRANSans 500 restored.
- A second real streamed response including Persian/English paragraphs, a
  table, JavaScript and math; the composer was usable again after sending.
- Navigation to a new chat and back, extension panel bounds, and preservation
  of native button/icon fonts.

The initial refresh check used a fixed delay that expired before Gemini had
finished loading. The completed check instead waited for the actual response,
composer and uploaded FontFace to be ready; no product fix was needed. Only
known QA drafts were cleared, the temporary font was removed, and the original
preferences were restored. The public test conversation remains in history.
Final restoration confirmed both site engines active and the original popup
preferences intact; Gemini was on its new-chat homepage. Temporary QA utility
tabs were closed. See `artifacts/qa/gemini-final-chrome-state.json`.

Evidence: `artifacts/qa/gemini-live-functional.json`,
`gemini-stream-live.json`, `gemini-navigation-live.json` and
`real-cpu-gemini-*.json` in that directory. These are real Chrome tests, not
fixture results. This follow-up did not change runtime source or the built ZIP.

## CPU measurement

Each row uses three ten-second samples of OS cumulative CPU time for the actual
site renderer. Chrome Process Internals resolves its renderer client ID,
which is matched to the OS PID. The tab stays visible and focused, generation
has finished, and the composer is blurred. A value of 100% means one CPU core.
Other installed extensions remain enabled and are included, together with
the site itself. Headless test suites were not run during these samples.

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
also exists with GptGate off. Prolonged real streaming CPU is not characterized
by this idle comparison.

### Gemini controlled comparison

Both states use the same two-reply conversation. Before each reload the old
`performance.timeOrigin` is recorded; the test waits for a different document,
complete page/fonts, responses and composer, then settles for 30 seconds. Every
sample verifies visibility, two responses, no generation and unchanged document
identity. This avoids counting an old page or navigation work as idle time.

| Extension state | Median, one core | Sample range |
| --- | ---: | ---: |
| On | 32.97% | 31.67–36.34% |
| Off | 32.16% | 30.57–33.57% |

The measured median difference is **+0.80 percentage points of one core**.
This is a small positive difference, not a zero-overhead result. The sample
ranges overlap; short sequential samples cannot isolate that difference from
native site and other-extension variability. No new functional failure or
repeated idle document scan was found, but strict zero added CPU is not proven.

Earlier exploratory CPU files are retained but not used for this comparison:
the initial readiness check could accept the old document before a reload
committed. A temporary no-blur panel probe did not establish an improvement;
it was removed and no rendering or runtime source change was retained. A
separate ten-second real idle DOM observation recorded no child-list/text
changes. The documented controlled result takes precedence over preliminary
numbers in progress updates.

Evidence: `artifacts/qa/gemini-controlled-cpu-summary.json`,
`gemini-controlled-on-readiness.json`, `gemini-controlled-off-readiness.json`,
`real-cpu-gemini-controlled-on.json` and `real-cpu-gemini-controlled-off.json`.

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

Complete the existing public privacy-policy URL and store draft approval
requirements in `store/README.md`. The live Gemini access blocker is resolved.
