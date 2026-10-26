---
name: openspec-beta-update
description: "Update an OpenSpec change by revising its existing planning artifacts and keeping them coherent with one another. Use when the user wants to revise a change's plan, fold new decisions into it, or reconcile its artifacts after an edit. Also use when the user says \"openspec update change\" or \"opsx update\". If the user means the openspec update CLI command, which refreshes generated files, run that command instead. Never edits code."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec update

1. Read `../openspec-beta/SKILL.md`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow `../openspec-beta/references/update.md` step by step.

This skill plans only: finish the plan and stop, even if the request also asks to build it.

If `../openspec-beta/` or that file is missing, the OpenSpec skills are incomplete or out of date: ask the user to reinstall them (`openspec setup`, or `npx skills add Fission-AI/OpenSpec`).
