---
'@fission-ai/openspec': patch
---

`openspec archive` now carries a delta spec's `## Purpose` into the main spec it creates for a brand-new capability, instead of always writing the `TBD - created by archiving change <name>. Update Purpose after archive.` placeholder over it. The placeholder still appears when the delta has no Purpose (or an empty one), and the Purpose of an existing main spec is never touched.
