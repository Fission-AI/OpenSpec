---
'@fission-ai/openspec': patch
---

`openspec show <change>` and shell completion now resolve a change by its directory, matching `list`, `status`, `instructions`, and `validate`. Previously they required `proposal.md`, so a change created by `openspec new change` — which scaffolds only `.openspec.yaml` — was reported as `Unknown item` until the proposal was written, and a change from a schema with no proposal artifact was never resolvable. Showing a change that has no proposal yet now says so and points at `openspec status --change <name>`.
