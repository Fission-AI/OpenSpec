---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Guard against deeply nested brace patterns** — An artifact `generates` or `apply.tracks` pattern that nests braces or parentheses more than 16 levels deep is now rejected with a clear error before glob matching, so a schema cannot overflow the stack through the unpatched `braces` advisory GHSA-vfj7-8cjw-p6xm.
