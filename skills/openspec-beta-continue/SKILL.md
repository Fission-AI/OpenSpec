---
name: openspec-beta-continue
description: "Continue working on an OpenSpec change by creating the next artifact. Use when the user wants to progress their change, create the next artifact, or continue their workflow. Also use when the user says \"openspec continue\" or \"opsx continue\"."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec continue

1. Read `../openspec-beta/SKILL.md`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow `../openspec-beta/references/continue.md` step by step.

This skill plans only: finish the plan and stop, even if the request also asks to build it.

If `../openspec-beta/` or that file is missing, the OpenSpec skills are incomplete or out of date: ask the user to reinstall them (`openspec setup`, or `npx skills add Fission-AI/OpenSpec`).
