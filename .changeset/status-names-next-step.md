---
"@fission-ai/openspec": patch
---

`openspec status` now names the command that moves the change forward.

The text output reported state and stopped there, so picking a change back up — after a lost session, or on a change you did not start — meant already knowing which command came next. The JSON surface had carried that command all along in `nextSteps`; the text surface never printed it.

Status now ends with a `Next:` line: the next ready artifact's `openspec instructions` command while planning is unfinished, and `openspec instructions apply` once every planning artifact exists. It carries `--store <id>` when the resolved root is a store, and it is built from the same source as the JSON `nextSteps` sentence, so the two surfaces cannot name different commands.
