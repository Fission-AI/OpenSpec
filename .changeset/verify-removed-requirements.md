---
"@fission-ai/openspec": patch
---

Stop `/opsx:verify` from reporting a correctly removed requirement as missing. Verify now reads which delta section each requirement sits under: ADDED and MODIFIED requirements are checked for an implementation as before, a REMOVED requirement passes once its behavior is gone and is flagged only while it is still present, and the old name of a RENAMED requirement is no longer reported as missing.
