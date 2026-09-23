---
"@fission-ai/openspec": patch
---

Let `/opsx:update` fill a missing file under an already-satisfied glob artifact. A glob artifact is complete once one file matches it, and `/opsx:continue` only picks up `ready` artifacts, so the previous "point the user to `/opsx:continue`" handoff was unreachable and the missing file could never be created through the documented flow.
