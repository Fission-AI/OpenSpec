---
"@fission-ai/openspec": patch
---

`openspec validate <change>` now reports a MODIFIED requirement that omits a scenario the main spec still has — the same loss archive already refuses to apply — so the change fails at authoring time instead of at archive time.
