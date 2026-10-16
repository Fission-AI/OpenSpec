---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Installing OpenSpec no longer pulls in the unpatched `braces` package, so a consumer audit does not report GHSA-vfj7-8cjw-p6xm through this package. A deeply nested `generates` brace pattern no longer crashes `openspec status` with a stack overflow.
