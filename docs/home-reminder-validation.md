# Home reminder text

Scoped CSS covers both native home suggestion structures: a button containing
icon/text, and a rich-text row over an independent button with inline links.
Text is right-aligned with plaintext bidi resolution and the selected family at
native weight. No new timer, observer, dependency, permission or DOM rewrite.

Validation:

- `npm test` passed in full, including the existing font, sidebar, motion,
  PDF/Word, onboarding, MV3 and integration checks.
- Renderer tests cover Persian with `4K`, English, an English-leading `PR #11`
  link, dynamic text, font toggling and 320px layout.
- Link, plain-row and dismiss clicks passed; independent review also checked
  the overlay button. No live reminder or link was activated during verification.
- Desktop/320px screenshots were inspected. Native clipping remains for long
  text; no container overflow or moved icon was observed.
- Personal Chrome showed all three existing home rows right-aligned with
  plaintext bidi, IRANSans and native weight 400. Before/after icon coordinates
  and 768px row widths matched exactly; the existing inline link remained.
- The personal home tab was reloaded only after verifying an empty composer.

Evidence: ignored `artifacts/qa/reminder-full-tests.log`,
`reminders-live-before.json`, `reminders-live.json`,
`home-reminders-desktop.png` and `home-reminders-320.png`.
Native selector changes may require future compatibility updates.
