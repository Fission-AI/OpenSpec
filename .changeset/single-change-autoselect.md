---
'@fission-ai/openspec': patch
---

The continue, update, verify, sync, and archive workflow skills now select a change the same way apply does: use the provided name, infer it from conversation context, auto-select when exactly one active change exists, and only prompt when the choice is genuinely ambiguous. Previously these workflows were told to always prompt ("Do NOT guess or auto-select"), so invoking them with a single active change stalled on a question with only one possible answer. The selection is always announced ("Using change: <name>") with how to override, and bulk archive still always prompts.
