---
"@fission-ai/openspec": minor
---

### New Features

- **Oh My Pi support** — Generate native OPSX commands and skills for Oh My Pi projects, including tool detection and the expected `.omp` directory layout.
- **Update planning artifacts in place** — Use `/opsx:update` to revise an existing change's planning artifacts, reconcile related artifacts, and keep implementation work delegated to `/opsx:apply`.

### Bug Fixes

- **Fresh store registration** — Register and use newly created stores before their empty changes, specs, or archive directories have been committed.
- **Safer requirement archiving** — Stop stale `MODIFIED` requirements from silently deleting scenarios that were added by an earlier archive.
