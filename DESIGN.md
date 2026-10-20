---
name: "GptGate Persian Tool Popup"
description: "Compact Persian utility with the Windows brand and responsive controls."
---

# Design System: GptGate Persian Tool Popup

## Direction

Mode: Operate. The user's compact utility refinement supersedes exact Windows
control dimensions and timing. Keep its mint/deep-ink brand, supplied Persian
wordmark, sun/moon artwork and familiar interactions. Reduce competing emphasis;
make text hierarchy through weight and contrast rather than large sizes.
The frozen Windows CSS remains historical reference, not the current geometry
acceptance contract. No website UI redesign is part of this surface.

## Typography and spacing

Use real IRANSansX Regular 400 and Medium 500 faces, with font synthesis disabled.
Body and labels: 13px/20px; labels and direction choices: 500. Supporting text:
12px/400. Conversation font settings are independent of this UI type scale.
The supplied wordmark occupies 132 by 44px and retains its original artwork.

Layout spacing uses 4, 8, 12 and 16px. The popup is 390px wide with a 320px
fallback, 12px outer padding and 16px panel insets. Panels have 12px corners,
a subtle one-pixel border and no shadow. Small controls have 8px corners.
Muted, slightly green neutral surfaces let selected controls carry the brand.
Light: canvas #F4F7F6, white surface, #EDF2F0 track, #0D3B32 text.
Dark: canvas #101A17, #18231F surface, #101A17 track, #DFF7EE text.
Use semantic CSS variables for secondary text, errors, focus and selected states.

## Controls

- Direction: three equal columns, 44px hit height, 4px selection inset and 8px
  selected-surface corners; retain physical LTR/auto/RTL ordering.
- Reading switches: 44 by 44px hit area, 44 by 24px visual track, 18px thumb,
  20px RTL-aware travel. The center indicator retains the Windows cue.
- Theme: 64 by 44px hit area, 64 by 32px visual track, 24px thumb, 32px travel,
  18px sun/moon artwork. This only changes the popup theme.
- Native font disclosure/selects remain keyboard accessible and at least 44px
  high. The preview is 14px and uses the selected conversation face/weight.
- Successful saves are silent. Errors and actionable warnings remain visible
  with retry where appropriate; asynchronous saving exposes aria-busy.

## Motion

Pointer feedback finishes in 150ms using the existing ease-out brand curve,
without overshoot. State changes remain interruptible. Keyboard, restoration
and prefers-reduced-motion changes are immediate. No animation loops, backdrop
blur, added runtime dependencies or layout animation are needed.

## Verification

Tests cover light/dark, 320/390px, target sizes, real 500 font loading, actual
transition endpoints and interruption, reduced motion, forced colors, persistence
and failure recovery. tests/motion.cjs is the compact-control contract.
See docs/live-chrome-validation.md for current live-site and performance evidence.

## ChatGPT PDF control

One 44px header trigger uses the same 13px/500 UI scale and a 20px document-download
stroke icon. The trigger has no background or border, including hover/open states;
color communicates hover/open state and keyboard focus retains its outline.
The menu is at most 304px wide, with 12px viewport clearance, 12px corners, a
one-pixel border and no decorative shadow. Two actions name their scope:
whole conversation or select a response. The supplied mark and the approved
love attribution form a muted 12px/400 footer below the options, keeping the
native 52px header clear. The standalone floating badge is removed on ChatGPT.

Selection uses a temporary nonmodal popover, an answer outline, Previous/Next,
explicit Export and Cancel. Native links, copy buttons, text selection and the
composer remain usable. Recycled or removed answer identities require reselection.
Escape restores focus; keyboard and reduced-motion entry are immediate, pointer
entry is 150ms opacity/4px translation. Listeners exist only while the menu or
picker is open. There are no persistent controls under answers or new timers.
