---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Installing OpenSpec no longer pulls in the unpatched `braces` package, so a consumer audit does not report GHSA-vfj7-8cjw-p6xm through this package. A `generates` brace pattern that nests deeply, or expands to more than 1024 paths, is now rejected with a clear message instead of crashing `openspec status` with a stack overflow or an out-of-memory error.
