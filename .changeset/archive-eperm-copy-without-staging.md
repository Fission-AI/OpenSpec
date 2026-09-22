---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive** — When Windows `EPERM` blocks renaming a change directory that still has children, copy from the original source instead of requiring a staging rename that fails the same way. That lets archive finish instead of rolling back the spec write and leaving an empty capability directory git cannot see. A staging failure that is not `EPERM`/`EXDEV` still leaves the source untouched.

  The source of that unstaged copy is still the live change directory, which the archive claim does not cover, so cleanup removes only the entries it copied and verified rather than whatever is present when it runs. A file written in that window is left alone and the complete destination is retained for recovery, instead of being deleted without ever reaching the archive.

  Rollback of a newly created spec now also prunes the capability directory it created — and only that one. An empty capability directory that was already there is left in place with its own permissions.
