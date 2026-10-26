---
name: openspec-beta-ff
description: "Fast-forward through OpenSpec artifact creation. Use when the user wants to quickly create all artifacts needed for implementation without stepping through each one individually. Also use when the user says \"openspec ff\" or \"opsx ff\"."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec ff

1. Read `../openspec-beta/SKILL.md`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow `../openspec-beta/references/ff.md` step by step.

This skill plans only: finish the plan and stop, even if the request also asks to build it.

If `../openspec-beta/` or that file is missing, the OpenSpec skills are incomplete or out of date: ask the user to reinstall them (`openspec setup`, or `npx skills add Fission-AI/OpenSpec`).
