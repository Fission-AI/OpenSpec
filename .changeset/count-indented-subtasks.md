---
'@fission-ai/openspec': patch
---

Task progress now counts indented sub-tasks. A `tasks.md` whose sub-tasks were unfinished reported `✓ Complete` in `openspec list` and `openspec view`, was missing those tasks from the `openspec instructions apply` list, and archived with no incomplete-task warning, because both checkbox parsers only matched checkboxes at column 0.

Progress counting and the apply task list now share one parser, so `list`, `view`, `archive` and `apply` agree about which lines of a tasks file are tasks. A checkbox with no text after it is left out of the apply list, which has nothing to act on, but still counts toward every progress number; a file of nothing but such checkboxes now asks to be rewritten rather than reporting itself done. The shared pattern matches every line the two it replaced matched, and more, so task counts can rise but never fall: no change starts reporting less work than before, and archive's incomplete-task warning can only become stricter. Checkboxes are still counted wherever they appear, including inside a code fence, an HTML comment or an indented block, so a `tasks.md` that shows a checklist as a format example can now count that example as work — remove it from the file, or pass `--yes` to archive.
