---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive** — When Windows `EPERM` blocks renaming a change directory that still has children, copy from the original source instead of requiring a staging rename that fails the same way. That lets archive finish instead of rolling back the spec write and leaving an empty capability directory git cannot see. A staging failure that is not `EPERM`/`EXDEV` still leaves the source untouched. Rollback of a newly created spec now also prunes the empty capability directory it created.
