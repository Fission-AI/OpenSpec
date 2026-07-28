---
"@fission-ai/openspec": patch
---

The stale-CLI check hardens its install detection: a directory merely named `volta` no longer changes the upgrade hint, the Windows npm-ownership check corroborates against the `openspec.cmd` shim npm actually writes, and a registry redirect from https to plain http is no longer followed.
