# Onboarding, Word export and header readability

## Scope

Adds one first-install ChatGPT export hint and three first-popup tips, with
skip, completion and replay. Updates do not restart the guide. A serialized
local claim prevents several open tabs from displaying the first hint together.
Automatic guidance waits while typing and does not move focus or scroll.

The existing local export preview now downloads a real DOCX file as well as
offering native PDF printing. `docx@9.13.0` is pinned and dynamically imported
only after the Word action. No account, export server, new permission, host
access or content-script polling was introduced.

The single header export control remains in place. Its 52px slot uses the
native header surface color to keep underlying scrolling text from showing
through. The actual 44px button remains transparent and borderless. No export
buttons were added beneath responses.

## Automated checks

`npm test` passes against the current production build:

- Integrity: preserved engines/assets, unchanged permissions and host access.
- 99 popup checks and 64 typography, geometry, motion and accessibility checks.
- MV3 worker/storage/reopen checks on three isolated supported-site fixtures.
- 115 font, upload, sanitization, collection, preview, PDF and SPA checks.
- Current ChatGPT renderer/hydration and scoped streaming checks.
- 41 header, selection, keyboard, cancellation and native-control checks.
- New onboarding tests: install versus update, concurrent claims, typing during
  a delayed claim, focus preservation, Escape restoration, three popup steps,
  skip/replay and unchanged settings.
- New Word tests: actual download and OOXML content, Persian RTL and English
  LTR, code font/direction, lists, merged table cells, editable MathML conversion,
  local WebP-to-PNG conversion, safe links, invalid preview, 320px layout,
  lazy converter loading and no external requests.

Independent review reproduced the delayed-claim and Escape-focus regressions,
then confirmed their fixes. Final visual review found no blocking issue in
the ChatGPT tip, 390px popup, 320px dark font tip or 320px preview.

## Personal Chrome verification

The unpacked extension was reloaded in Chrome 155.0.8059.85. A dedicated
existing test conversation was opened, without sending another message.

- One header control, zero controls under answers, native Share preserved.
- Selected-answer preview contained one message; whole-conversation preview
  contained two. Both had enabled PDF controls, no horizontal overflow and LTR code.
- Cancel cleared the selection outline.
- Manual export help opened; Escape closed it and focused the trigger.
- Popup Help replayed direction, fonts and math, then completed.
- Header slot was `rgb(14, 14, 14)`, matching native `--color-surface: #0e0e0e`.
  The button remained transparent with a zero-width border.
- Word downloaded to the browser's Downloads directory. The 10,606-byte DOCX
  was a valid ZIP with RTL, editable math and Consolas code in its XML.

Initial scripted selection ran before live hydration settled and failed; after
waiting for the page to settle, the complete live toolbar check passed.
Fresh-install automatic behavior was tested in isolated MV3 profiles; the
existing personal profile was checked through manual replay without clearing
preferences or onboarding state.

Evidence is under ignored `artifacts/qa/`: `tips-word-full-tests.log`,
`tips-results.json`, `word-results.json`, `live-toolbar.json`,
`live-word-tips.json`, screenshots and the generated fixture DOCX.

## Performance

Site comparison used the immediately preceding commit `a01c42c`, built from a
Git archive with the same toolchain. Five alternating pairs ran in isolated MV3
Chromium profiles, with 40 messages, 1.2 seconds idle and 60 streamed updates.
Values below are medians in milliseconds:

| Metric | Previous | Current |
| --- | ---: | ---: |
| Idle task time | 1.118 | 0.708 |
| Stream task time | 83.634 | 62.276 |
| Stream layout time | 24.534 | 17.621 |
| Frame P95 | 9.3 | 9.3 |

All existing site budgets and unused-font checks passed. These are controlled
fixture measurements, not a claim that every live ChatGPT conversation will
use less CPU. The converter chunk is approximately 723 KB minified and is
absent from site browsing and initial preview requests; it loads on Word click.

The existing popup benchmark also passed, using its original `244006e`
baseline and seven alternating pairs. Startup DOM time was 11.9 → 15.6 ms,
idle task time 0.612 → 0.888 ms, interaction task time 90.061 → 65.968 ms,
and frame P95 stayed 9.2 ms. The small startup/idle increases remain within
the existing noise budgets; this comparison includes all earlier popup changes.
Raw results are in `tips-word-popup-performance.log` and `performance.json`.

## Remaining limits

Microsoft Word and LibreOffice were not installed, so native Word rendering
and pagination were not verified. The browser download and OOXML structure
were verified. Fonts are not embedded; the selected bundled family must be
installed on the opening device, and uploaded custom faces use Tahoma.
Browser/PDF and Word layouts can differ. Existing collection limits and
missing-image warnings still apply. Native Save as PDF requires the user's
final action in the print dialog.

The packaged ZIP was regenerated and checked to contain exactly the current
52 files in `dist`. Nothing was pushed or published.
