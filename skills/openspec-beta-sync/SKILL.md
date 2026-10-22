---
name: openspec-beta-sync
description: "Sync delta specs from an OpenSpec change to main specs. Use when the user wants to update main specs with changes from a delta spec, without archiving the change. Also use when the user says \"openspec sync\" or \"opsx sync\"."
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec sync

1. Read `../openspec-beta/SKILL.md`: the rules every OpenSpec workflow follows.
2. Follow `../openspec-beta/references/sync.md` step by step.

If `../openspec-beta/` is missing, ask the user to install it with `openspec setup`.
