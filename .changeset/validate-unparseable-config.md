---
"@fission-ai/openspec": patch
---

### Bug Fixes

- `openspec validate` now exits 1 when `openspec/config.yaml` is not valid YAML, instead of passing while every rule in it is ignored. Other commands still warn and carry on.
