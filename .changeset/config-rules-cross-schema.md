---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Config `rules:` keys are no longer reported as `Unknown artifact ID` when they belong to a different schema. The global rules map is now validated against the union of artifact IDs across every available schema, so multi-schema projects stop seeing spurious warnings on every command (#1322).
