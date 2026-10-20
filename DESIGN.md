---
name: "GptGate Persian Tool Popup"
description: "Windows controls and motion adapted to the Persian direction and reading utility."
colors:
  light-bg: "#DFF7EE"
  light-surface: "#FFFFFF"
  light-surface-2: "#DFF7EE"
  light-surface-3: "#B5E8D6"
  light-brand: "#5FBFA0"
  light-accent: "#2A7360"
  light-accent-soft: "#B5E8D6"
  light-on-accent-soft: "#0D3B32"
  light-action: "#0D3B32"
  light-on-action: "#FFFFFF"
  light-text: "#0D3B32"
  light-text-muted: "#3D6159"
  light-text-subtle: "#3D6159"
  light-border: "#B5E8D6"
  light-border-strong: "#7A948E"
  light-danger: "#BF5230"
  light-danger-soft: "#F6DCD0"
  light-feature-bg: "#0D3B32"
  light-on-feature-active: "#0D3B32"
  dark-bg: "#071E19"
  dark-surface: "#0F2F28"
  dark-surface-2: "#071E19"
  dark-surface-3: "#145247"
  dark-brand: "#5FBFA0"
  dark-accent: "#5FBFA0"
  dark-accent-soft: "#145247"
  dark-on-accent-soft: "#DFF7EE"
  dark-action: "#5FBFA0"
  dark-on-action: "#071E19"
  dark-text: "#DFF7EE"
  dark-text-muted: "#B5E8D6"
  dark-text-subtle: "#86ABA1"
  dark-border: "#1F4A40"
  dark-border-strong: "#2A7360"
  dark-danger: "#F08A5D"
  dark-danger-soft: "rgba(240, 138, 93, 0.12)"
  dark-feature-bg: "#0D3B32"
  dark-on-feature-active: "#0D3B32"
typography:
  title:
    fontFamily: "IRANSansX, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: "IRANSansX, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.55
  body:
    fontFamily: "IRANSansX, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  hint:
    fontFamily: "IRANSansX, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.75
  segment:
    fontFamily: "IRANSansX, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.8
rounded:
  sm: "12px"
  lg: "28px"
  pill: "999px"
spacing:
  inset: "4px"
  label-gap: "6px"
  compact: "8px"
  settings-gap: "10px"
  gutter: "12px"
  narrow-panel: "14px"
  panel: "18px"
components:
  direction-group:
    backgroundColor: "{colors.light-surface-2}"
    rounded: "{rounded.pill}"
    padding: "4px"
  direction-option:
    textColor: "{colors.light-text-subtle}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    height: "44px"
  reading-switch:
    rounded: "{rounded.pill}"
    width: "64px"
    height: "44px"
  theme-switch:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.pill}"
    width: "100px"
    height: "52px"
  panel:
    backgroundColor: "{colors.light-surface}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  retry-button:
    backgroundColor: "{colors.light-danger-soft}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "44px"
  community-button:
    textColor: "{colors.light-text-muted}"
    height: "44px"
---

# Design System: GptGate Persian Tool Popup

## Overview

**Creative North Star: "Windows controls for Persian reading"**

The GptGate Persian tool popup uses the established Windows settings controls, mint/deep-green semantic palette, solid rounded panels, IRANSansX files, and source motion curves. The result is a compact utility for Persian speakers working with mixed Persian, English, and mathematical text. The source-defined visual world is preserved rather than expanded into a dashboard.

The implementation at gptgateorg/ai-rtl-tool, baseline 244006e, is authoritative for this document. The frozen Windows reference is tests/fixtures/windows-settings.css; its upstream location is ../gptgate-window/browser-v2/src/renderer/settings/popup.css. Popup composition and three direction choices are purposeful adaptations. Product scope and current validation limits are in PRODUCT.md, docs/popup-brief.md, and docs/font-pdf-validation.md. The earlier popup-only phase and its numbers remain historical in docs/popup-validation.md. Later approved work adds conversation fonts, local PDF previews, and supplied Persian branding without replacing the Windows control world.

**Key Characteristics:**
- Windows switch, sun/moon artwork, capsule shape, and motion retained.
- Two opaque settings panels with compact Persian labels.
- Three equal direction options with stable physical ordering.
- Immediate keyboard/restored state and reduced-motion fallback.

## Colors

Mint and deep green carry the Windows identity across light and dark themes. Frontmatter records the semantic values used by this popup, including repeated values with different roles. Runtime components bind to the active unprefixed CSS variables; frontmatter component examples show the light theme.

### Primary

- **Brand Mint:** enabled reading switches and dark-theme action capsules.
- **Forest Accent / Deep Ink:** light-theme control emphasis, selected capsules, text, and focus.
- **Soft Mint / Dark Teal:** recessed selection tracks and theme-switch thumbs.
- **Warm Danger:** feedback dots and the retry surface. Error and retry text deliberately use the normal theme text role for readable contrast.

### Neutral

- **Mint Canvas / Deep Forest Canvas:** popup background and recessed tracks.
- **Paper / Forest Surface:** solid settings panels and the manual theme track.
- **Muted Ink / Pale Mint:** descriptions and status; subtle text remains a separate semantic role.
- **Mint / Forest Borders:** row dividers and control outlines; stronger borders define switch tracks.

**The Source Controls Rule.** Preserve Windows control geometry and curves; adapt the popup composition around them.

## Typography

**Body and control font:** IRANSansX with a sans-serif fallback. Only the exact Windows Regular and Bold files are loaded from fonts/popup/, at weights 400 and 700. Both use font-display block; synthesis is disabled and the ss01 stylistic set is enabled.

The frontmatter captures the implemented title, control-label, body, description, and segment roles. The header now uses the supplied Persian wordmark rather than the earlier text title/subtitle. Status text is 11px, and the version is 10px. Structural section headings remain available to assistive technology while visually hidden. There is no display, metric, or account typography role. Keep selected conversation typography separate from the popup font files. The conversation catalog adds IRANSansX weights, Vazirmatn, Shabnam, Sahel, and a device-local custom face; only the selected text faces load on demand. See fonts/README.md for the catalog and provenance.

## Layout

The popup is 390px wide with 12px body padding. Its header places a compact brand group opposite the theme switch, separated by a 12px gap and followed by 12px bottom spacing. The supplied Persian wordmark fits a 190 × 62px box and is inverted in dark mode. It retains its original artwork and Persian alternative text.

A disabled/busy fieldset during loading contains two panels separated by 10px: two direction groups, then reading preferences. Panels use 12px vertical and 18px inline padding; the reading panel uses 8px vertical padding. Direction groups are 12px apart, with 6px between label and track. Reading rows have a 56px minimum height, 8px block padding, and a 12px content/control gap.

Each direction control uses three equal columns with a 72px minimum per option. The track keeps LTR physical ordering inside the Persian RTL popup: left, automatic, right. Its selected capsule occupies one third of the inner width, moving by 0%, 100%, or 200% of its own width. Do not mirror this physical order with the surrounding text.

Ordinary controls fit within a 600px Chrome popup, with vertical scrolling available at enlarged text. Below 390px, width becomes fluid with a 320px minimum, panel inline padding drops to 14px, and the wordmark reduces to 156 × 52px. The native font disclosure expands within the reading panel; family and weight selects share two columns and the mixed-language sample wraps within a recessed surface. Expanded settings may scroll. The status row follows the panels; the footer contains the community action and an LTR version label. There is no fixed dashboard navigation.

## Elevation & Depth

Panels use the source light/dark card shadows recorded in the sidecar, with opaque surfaces and rounded corners. Recessed tracks provide tonal depth; settings rows use semantic dividers. Forced colors removes panel shadows and adds system-color borders. Source dock shadows and dashboard z-index layers are not used by this popup.

**The Solid Panels Rule.** Use opaque themed panels and soft source shadows; do not add translucent dashboard treatments.

## Shapes

Large rounded panels, full-pill tracks, circular thumbs, and a small rounded retry control form the implemented vocabulary. Retry and upload controls use small corners; panels use large corners. The font sample uses the existing medium-radius source token; the supplied wordmark keeps its original silhouette. Focus outlines are 2px with a 3px offset. Direction options and retry/community actions have 44px minimum heights. Frontmatter component heights describe minimum targets where the source uses min-height.

## Components

### Direction selector

Two named groups independently control AI responses and the message composer. Native buttons expose aria-pressed and descriptive titles. A 4px track inset encloses the source action-colored capsule; labels use bold 12px text and 6px 12px padding. Selected text uses on-action; hover uses normal text and pointer press scales to 0.96. The selector is a choice group rather than page navigation. Font family/weight choices use native selects in a disclosure, with visible focus and 44px minimum targets.

The moving capsule preserves the Windows selection curve and 360ms cadence while expanding two equal cells to three. Pointer changes use interruptible transforms; initial restoration and keyboard actions set instant motion. Selection changes do not measure layout or animate width.

### Reading switches

The Windows switch is 64 × 44px. Its visible track is inset 4px vertically, with a 28px thumb, 14px inner circle, and 28px checked travel. Checked state uses brand and on-feature-active; RTL reverses thumb travel. Thumb motion is 360ms with cubic-bezier(0.22, 1.15, 0.36, 1); fill and border changes take 180ms. Pointer press stretches the thumb; disabled state changes opacity and cursor. Native input focus outlines the visible slider.

When either direction is forced RTL, the existing engine requires math correction. The popup shows that effective state as checked and disabled, with an explanatory description; it retains the stored math choice for automatic/LTR use. The Claude black-surface preference appears only when the active site is Claude. These are existing tool states, not new page behavior.

### Popup theme switch

The exact Windows sun/moon SVG sits in a 100 × 52px switch, with a 2px border, 44px thumb, and 48px travel. It keeps LTR physical travel inside RTL content. A 26px sun becomes a crescent through the source mask and ray transforms. The source 380ms cubic-bezier(0.65, 0, 0.35, 1) governs the thumb and morph; ray opacity is 180ms and the border is 150ms.

This theme affects only the popup. It starts from the system preference unless a valid local explicit preference exists, and persists under the popup-only theme key. It does not alter the separate Claude surface setting.

### Feedback and secondary actions

A polite atomic live region describes reading, saving, saved/applied, missing access, unavailable tabs, and failures. The idle ready sentence is removed; an empty status row is hidden. Action and failure feedback remains visible. A 6px dot supplies supplementary tone; text remains explicit. Error status and the retry label use the normal text token, preserving the approved contrast correction. Retry uses danger-soft, small corners, and a 44px minimum target; it retries the failed operation. The community action keeps its existing inline Telegram SVG, muted text, 150ms color/transform response, and 0.98 press scale.

### Font and PDF extensions

The font disclosure uses the existing panel, border, text, and focus vocabulary.
Its Persian/English sample previews typography, not direction-engine behavior.
Upload/removal uses small rounded actions and explanatory local-only text.
Conversation typography targets message/composer text while protecting native
controls, code, math, and icons; popup UI remains on the original Windows faces.

ChatGPT PDF actions use scoped extension controls with 44px minimum targets,
small corners, the established mint/ink palette, and source press response.
Single-response actions attach to assistant messages; the conversation action
collects the available branch after an explicit gesture. Cancel and progress
feedback remain visible. A local preview presents content and collection/image
limitations before native printing. Keep the document readable on white paper,
with code isolated LTR and semantic MathML printed once. These scoped additions
do not authorize a redesign of host-site controls or layouts.

### Motion and accessibility

Shared fast timing is 150ms with the source brand easing where used. No continuous decorative animation or runtime animation dependency is present. Initial state and keyboard interactions disable transitions immediately. Reduced motion disables all transitions and animations; forced colors preserves system borders and selected Highlight/HighlightText treatment. Native buttons, labels, switches, disabled states, and visible focus remain the accessibility contract.

For current build, browser, motion, integration, PDF, and performance evidence, see docs/font-pdf-validation.md; docs/popup-validation.md preserves the initial port. Recorded checks use isolated supported-origin fixtures and are not live-site or Windows hardware acceptance. Documentation checks do not rerun runtime validation.

## Do's and Don'ts

### Do:
- **Do** reuse the frozen Windows reference for control geometry, tokens, SVG artwork, and motion.
- **Do** preserve the three equal direction columns and their left/automatic/right physical order.
- **Do** keep the popup theme separate from the existing Claude-only page preference.
- **Do** show the effective forced-RTL math state while preserving the stored choice for automatic/LTR modes.
- **Do** keep error and retry text on the theme text token, with the soft danger background reserved for the retry control.
- **Do** preserve native control semantics, visible focus, reduced motion, forced colors, and truthful save feedback.

### Don't:
- **Don't** introduce accounts, login, subscriptions, connection artwork, or account dashboards into this tool.
- **Don't** redesign supported websites or native controls, rename existing preference keys, or add a UI runtime. Approved font/PDF integrations remain narrowly scoped.
- **Don't** load unused font weights or add animation loops, timers, or layout measurements for control motion.
- **Don't** treat isolated fixture evidence as proof of current live-site compatibility or Windows hardware testing.
