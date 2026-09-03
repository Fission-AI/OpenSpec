---
'@fission-ai/openspec': patch
---

Stop dropping checkbox lines whose marker the task parser does not recognise. A `tasks.md` whose remaining work used a marker other than `[ ]`/`[x]`/`[X]` — for example `- [~] 1.2 Deferred` — reported `✓ Complete` in `openspec list`/`status` and archived with no incomplete-task warning, because unmatched lines counted toward neither the numerator nor the denominator. An empty `[]` and a padded `[ x]` were lost the same way. Only `[x]`/`[X]` means done, so every other marker now reads as unfinished, across progress, the apply task list, archive's gate and validate's task-numbering check. The archive, bulk-archive and verify workflows now tell agents the same rule, so a hand-counted tally cannot disagree with the CLI.
