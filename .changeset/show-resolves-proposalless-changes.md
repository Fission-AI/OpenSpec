---
'@fission-ai/openspec': patch
---

Change lookup no longer requires `proposal.md`. `openspec show`, `openspec change list/show/validate`, and shell completion now resolve a change by its directory, matching `openspec list`, `status`, `instructions`, and `validate`.

Previously a change created by `openspec new change` — which scaffolds only `.openspec.yaml` — was reported as `Unknown item` by `openspec show` and was missing from completions and `openspec change list` until a proposal was written, and a change from a schema with no proposal artifact was never resolvable. `openspec change list` now reports the same set as `openspec list`, keeps task counts for a change that has no proposal yet, and labels it `(no proposal.md yet)` rather than `(unable to read)`. Showing such a change explains that the proposal is not written yet and points at `openspec status --change <name>`.
