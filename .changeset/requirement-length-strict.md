---
"@fission-ai/openspec": patch
---

A requirement description over 500 characters is now a warning instead of an informational hint, so `openspec validate --strict` fails on it and CI can enforce the limit. Normal validation and archive are unchanged: they still pass when this is the only finding.
