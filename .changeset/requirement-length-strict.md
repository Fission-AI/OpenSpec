---
"@fission-ai/openspec": patch
---

A requirement description over 500 characters is now a warning instead of an informational hint, so `openspec validate --strict` fails on it and CI can enforce the limit. The check also covers ADDED requirements in a change, so `openspec validate <change> --strict` catches a new overlong requirement before archive. Normal validation and archive are unchanged: they still pass when this is the only finding. The specs instruction now explains how to split an existing long requirement without losing its scenarios.
