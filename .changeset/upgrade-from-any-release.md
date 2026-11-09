---
"@fission-ai/openspec": patch
---

`openspec update` now upgrades a project from any release since 0.12 in one run. It removes old OpenSpec files nobody edited, without needing `--force`, and keeps any you changed. It never touches files outside the project, even through a linked folder.
