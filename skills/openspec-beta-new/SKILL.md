---
name: openspec-beta-new
description: "Start a new OpenSpec change using the experimental artifact workflow. Use when the user wants to create a new feature, fix, or modification with a structured step-by-step approach. Also use when the user says \"openspec new change\" or \"opsx new\"."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec new

1. Read `../openspec-beta/SKILL.md`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow `../openspec-beta/references/new.md` step by step.

This skill plans only: finish the plan and stop, even if the request also asks to build it.

If `../openspec-beta/` or that file is missing, the OpenSpec skills are incomplete or out of date: ask the user to reinstall them (`openspec setup`, or `npx skills add Fission-AI/OpenSpec`).
