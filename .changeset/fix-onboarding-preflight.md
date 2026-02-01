---
"openspec": patch
---

Fix onboarding preflight check that incorrectly reported freshly initialized projects as not initialized. Replaced `openspec status --json` (which requires an existing change) with a direct `openspec/config.yaml` existence check. Also added an `openspec --version` check to verify the CLI is installed.
