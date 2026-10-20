# Popup validation — historical initial port

This report records the initial popup-only phase, committed as `a3330b1`.
Its scope, byte-identity statements, and numbers describe that phase. The later
authorized font/PDF/brand work is documented in
[the current feature report](font-pdf-validation.md); the runtime scope and
asset set have since expanded. Historical measurements below are preserved.

## Scope

Correct repository: `gptgateorg/ai-rtl-tool`; baseline `244006e`.
Popup-only Windows design port. No account/login, network API, new permission,
service worker edit or supported-site UI redesign. The previous unrelated `ex`
checkout is preserved in the sibling `chrome extention-ex-backup` directory.

## Verification

- `npm test`: production Vite build, scope integrity, 96 popup checks, 284
  Windows token/geometry/motion comparisons, real Manifest V3 integration.
- Popup checks: three services, both themes, all direction values, switches,
  reload persistence, legacy migration, invalid saved direction, keyboard,
  reduced motion, forced colors, 320px width, missing access/no tabs, read/write
  and messaging failures, retry, reinjection, rapid changes and multiple tabs.
- Effective math state: the original core forces math correction when either
  direction is RTL. The popup now explains and displays that effective state;
  the stored math choice survives for auto/LTR mode.
- Real Chromium extension tests use the actual built manifest, service worker,
  storage and content scripts on three intercepted, isolated origin fixtures.
  Checked messages, direction classes, LTR math, preserved native fixture
  controls, saving/reopening and worker suspension. No personal profile or
  login was used.
- Original manifest, background, content/core/selectors, original shared font
  and images: 13 files verified byte-identical to baseline. Built site scripts
  and worker assets also match the baseline build byte-for-byte.
- Independent code review found no new actionable issue; separate VM checks
  covered stale feedback, serial/coalesced saves and production reinjection.
- Visual review found one light-theme error/retry text contrast issue. Both
  text rules now use the existing deep-ink text token; a >=4.5:1 browser
  assertion and settled error capture protect the correction. Final visual
  verdict: SHIP for the local popup; the single finding was scored resolved.

## Local performance

Seven alternating paired runs after warmup, Chromium 140, local source routing,
a one-second idle window and an 800ms interaction frame sample. These are
medians on this Mac, not a universal hardware guarantee.

| Metric | Original | Port |
| --- | ---: | ---: |
| DOMContentLoaded | 17.2 ms | 17.5 ms |
| Load event | 19.5 ms | 22.7 ms |
| Idle task time / 1s | 0.458 ms | 0.384 ms |
| Interaction task time | 81.931 ms | 68.715 ms |
| Interaction layout time | 4.242 ms | 0.504 ms |
| 95th-percentile frame interval | 10.3 ms | 10 ms |
| Decoded local resources | 191492 bytes | 217599 bytes |

No material runtime regression was observed within this local test. The popup
loads about 26 KB more local resources to use the exact separate Regular/Bold
Windows fonts. Startup differs by a few milliseconds; idle work is negligible.
Interaction layout work falls substantially because selection motion no longer
measures layout, animates width, or forces reflow. No runtime library was added.
The final contrast-only correction does not affect the measured normal-state
interaction; performance evidence covers the same runtime logic and geometry.

## Source fidelity

Frozen Windows CSS: `tests/fixtures/windows-settings.css`, SHA-256
`261f173d33fba5fdac384470cb962e61f358ef3ebb23817f89f0ca276a3a6c9e`.
Source: `gptgate-window/browser-v2/src/renderer/settings/popup.css`.

- Same light/dark semantic tokens and font binaries.
- Same switch thumb geometry, 28px travel, RTL reversal, 360ms source curve.
- Same theme sun/moon SVG, 48px thumb travel, 380ms source curve.
- Same selected capsule and 360ms source curve; two equal columns become three
  for the existing direction choices. Timeline samples compare normalized
  equal-width cells from 0 to 380ms in light/dark and reduced-motion modes.
- Popup composition, font weights actually used, 390px width, and error-text
  contrast are deliberate adaptations. Not a claim that a Windows dashboard
  and a browser utility have identical full-screen layouts.

## Limits and retained behavior

- No manual test on current live ChatGPT/Gemini/Claude pages or Windows hardware.
  The site DOM engines remain baseline code; fixture tests cannot certify
  compatibility with future or current remote UI variations.
- The original Vite/CRX build emits a duplicate `images/logo.png` warning; the
  baseline build has the same warning and emitted logo bytes match.
- Chrome Sync remains the storage contract. No new account is involved, but
  Chrome may sync preferences when browser sync is enabled.
- The popup does not live-refresh changes made externally while it remains
  open, matching the original behavior.
- No push, publication, deployment or installation into a personal profile.

## Artifacts

`dist/` is the locally built unpacked extension.
`artifacts/qa/` holds captures, numeric performance samples and test results.
Both are generated and ignored by Git.
