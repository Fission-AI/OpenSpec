---
"@fission-ai/openspec": patch
---

Point the spec-driven `specs` instruction's main-spec read and edit at the store-aware root. It named `openspec/specs/<capability-path>/spec.md`, a path relative to the current directory, for both step 1 of the MODIFIED workflow ("locate the existing requirement") and the edit that fixes a leftover `TBD` Purpose. When the change lives in a registered store the main spec is under the store root, so that read missed it — or, when a local capability happened to share the name, silently returned a different capability and the MODIFIED block was copied from the wrong requirement. Both now use `<planningHome.root>/openspec/specs/...`, the root already returned by `openspec instructions ... --json` and the same convention the sync and archive workflows use. Fixes #1702.
