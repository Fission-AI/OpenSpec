---
'@fission-ai/openspec': patch
---

explore: require explicit confirmation before the skill writes any file. The explore skill's guardrails let "if the user asks" cover answers to its own clarifying questions, so an agent could treat a design discussion as a go-ahead and start creating schemas or editing `openspec/config.yaml` uninvited. The skill and the `/opsx:explore` command now instruct the agent to ask a direct yes/no question and wait for the user's confirmation in a separate message before the first write of any file, and the "Don't implement" guardrail now names workflow configuration — schemas, templates, `openspec/config.yaml` — as changes rather than thinking.
