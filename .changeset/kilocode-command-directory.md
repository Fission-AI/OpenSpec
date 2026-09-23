---
"@fission-ai/openspec": patch
---

Generate Kilo Code commands in `.kilo/command/`, the directory Kilo Code reads, instead of `.kilocode/workflows/` (#1938). `openspec init` and legacy cleanup remove the OpenSpec-generated files left in `.kilocode/workflows/` and keep any files you added there.
