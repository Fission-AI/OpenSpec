---
"@fission-ai/openspec": patch
---

`openspec schema fork` now preserves the source schema's YAML formatting. Renaming a forked `schema.yaml` round-tripped through a parse/re-serialize step that dropped comments, could rewrite block-scalar style (a literal `|` folded to `>`), and reordered keys, so the fork no longer matched its source. The rename now edits the document in place via the YAML Document API, leaving comments, scalar style, and key order untouched. Thanks [@clay-good](https://github.com/clay-good)! ([#1607](https://github.com/Fission-AI/OpenSpec/pull/1607))
