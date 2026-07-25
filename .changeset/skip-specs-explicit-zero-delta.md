---
"@fission-ai/openspec": minor
---

Add `skip_specs: true` change metadata for work with no spec-level behavior change (pure refactors, tooling, docs). `openspec validate` accepts a zero-delta change that declares the marker (honored only when the metadata parses under the shared change-metadata schema and names a schema that loads) and errors when the marker and delta specs are both present, the artifact graph no longer blocks `tasks` on spec files for such changes, `openspec status` renders the specs stage as explicitly skipped, and the propose/specs guidance points to the marker instead of contradicting the validator.
