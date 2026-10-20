# Fonts

Popup interface typography and user-selected conversation typography have
separate scopes. No font is fetched from a remote CDN at runtime.

## Popup interface

The compact popup uses fonts/popup/IRANSansX-Regular.woff2 at 400 and
fonts/IRANSansX-Medium.woff2 at 500, with synthesis disabled. The original
Windows Bold file remains archived in fonts/popup/. Selecting a conversation
family does not restyle the extension controls.

## Conversation catalog

| Choice | Files | Offered weights |
| --- | --- | --- |
| IRANSansX | IRANSansX-Thin / UltraLight / Light / Regular / Medium / DemiBold / Bold / ExtraBold / Black.woff2 | 100–900 in steps of 100 |
| Vazirmatn | Vazirmatn-Variable.woff2 | 100–900 in steps of 100 |
| Shabnam | Shabnam-Thin.woff2, Shabnam-Light.woff2, Shabnam.woff2, Shabnam-Medium.woff2, Shabnam-Bold.woff2 | 100, 300, 400, 500, 700 |
| Sahel | Sahel-Variable.woff2 | 300, 400, 600, 700, 900 |
| Custom upload | Browser-parsed local WOFF2, WOFF, TTF, or OTF | Uploaded face at 400 |

Faces are declared on demand and unused families/weights are not downloaded.
The collapsed popup font disclosure does not request preview faces. The selected
font applies only to supported message/composer text, excluding native buttons,
code, math, icons, and their protected descendants; semantic bold/headings retain
their emphasis.

## Provenance and licenses

The supplied parent-workspace archive assets/IranSansX(Pro).zip is the source
for the nine conversation IRANSansX weights, taken from standard
Webfonts/fonts/woff2/. Their current bytes match those archive entries. The
original IRANSansX-MediumD4.woff2 remains preserved from baseline 244006e.
The archive's supplied material is the provenance for the proprietary faces;
the bundled OFL documents below apply to the named open-font projects.

[sources.json](sources.json) records pinned upstream commits and exact source to
local-file mappings for the official Vazirmatn, Shabnam, and Sahel projects:

- Vazirmatn: 6e553e33489a8f9dfaccc76860a2e3f3c1e66de7.
- Shabnam: 5283d80e0118d9d4439b1208e9b912588e563d06.
- Sahel: 81ea305068b028ce311807c574fef50f3d4e2c54.

Their OFL license texts are bundled in licenses/Vazirmatn-OFL.txt,
licenses/Shabnam-OFL.txt, and licenses/Sahel-OFL.txt.

## Custom font lifecycle

Uploads accept at most 2 MiB. The extension checks the extension/signature and
requires the browser's FontFace parser to load the bytes. The resulting record
uses chrome.storage.local; only family/weight preferences use Sync. A custom
selection arriving on another device without its bytes falls back to Vazirmatn.
The popup offers removal and reports local-file errors; no remote upload is used.
