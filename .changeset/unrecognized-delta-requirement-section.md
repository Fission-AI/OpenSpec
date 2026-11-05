---
"@fission-ai/openspec": patch
---

`validate` now fails, and `archive` refuses, when a delta spec puts a requirement under an unrecognized `## ... Requirements` section such as `## DEPRECATED Requirements`, instead of passing with a warning and silently dropping that requirement.
