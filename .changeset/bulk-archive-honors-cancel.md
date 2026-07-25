---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Bulk archive now stops when you pick "Cancel"** — the generated `openspec-bulk-archive-change` skill (and the matching `opsx:bulk-archive` command) offered a "Cancel" option at the confirmation prompt but never told the agent what to do with it, so the next step archived every selected change anyway. The prompt now routes each answer by intent: "Cancel" stops without archiving anything, the archive options proceed (the ready-only option archives just the changes the status table marks `Ready` or `Ready*`), and any other answer re-asks instead of archiving. The single-change archive skill already routes Cancel this way; this brings the bulk variant in line.
