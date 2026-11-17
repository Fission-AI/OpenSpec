---
name: openspec-router
description: Send an OpenSpec request to the skill that handles it. Use when the user asks for OpenSpec work without naming a skill, or asks about the specs or changes in a project's openspec/ folder and no more specific OpenSpec skill fits.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Send the request to the OpenSpec skill that handles it. This skill has no steps of its own.

**Pick the skill**

Find the row that matches what the user wants, then use that skill and follow its steps.

| The user wants to | Use |
|---|---|
| think an idea or problem through before deciding what to build | `openspec-explore` |
| describe what to build and get the whole plan: proposal, specs, design, tasks | `openspec-propose` |
| start a change and write its plan one artifact at a time | `openspec-new-change` |
| write the next artifact of a change | `openspec-continue-change` |
| write every remaining artifact of a change at once | `openspec-ff-change` |
| revise the plan of an existing change | `openspec-update-change` |
| implement the tasks of a change | `openspec-apply-change` |
| check the code against a change before archiving it | `openspec-verify-change` |
| update the main specs from a change and keep the change open | `openspec-sync-specs` |
| finish a change and archive it | `openspec-archive-change` |
| archive several finished changes at once | `openspec-bulk-archive-change` |
| take a guided first run through OpenSpec | `openspec-onboard` |

- If the request asks for several of these, do them in order, one skill at a time.
- If it could mean more than one row, ask which, naming the choices.
- If the skill for the row is not installed, say so and stop. The user can add it with `openspec config profile`, then `openspec update`.
- If no row fits and the user only wants to know where things stand, run `openspec list --json` and answer from it.

**If this project does not use OpenSpec**

Each skill above checks this before it writes. If you picked this skill yourself and `openspec list --json` reports `"root": null`, set OpenSpec aside and answer the request normally.
