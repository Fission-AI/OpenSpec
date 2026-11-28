---
"@fission-ai/openspec": minor
---

Lifecycle actions (Create and Archive checkpoints): propose and new (skills and `/opsx:propose`, `/opsx:new`) handle `change.create.before` actions before creating a change, and archive and bulk-archive handle `change.archive.before` before syncing specs or moving each change and `change.archive.completed` after each change moves to the archive. Propose now takes project context from `openspec instructions create` instead of reading `config.yaml`, and new uses that read as its project check, so projects without lifecycle triggers see no extra CLI calls. `openspec instructions create` now reports a missing OpenSpec root instead of resolving an implicit one. Run `openspec update` to refresh installed skills.
