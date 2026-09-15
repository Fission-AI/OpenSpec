---
'@fission-ai/openspec': patch
---

Reject a schema whose `apply.requires` names an artifact that does not exist. `parseSchema` checked every artifact's `requires` but never `apply.requires`, so `openspec schema validate` passed a one-character typo there, and apply then skipped the unknown id: `apply.requires: [desgin]` turned the apply gate off and told the agent "Proceed with implementation" with only a proposal written. That is now a schema error, raised wherever the schema is loaded, exactly like an unknown artifact `requires`, and it names the bad id and the artifacts the schema declares. `openspec schema validate` also warns when `apply.tracks` matches no artifact's `generates` (a typo such as `task.md`), without failing: apply reads that path as written, so schemas that track a hand-written file keep loading and working. Every built-in schema parses as before.
