# Popup direction contract

Mode: Operate. Build directly from existing Windows source.

## Confirmed scope

Port the Windows visual language and motion to the existing Persian tool.
No account, login, subscription, new site UI, or new content-script behavior.
Keep every current preference and its storage key. Preserve the Claude-only
surface option as an existing tool, separate from the popup's own theme.

## First viewport

A compact brand header, a popup-only sun/moon theme control, two clearly named
direction controls, math/font switches, and truthful save feedback. The Claude
preference appears only on Claude. All ordinary controls remain within a 600px
Chrome popup; scrolling remains possible at increased font sizes.

## Source mapping

- Mint/Deep Ink tokens, IRANSansX 400/700: Windows settings `popup.css`.
- Direction control: Windows `.lang-switcher`, expanded from two to three
  equal columns. Same 4px inset, 44px targets, capsule, 360ms curve, press scale.
- Reading switches: Windows `.switch` / `.slider`, unchanged 64px track,
  28px thumb travel and 360ms curve, including RTL geometry.
- Popup theme: Windows sun-to-moon SVG and exact 100x52 geometry, 380ms curve.
- Surface: Windows solid panels, 28px radius, semantic colors and soft shadow.
- Adaptations: 390px popup, compact headings, no account/dashboard decoration.

## Motion contract

Pointer changes use interruptible CSS transforms. Keyboard changes and initial
state restoration are immediate. Reduced motion disables spatial transitions.
No timers, layout measurements or animation loops for control motion.

## Validation boundaries

Compare computed control geometry and sampled motion to a frozen Windows CSS
fixture. Exercise popup/storage/messaging failures, persistence, keyboard,
themes and forced colors. Compare baseline and final idle/startup/interactions.
Test the built Manifest V3 extension with its real worker and content scripts
against isolated supported-origin fixtures; do not use personal accounts.
Synthetic fixtures do not prove compatibility with every live website revision.
