---
"@fission-ai/openspec": patch
---

`openspec validate` now warns on ambiguous task numbering in `spec-driven` changes: a task ID duplicated at full depth (including across resolved task files), or a task whose leading number disagrees with its enclosing `## N.` group. Numeric-looking text outside numbered groups is ignored, and custom schemas are unchanged until they opt in. The checks run across direct, bulk, and deprecated change validation. Closes #1520. Thanks [@alectimison-maker](https://github.com/alectimison-maker)! ([#1523](https://github.com/Fission-AI/OpenSpec/pull/1523))
