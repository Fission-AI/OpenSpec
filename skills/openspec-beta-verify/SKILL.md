---
name: openspec-beta-verify
description: "Verify implementation matches OpenSpec change artifacts. Use when the user wants to validate that implementation is complete, correct, and coherent before archiving. Also use when the user says \"openspec verify\" or \"opsx verify\"."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec verify

1. Read `../openspec-beta/SKILL.md`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow `../openspec-beta/references/verify.md` step by step.

If `../openspec-beta/` or that file is missing, the OpenSpec skills are incomplete or out of date: ask the user to reinstall them (`openspec setup`, or `npx skills add Fission-AI/OpenSpec`).
