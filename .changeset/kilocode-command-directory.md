---
"@fission-ai/openspec": patch
---

Generate Kilo Code commands in `.kilo/command/`, the directory Kilo Code reads, instead of `.kilocode/workflows/` (#1938). `openspec init` and legacy cleanup remove the workflow files OpenSpec generated there, matched by their known file names (including copies you edited), and leave files with other names in place.
