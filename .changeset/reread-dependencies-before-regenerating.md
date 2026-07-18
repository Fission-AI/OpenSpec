---
"@fission-ai/openspec": patch
---

### Fixes

- **Regenerated artifacts now pick up your manual edits** — the continue, propose, and fast-forward workflows (and the `openspec instructions` dependency block) now tell the agent to re-read dependency artifacts from disk before creating the next one, instead of trusting whatever version it saw earlier in the conversation. Previously, editing `spec.md` and deleting `design.md`/`tasks.md` to regenerate them could silently produce artifacts based on the stale, pre-edit content.
