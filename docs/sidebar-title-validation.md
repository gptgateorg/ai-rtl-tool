# Sidebar title alignment

The user requested right-aligned ChatGPT sidebar titles without moving the
sidebar or sending an initial English word to the opposite end of mixed text.

The fix scopes CSS to native conversation and project title viewports.
Safe end alignment preserves the existing marquee origin when text overflows.
Plaintext bidi resolution treats the title as a complete string rather than
letting native isolated Latin wrappers determine the wrong paragraph direction.
No text, `dir` attributes, links, row controls or sidebar positions are rewritten.
The selected font family applies at the native interface weight, independent
of the conversation font weight. No observer, timer or dependency was added.

## Verification

- `npm test` passed, including all existing popup, font, export, onboarding,
  motion, MV3 and renderer checks.
- The renderer fixture now covers English-first and Persian-first mixed titles,
  pure English, project titles, overflowing text, marquee transforms, dynamic
  title replacement and body hydration.
- At desktop and 320px, title text is right-aligned while sidebar and icon/menu
  coordinates are unchanged. Selecting Vazirmatn with conversation weight 900
  leaves sidebar weight 400. Disabling font correction restores the native face.
- Screenshots `artifacts/qa/sidebar-titles-desktop.png` and
  `sidebar-titles-320.png` were inspected together.
- In personal Chrome 155, 16 native title viewports matched the new rules.
  The sidebar stayed at x=0 with width 340px. Visible short titles aligned right,
  used IRANSans at weight 400, and resolved bidi with `plaintext`.
- Existing ChatGPT tabs were refreshed only after checking for an empty composer.
  The user's existing tab showed the same sidebar geometry and corrected font/
  alignment afterward. No prompts, conversations or preferences were changed.
- An independent bounded review found no functional blocker. Its question
  about wrapper nesting was clarified: the native title itself is the viewport;
  the fixture follows title/viewport → clip → track → content.

## Performance scope

Five alternating MV3 fixture pairs compared the previous `806cf45` build with
the current build: 40 messages, 1.2s idle and 60 streamed updates. Median task
time was 1.155 → 0.978 ms idle and 76.391 → 48.989 ms streaming; frame P95 was
9.3 → 9.2 ms. All existing budgets passed. These noisy synthetic conversation
measurements establish no observed regression within the test; they do not
prove a CPU improvement or benchmark a large live sidebar.

Raw evidence is in ignored `artifacts/qa/sidebar-full-tests.log`,
`sidebar-performance.log`, `sidebar-live.json` and
`sidebar-existing-tab-final.json`. Native markup changes may require selector
maintenance in the future.
