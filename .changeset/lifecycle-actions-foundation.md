---
"@fission-ai/openspec": minor
---

Lifecycle actions (foundation): declare named agent instructions under `lifecycle:` in `openspec/config.yaml` and attach them to workflow hooks (`change.create.before`, `change.apply.before`, `change.apply.completed`, `change.archive.before`, `change.archive.completed`, or your own `custom.*` hooks) with a `suggest` or `auto` mode. OpenSpec only resolves which actions apply. Your agent handles them.

Run `openspec lifecycle actions` to see what is configured, or `openspec lifecycle actions --at <hook> --json` from a custom skill or orchestrator. `openspec instructions create|apply|archive --json` now return the matching actions in an optional `lifecycle` field, and `openspec validate --all` checks the `lifecycle:` block. Projects without `lifecycle:` see no change, and an invalid `lifecycle:` block never blocks other commands.
