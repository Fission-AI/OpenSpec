---
'@fission-ai/openspec': patch
---

Stop `openspec update` reporting a tool up to date while a damaged command file sits on disk. The check read the `generatedBy` version marker in a tool's skill files alone, which proves only that the skill files came from this CLI and says nothing about the command files written beside them, so a hand-edited or truncated command file left update printing "All 1 tool(s) up to date" and repairing nothing; the file could be restored only by knowing to pass `--force`. A deleted command file was already detected, so the claim was false only for a damaged one. Update now also compares command-file content, using the comparison that already existed and was simply never consulted once a skill file supplied a version. Scoped to tools configured for both skills and commands, so the commands-only path is unchanged, and skipped when the delivery mode generates no commands for the tool. Fixes #1807.
