---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **`retire_capabilities` on specs that wrap their bullets** — Archive refused to retire a capability whenever a scenario bullet wrapped onto a second line: the wrapped remainder was counted as content the merge could not account for. Projects that hold their Markdown to a column limit could not retire any capability through the supported path. A line that continues the bullet above it is now accounted for with that bullet, while a heading, fence, block quote, thematic break, table row, or raw HTML written beneath a bullet is still weighed on its own and still blocks the deletion.
- **`retire_capabilities` on specs bulleted with `+`** — Scenario bullets written with the `+` list marker were read as unaccounted content, so a capability written that way could not be retired at all, even though such a spec validates cleanly. Every CommonMark list marker is now recognised.
- **A note mistaken for an ordered list item** — A line opening with a ten-or-more-digit number and a period was read as a list marker, which CommonMark does not allow, so the same authored note was refused when it began with a word and deleted without mention when it began with a long enough number. Ordered markers now stop at nine digits, where CommonMark stops them.
