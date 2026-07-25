---
"@fission-ai/openspec": patch
---

### Fixed

- Stop a delta spec written directly at a change's `specs/` root from being silently dropped. `validate` accepted `specs/spec.md` and counted its deltas, but the apply/archive merge only reads capability folders (`specs/<capability>/spec.md`), so the change could pass validation and be archived while its requirements never reached `openspec/specs/`. `validate` now uses the same discovery rules as the merge path and reports the misplaced file with a fix hint, and `archive` blocks instead of completing.
