# Popup direction and reading contract

Mode: Operate. Preserve the Windows control world while extending the existing
Persian utility with the features explicitly approved after the initial port.

## Approved scope

The initial popup-only phase was committed as a3330b1. The current approved
extension adds family/weight selection and a local font upload, ChatGPT PDF
previews for the available conversation branch and individual assistant
responses, supplied Persian brand artwork, and removal of the idle ready sentence.
The font and export integrations require scoped content/worker/resource changes;
the old prohibition on all such edits applied to the earlier popup phase.

No account, login, subscription, export server, supported-site redesign, new
permissions/hosts, runtime dependency, or polling is included. Preserve existing
preference keys and the separate Claude-only surface option.

## First viewport and expansion

Use the supplied Persian wordmark opposite the popup-only sun/moon switch,
then the two direction groups and reading switches. Font controls live in a
native disclosure: family and weight selects, a Persian/English sample, local
upload/removal, and clear device-only storage feedback. Ordinary collapsed
controls remain compact in the 390px popup; expanded settings and enlarged text
may scroll. Hide the idle ready sentence while keeping truthful action/error
feedback. The Claude-only row remains contextual to Claude.

## Source mapping

- Mint/Deep Ink tokens and popup IRANSansX 400/700: Windows settings reference.
- Direction selector: source capsule expanded from two to three equal columns;
  4px inset, 44px targets, 360ms curve, and source press scale.
- Reading switch: source 64px geometry, 28px thumb travel and RTL reversal.
- Theme switch: source sun/moon SVG, 100 × 52px geometry, 48px travel, 380ms curve.
- Panels: opaque themed fills, 28px corners, and source soft shadow.
- Wordmark and marks: supplied brand archive; provenance in ../images/README.md.
- Conversation fonts: separate on-demand assets, not replacements for popup UI.

## Motion and accessibility

Pointer selection is interruptible; keyboard changes and state restoration are
immediate. Reduced motion disables spatial transitions. Font disclosure and
selects use platform controls, visible focus, and existing semantic colors.
No animation loops, motion timers, or layout measurement is added to controls.
PDF actions are scoped extension controls with named actions, cancel/status
feedback, keyboard focus, and reduced-motion treatment.

## Validation boundaries

Keep token/geometry/motion comparisons against tests/fixtures/windows-settings.css.
Validate popup persistence/errors, local uploads/fallbacks, protected native UI,
font loading, DOM sanitization, virtualized collection limits/cancel, actual PDF
content, and real MV3 fixtures. Record performance with the test method and
observed changes. Current evidence is in font-pdf-validation.md; earlier
popup-only numbers remain historical in popup-validation.md. Fixtures do not
prove current live-site compatibility or Windows hardware behavior.
