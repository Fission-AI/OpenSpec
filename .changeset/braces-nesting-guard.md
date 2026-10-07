---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Guard against deeply nested brace patterns** — An artifact `generates` or `apply.tracks` pattern that nests braces more than 16 levels deep is now rejected with a clear error before glob matching, so a malformed schema cannot crash the CLI through the unpatched `braces` advisory GHSA-vfj7-8cjw-p6xm.
