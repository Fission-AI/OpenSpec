---
name: openspec
description: The starting point for anything OpenSpec. Use when the user asks for OpenSpec work without naming a skill, is unsure how to do something in OpenSpec, asks where a change stands or what to do next, or asks for several OpenSpec steps at once. Also use when the user says "openspec" and no more specific OpenSpec skill fits.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  references: "4dc55c469b49"
---

OpenSpec helps people and coding agents agree on what software should do, and keeps that agreement true as the code changes. Each change is planned as an update to the specs, reviewed before code is written, and merged into them once it is built.

You are the starting point for anything OpenSpec in this project. Work out what the user needs, then do one of three things: answer their question, hand the request to the skill that does it, or run several skills in order.

**How OpenSpec fits together**

- `openspec/specs/` says how the system behaves today.
- `openspec/changes/<name>/` holds one planned change: its proposal, spec updates, design and tasks.
- A change usually goes: explore (optional), propose, apply, verify (optional), archive. Archiving updates the specs and moves the change to `openspec/changes/archive/`.

**When the user is unsure**

If they ask where things stand or what to do next, read `references/where-things-stand.md` and follow it.

If they ask how OpenSpec works or how to set something up, read `references/answers.md` and answer from it.

**Pick the skill**

When the user asks for work, find the row that matches, then use that skill and follow its steps.

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

- If the request could mean more than one row, ask which, naming the choices.
- If the skill for the row is not installed, say so, then read `references/without-skills.md` and follow the section for that skill. Tell the user they can install it with `openspec config profile`, then `openspec update`.

**Several steps at once**

If the request asks for more than one row, such as "verify this change, then archive it", do them in order, one skill at a time. Finish each before you start the next. Each skill's own rules still apply: when one tells you to stop and wait for the user, stop there and say what comes next.

**If this project does not use OpenSpec**

If you picked this skill yourself and `openspec list --json` reports `"root": null`, set OpenSpec aside and answer the request normally. If the user asked for OpenSpec, offer to set it up with `openspec init`.
