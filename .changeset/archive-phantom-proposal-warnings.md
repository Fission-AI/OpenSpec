---
"@fission-ai/openspec": patch
---

Fix phantom requirements parsed from delta specs, which made `openspec archive` warn about problems `openspec validate` never reported.

A header inside a delta section that is not a `### Requirement:` header — a divider such as `### Documentation Requirements` — was read as a requirement with no scenario. `openspec archive` warned that it was missing a scenario, and `openspec show <change> --json` and `openspec change list` counted it as an extra delta. The change parser now ignores those headers, matching the delta reader, so the phantom is gone from the warnings and from the JSON. Main spec parsing is unchanged.

`openspec archive` also no longer repeats requirement-level issues from the delta specs in its non-blocking "Proposal warnings in proposal.md" block. Each defect was printed twice there, and a `## REMOVED Requirements` entry — names-only by design — was reported as missing a scenario on every correct removal. Delta spec validation still reports and blocks on genuine defects, and proposal-level warnings are unchanged.
