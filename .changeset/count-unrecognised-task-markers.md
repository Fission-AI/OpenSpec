---
'@fission-ai/openspec': patch
---

Count tasks written with an unrecognised checkbox marker as not-done instead of dropping them. A `tasks.md` whose remaining work used a marker other than `[ ]`/`[x]`/`[X]` — for example `- [~] 1.2 Deferred` — reported `✓ Complete` in `openspec list`/`status` and archived with no incomplete-task warning, because unmatched lines counted toward neither the numerator nor the denominator. Only `[x]`/`[X]` means done; every other single-character marker now reads as unfinished.
