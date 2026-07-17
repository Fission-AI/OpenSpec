---
"@fission-ai/openspec": patch
---

Fix `openspec completion install` detecting the wrong shell for fish (and other)
users whose interactive shell differs from their login shell. Detection now
consults the parent process before falling back to `$SHELL`, so running the
command from fish installs fish completions instead of defaulting to bash.
