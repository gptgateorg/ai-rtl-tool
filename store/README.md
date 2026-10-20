# Chrome Web Store preparation

Version: 0.1.2. Local draft; nothing from this release has been uploaded,
submitted or published.

## Existing item

Update item `cfpildhdgidgaiigofflnekhpadmkdak`, published as GptGate 0.1.1.
Do not create a duplicate. The developer dashboard was inspected in the owner's
new Chrome profile. That dashboard tab was no longer open at the last check;
reacquire the current window/tab before interacting with it.

## Prepared

- `listing.md`: Persian and English copy, reviewer steps, permissions and data
  explanations. `_locales/fa` and `_locales/en` localize the metadata; the popup
  and onboarding remain Persian, explicitly stated in the English description.
- `growth-plan.md`: query/content map, proposed first-month experiments, launch
  copy and measurement plan. No ranking/traffic numbers have been invented.
- `privacy.html`: standalone bilingual extension policy, including local page
  processing, current supported-tab URLs, Chrome Sync and Limited Use disclosure.
  It still needs an approved public URL. The site `/rules` is not a substitute.
- Only `storage` and `scripting` permissions; supported-site hosts unchanged.
- `public/THIRD_PARTY_NOTICES.txt` bundles software dependency notices.
- `fonts/FontLicense.txt` and font declarations carry owner-supplied IRANSans
  code `8OHVZX36`. This records the owner's license statement; authenticity was
  not independently checked. Open-font license files remain separate.
- Three 1280x800 screenshots, 440x280 promo, 128x128 icon and local preview gallery
  in `artifacts/chrome-web-store`. They use the actual current UI, captured at
  double density, with public sample export content. No private conversations.
  Recreate with `node store/render-assets.cjs` after `npm run build`.
- Release ZIP and exact-distribution comparison/checksum in the same folder.
  `preflight.json` records current local validation and outstanding publication.

## Verification

See `artifacts/store-preflight/marketing-tests.log` for the final suite outcome.
Integrity checks cover permission scope, unchanged engines/assets, packaged
notices/license/locales and metadata length limits. MV3 tests resolve the
localized name/description through Chrome itself. Test startup waits for worker
listener registration before navigating supported fixtures: creation of the
worker alone is not proof that its module listeners are ready.

Artwork checks verify loaded fonts/images and layout bounds. Rendered screenshots
were visually inspected; image dimensions, color mode and ZIP contents are
validated during packaging. Screenshots and test fixtures do not imply a fresh
live-account test in the owner's Chrome profile.

## Required to finish

1. Publish the reviewed extension policy at an approved public URL.
2. Reopen the existing item's dashboard in the owner's developer profile.
3. Upload 0.1.2 as an update; use the matching language tabs for metadata and
   descriptions, and upload the new artwork. Complete accurate privacy fields.
4. Show the completed draft, distribution and attestations to the owner before
   final submission. Do not claim that submission means review approval.

Site landing pages, educational videos, channel distribution and optional
store GA4 integration are proposals, not implemented campaigns. No extension
telemetry, marketing dependency or site UI change was added.
