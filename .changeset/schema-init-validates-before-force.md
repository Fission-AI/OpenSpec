---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Preserve an existing project-local schema when `openspec schema init --force` rejects an unknown artifact ID. Forced replacement now begins only after artifact validation succeeds.
