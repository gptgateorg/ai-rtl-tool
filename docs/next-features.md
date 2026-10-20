# Candidates after the font and PDF extension

Font family/weight selection, a mixed-language font sample, custom local upload,
ChatGPT response/conversation PDF previews, and the supplied Persian branding
are implemented. The sample previews typography; it does not simulate the
site's automatic direction or math engine.

The following remain proposals, not implemented features or validated research.

| Priority | Candidate | User benefit | Validation needed |
| --- | --- | --- | --- |
| 1 | Separate preferences per service | Keep each service comfortable without repeatedly changing global choices | Migrate global settings without loss; expose active scope; cover broadcasts |
| 2 | Restore recommended settings with Undo | Recover quickly after an unsuitable direction or font choice | Preserve previous values; test persistence and Undo |
| 3 | Direction/math preview | Explain automatic/right/left behavior before changing a page | Distinguish it from the implemented font sample; reuse real direction/math behavior without heavy dependencies |

Test whether Persian-speaking users understand direction, forced-RTL math,
device-only custom fonts, and the limits shown before PDF printing. Keep the
utility account-free and add proposals only when they solve an observed problem.
