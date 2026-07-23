---
'@fission-ai/openspec': patch
---

`openspec archive` now carries a delta spec's `## Purpose` into the main spec it creates for a brand-new capability, instead of always writing the `TBD - created by archiving change <name>. Update Purpose after archive.` placeholder over it. The section body is copied verbatim, fenced code blocks included. The placeholder still appears when the delta has no `## Purpose` header outside a code fence, when the section body is empty, or when carrying the body over would put a requirement header outside `## Requirements` (that last case warns and still completes the archive). The Purpose of an existing main spec is never touched.
