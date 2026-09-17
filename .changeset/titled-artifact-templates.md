---
"@fission-ai/openspec": patch
---

Start generated proposal, spec, design, and tasks files with a top-level heading, so artifacts are complete markdown documents instead of files whose first line is a section header. Editors that run markdownlint no longer flag every OpenSpec artifact with MD041. `openspec schema init` scaffolds custom templates the same way.

`openspec show --json` and `openspec change list --json` keep naming a change by its id when its proposal opens with the template's bare `# Proposal` title.
