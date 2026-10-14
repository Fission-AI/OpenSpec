---
"@fission-ai/openspec": patch
---

The verify workflow now reads a REMOVED requirement's baseline from the main spec before searching the codebase for it. A REMOVED delta block carries only the requirement name plus its Reason and Migration notes, so the search started from the heading alone - and because finding nothing is the passing result for a removal, an implementation written in different vocabulary read as a clean removal. When the baseline cannot be recovered from the main spec or that file's history - including a baseline that only restates its own title - Spec Coverage is now reported as not verified for that entry and the search is skipped, instead of passing.
