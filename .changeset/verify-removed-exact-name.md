---
"@fission-ai/openspec": patch
---

### Bug Fixes

- `/opsx:verify` now matches a REMOVED requirement's baseline by its exact name. After a sync, a similarly named ADDED requirement that replaced it is no longer read as the removed one, so the removal is not reported as still implemented.
