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

1. Read `../openspec-beta/SKILL.md`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow `../openspec-beta/references/propose.md` step by step.

This skill plans only: finish the plan and stop, even if the request also asks to build it.

If `../openspec-beta/` or that file is missing, the OpenSpec skills are incomplete or out of date: ask the user to reinstall them (`openspec setup`, or `npx skills add Fission-AI/OpenSpec`).
