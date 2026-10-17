---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **A capability's `spec.md` may be a symlink to a file elsewhere in the project** — `list --specs`, `show`, `validate` and `archive` no longer refuse `openspec/specs/<capability>/spec.md` when it links to the file the project keeps somewhere else, such as beside the product documentation it belongs to. A link that resolves outside the project is still refused.
