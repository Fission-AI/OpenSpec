---
"@fission-ai/openspec": patch
---

Load project context before proposal planning, using the selected project or store root and honoring config precedence and validation limits. When no root exists, stop without writing files and offer initialization instead of creating an implicit root.
