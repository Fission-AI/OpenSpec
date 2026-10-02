---
"@fission-ai/openspec": patch
---

The CLI starts faster: each command now loads its implementation only when it runs. `openspec --version` and `--help` load 24 modules instead of 485, and commands such as `config list`, `store list` and `doctor` load only what they use, which matters most where Node loads modules slowly, such as Windows. Output, help text, shell completions, exit codes and telemetry are unchanged.
