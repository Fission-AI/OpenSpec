---
"@fission-ai/openspec": patch
---

Make `schema init --default` validate and stage config changes before installing a schema, and roll back both files if either install fails. The staging and backup directories it creates are excluded from schema discovery, so they are never offered as real schemas.
