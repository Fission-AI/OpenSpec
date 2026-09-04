---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **`retire_capabilities` on specs that wrap their bullets** — Archive refused to retire a capability whenever a scenario bullet wrapped onto a second line: the wrapped remainder was counted as content the merge could not account for. Projects that hold their Markdown to a column limit could not retire any capability through the supported path. A line that continues the bullet above it is now accounted for with that bullet, while a heading, fence, block quote, thematic break, table row, or raw HTML written beneath a bullet is still weighed on its own and still blocks the deletion.
