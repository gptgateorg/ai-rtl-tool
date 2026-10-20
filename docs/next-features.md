# Candidates after the visual port

These are proposals based on the current code and user goal, not implemented
features or validated user-research conclusions. They keep the utility account-free.

| Priority | Candidate | User benefit | Cost / validation needed |
| --- | --- | --- | --- |
| 1 | Separate preferences per service | Keep Claude and ChatGPT comfortable without repeatedly changing global choices | Migrate existing global settings without loss; make the active scope explicit; test every broadcast path |
| 2 | Restore recommended settings with Undo | Recover quickly after choosing an unsuitable direction or font | Preserve previous values; no destructive confirmation flow; test persistence and Undo |
| 3 | A small mixed-language preview | Explain automatic/right/left behavior using Persian, English and a formula before changing a page | Keep preview in popup, avoid external requests and heavy math dependencies; verify narrow layouts |

Start by testing whether ordinary Persian-speaking users can choose the correct
direction and understand the forced-RTL math explanation. Add a candidate only
when it solves a witnessed problem; do not turn the tool into an account dashboard.
