---
'@fission-ai/openspec': patch
---

Count task checkboxes under every CommonMark list marker. The task counter shared by `list`, `status`, `view`, `instructions apply`, `validate --archived` and archive's incomplete-task check recognised only `-` and `*` bullets, so a task written as an ordered item (`1. [ ]`, `1) [ ]`) or under a `+` bullet was invisible to all of them: a change with unfinished ordered tasks reported "✓ Complete", and `openspec archive` archived it without its incomplete-task warning. Task lines under `+` and ordered markers (`.` or `)`, up to nine digits, as CommonMark allows) now count exactly like `-` and `*` ones, including nested sub-tasks, CRLF files and the existing tolerance of a missing space after the marker, and task-numbering checks now see them too. Ordered and `+` items without a checkbox are still ignored, and `-` and `*` tasks count as before.
