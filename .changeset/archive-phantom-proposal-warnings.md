---
"@fission-ai/openspec": patch
---

Fix `openspec archive` reporting phantom proposal warnings that `openspec validate` never showed. Requirement-level issues coming from the delta specs are no longer repeated in the "Proposal warnings in proposal.md" block, so a heading such as `### Documentation Requirements` inside a delta section no longer produces a scenario warning against a requirement that does not exist. Genuine proposal-level warnings, and blocking delta spec errors, are unchanged.
