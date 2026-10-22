---
name: openspec-beta-propose
description: "Propose a new OpenSpec change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation. Also use when the user says \"openspec propose\" or \"opsx propose\"."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec propose

1. Read `../openspec-beta/SKILL.md`: the rules every OpenSpec workflow follows.
2. Follow `../openspec-beta/references/propose.md` step by step.

This workflow plans only: finish the plan and stop, even if the request also asks to build it.

If `../openspec-beta/` is missing, ask the user to install it with `openspec setup`.
