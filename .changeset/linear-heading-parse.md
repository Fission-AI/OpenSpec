---
"@fission-ai/openspec": patch
---

Parse spec headings in linear time when the title is padded with whitespace.

Building the reference index read the first Purpose line with a regex that backtracked quadratically on a heading full of spaces: 10,000 characters of padding took 60ms, and 100,000 would have taken roughly six seconds. The heading scan is now hand-rolled and linear. Behavior is unchanged — the replacement was checked against the old implementation across 303,000 generated inputs, including CommonMark closing sequences (`## Purpose ##`), seven-hash lines, and headings with no space after the hashes.
