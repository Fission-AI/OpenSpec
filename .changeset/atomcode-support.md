---
"@fission-ai/openspec": minor
---

Add AtomCode support through `openspec init --tools atomcode`, with project skills in `.atomcode/skills/` and `/opsx-<id>` commands in `.atomcode/commands/`. Generated commands declare `args: optional` and receive `$ARGUMENTS` when the workflow reads invocation input, and `args: none` when it does not, so AtomCode runs them straight from the slash menu. Follows the selected workflow profile and delivery mode.
