---
"@fission-ai/openspec": patch
---

### Bug Fixes

- The archive, bulk-archive and sync-specs workflows now find delta specs from any artifact whose output is under `specs/`, not only one named `specs`. Before, a custom schema that gave its delta-spec artifact another id was archived with no spec sync, and its specs rules were looked up under the wrong id. Run `openspec update` to refresh installed skills.
