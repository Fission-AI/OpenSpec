---
"@fission-ai/openspec": patch
---

Say when archiving a change will delete a note written next to a requirement. A requirement absorbs anything below it that OpenSpec doesn't recognise as a new heading — a note indented by the one to three spaces Markdown allows, for example — so removing or modifying that requirement took the note with it, silently. `openspec archive` now names the content and where to move it to keep it. The merge itself is unchanged: nothing is relocated, because a `#` line inside a scenario looks identical to a note and moving one of those would rewrite the spec wrongly.
