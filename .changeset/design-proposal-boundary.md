---
"@fission-ai/openspec": patch
---

Stop `design.md` from restating the proposal. In the default `spec-driven` schema, the design instruction asked for "Background, current state, constraints, stakeholders" and "What this design achieves and excludes" without saying that motivation and scope already live in `proposal.md`, so agents restated the proposal's Why and What Changes instead of adding the design's own value - approach, alternatives, and trade-offs. The instruction and the design template now state the boundary explicitly (the proposal covers why and what, design covers how) and tell the agent to reference those documents rather than repeat them (#1382).
