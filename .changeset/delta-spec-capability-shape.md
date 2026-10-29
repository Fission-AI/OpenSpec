---
"@fission-ai/openspec": patch
---

### Bug Fixes

- The archive, bulk-archive and sync-specs workflows now treat only `specs/<capability-path>/spec.md` as a delta spec, the same files `openspec validate` and `openspec archive` read. Before, a second file such as `specs/user-auth/notes.md` was merged into the main specs and the change was archived, even though the CLI rejects it. Now the workflow stops before writing a main spec and asks you to move those requirements into the capability's `spec.md`. Run `openspec update` to refresh installed skills.
