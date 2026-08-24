---
'@fission-ai/openspec': patch
---

explore: require explicit, scope-bound confirmation before the skill uses any command or tool that can create, edit, move, or delete a file. The explore skill's guardrails let "if the user asks" cover answers to its own clarifying questions, so an agent could treat a design discussion as a go-ahead and start creating schemas or editing `openspec/config.yaml` uninvited. The skill and the `/opsx:explore` command now instruct the agent to name the proposed artifacts or files, ask a direct yes/no question, and wait for confirmation in a separate message before writing. Read-only commands and tools remain available without confirmation, and expanding the confirmed scope requires another confirmation.
