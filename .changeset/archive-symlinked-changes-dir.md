---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Archive works when `openspec/changes` or `openspec/specs` is a symlink** — `openspec archive` no longer refuses a project-owned symlink that points to another directory, such as a shared docs repository. An `archive/` directory that resolves outside the changes directory is still refused.
