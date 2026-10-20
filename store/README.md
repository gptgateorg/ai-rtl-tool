# Chrome Web Store preparation

Nothing has been uploaded, submitted or published.

## Prepared

- Persian listing copy, reviewer steps and permission/data explanations:
  `listing.md`.
- Standalone extension privacy policy draft: `privacy.html`. The existing site
  `/rules` describes account/payment services and is not a substitute for this
  extension-specific policy.
- Broad `tabs` permission removed; supported-site host access retained.
- Software dependency notices copied by Vite from
  `public/THIRD_PARTY_NOTICES.txt` into the distribution ZIP.
- Three 1280×800 RGB screenshots, a 440×280 RGB promo tile and a 128×128 RGB
  store icon. These show the actual popup/preview with public sample content.
  Recreate with `node store/render-assets.cjs` after `npm run build`.
- Draft ZIP and SHA-256/check results in `artifacts/chrome-web-store/`.

## Verified

`npm test` passed after removing `tabs`. Additional real-MV3 checks confirm
supported tab URLs/badges still work and unrelated tab URLs are unavailable.
The subsequent build/integrity check confirms software notices are packaged.
Store images were inspected and dimensions/mode checked. ZIP contents exactly
match `dist`; current compressed size is approximately 1.1 MB.

## Required to finish

1. The owner confirmed having the IRANSans project license but has not supplied
   its code/project details. Add the real FontLicense.txt and required notices
   before distribution; never insert a dummy code.
2. Publish the reviewed extension privacy policy at an approved public URL.
3. Enable Chrome's Apple Events JavaScript setting in the new developer profile.
   The dashboard page was opened but inspection was explicitly rejected while
   this setting was off. Do not infer developer identity or registration status.
4. Inspect existing dashboard items before creating a new item, confirm publisher,
   upload the finalized ZIP/assets and complete the listing/privacy/distribution
   fields. Show the concrete result to the owner before final submission.

`preflight.json` records outstanding items. The `-draft.zip` name deliberately
distinguishes this package from a submission-ready artifact.
