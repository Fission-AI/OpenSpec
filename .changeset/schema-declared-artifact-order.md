---
'@fission-ai/openspec': patch
---

Order artifacts by the schema's declaration order instead of alphabetically.

`specs` and `design` both require only `proposal`, so both become ready at once - and the tie used to be broken alphabetically, which put `design` first. `openspec status` listed design above specs and `nextSteps` recommended writing `design.md` before any spec existed, contradicting the spec-driven schema's own documented `proposal → specs → design → tasks` sequence.

Ties now follow the order the schema declares its artifacts, so `openspec status`, `status --json`, `nextSteps`, `blocked by:` lists, and an artifact's `unlocks` all agree. No dependency edges changed, so nothing newly blocks and `design.md` stays optional - only the order of equally-ready artifacts moved. Custom schemas get the same guarantee: whichever order your schema's `artifacts:` list uses is the order the CLI now recommends, so reorder that list if it was never deliberate.
