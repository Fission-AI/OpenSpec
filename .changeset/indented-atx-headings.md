---
"@fission-ai/openspec": patch
---

Stop deleting notes written next to a requirement. A requirement absorbs anything below it that OpenSpec doesn't recognise as a new heading — a note indented by the one to three spaces Markdown allows, for example — so removing or modifying that requirement silently deleted the note too. Nothing counted it, so nothing warned, and the spec left behind still validated. Such content is now kept, in place. Nothing is reclassified: an indented heading still isn't a requirement, and a requirement's own `#### Scenario:` blocks still travel with it.
