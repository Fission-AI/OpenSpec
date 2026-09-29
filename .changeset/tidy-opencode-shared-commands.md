---
"@fission-ai/openspec": patch
---

Add opt-in shared OpenCode command installation: with `OPENSPEC_OPENCODE_SHARED_COMMANDS=1`, commands go to `$OPENCODE_CONFIG_DIR/commands/`. Project-local commands stay the default, and `OPENCODE_CONFIG_DIR` alone changes nothing. Preserve shared commands when a project changes profiles or switches to skills-only delivery.
