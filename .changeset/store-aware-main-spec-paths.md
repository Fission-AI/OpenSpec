---
"@fission-ai/openspec": patch
---

Point the spec-driven `specs` instruction's main-spec read and edit at the store-aware root. It named `openspec/specs/<capability-path>/spec.md`, a path relative to the current directory, for both step 1 of the MODIFIED workflow ("locate the existing requirement") and the edit that fixes a leftover `TBD` Purpose. When the change lives in a store — whether selected with `--store`, a project `store:` pointer, or a global default store — the main spec is under the store root, so that read missed it, or silently returned a different capability when a local one happened to share the name, and the MODIFIED block was then copied from the wrong requirement. Both operations now use `<planningHome.root>/openspec/specs/...`, the root already returned by `openspec instructions ... --json` and the same convention the sync and archive workflows use. Fixes #1702.
