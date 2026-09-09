---
'@fission-ai/openspec': patch
---

Stop archive rewriting the inside of fenced code blocks. The final assembly in `buildUpdatedSpec` collapsed runs of blank lines across the whole rebuilt document to tidy the seams between the slices it rejoins, but the pass was not fence-aware, so a requirement documenting a sample with two or more consecutive blank lines had that sample silently edited on archive, and edited again on every later archive. That matters wherever whitespace carries meaning: YAML block scalars, Python, expected-output fixtures, Markdown inside Markdown. Blank runs are now collapsed only outside fenced blocks, using the same `buildCodeFenceMask` every other structural pass in the module already used. Behavior outside fences is unchanged, including that only a truly empty line counts as blank, so a line of spaces is still never a collapse boundary. Fixes #1797.
