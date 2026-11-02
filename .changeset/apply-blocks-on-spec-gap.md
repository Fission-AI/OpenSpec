---
"@fission-ai/openspec": patch
---

### Bug Fixes

- `openspec instructions apply` no longer reports a change as `ready` when `openspec validate` would reject it. A change with no delta specs and no `skip_specs: true`, or with a delta file outside a capability's `spec.md`, now comes back as `state: "blocked"` with the repair in `instruction`. Before, it came back `ready` with the problem in `warnings`, and the apply skill (which pauses on `blocked` and was never told to read `warnings`) implemented a change that `validate` then failed. The gap still surfaces as a warning once every task is checked (`state: "all_done"`), where implementation is over and archive decides what follows.
