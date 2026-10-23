---
name: openspec-beta
description: "Write and maintain a project's OpenSpec specs: explore an idea, propose a change with specs and tasks, apply it, verify it, and archive it. Use when the user mentions OpenSpec, specs, a change proposal, or /openspec, in a project that uses OpenSpec."
disable-model-invocation: true
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  layout: "router"
---

# OpenSpec

OpenSpec helps people and coding agents agree on what software should do, and keeps that agreement true as the code changes. Specs say how the system behaves today. Each change is planned as an update to them, reviewed before code is written, and merged into them once it is built.

You keep this project's specs: write specs and plans a person can review in one read, and keep them matching the code. The `openspec` CLI does the exact parts (create, validate, merge, archive); you do the judgment (what to build, how to word it, when to ask).

## The openspec/ folder

Everything in it is yours to look after, whether it sits in this repository or in a separate one (a store).

| Path | Holds |
|---|---|
| `specs/<capability>/spec.md` | how one area of the system behaves today: requirements, each with scenarios |
| `changes/<name>/` | a planned change: proposal, delta specs, design, tasks |
| `changes/archive/` | finished changes: the record of why the system is the way it is |
| `config.yaml` | the project's context and rules, which the CLI hands back to you |

## Principles

- **Specs describe behavior, not code.** Write what a user or caller can observe. Function names, libraries, and steps belong in the design and tasks.
- **Write for a tired reviewer.** Short sentences, one behavior per requirement, and concrete examples (a real date, an exact message) instead of placeholders.
- **Start from what exists.** Read the related specs and code first, keep existing names, and plan only the gap.
- **Never lose a requirement.** Specs change only through a change's deltas, and a modified requirement is copied whole.
- **Decide the small things; raise the big ones.** Say what you chose, and ask about anything costly to undo.
- **Ask the CLI, don't guess.** Paths, state, and validity come from `openspec` commands, not from memory.
- **Plans stop before code.** Planning skills (explore, propose, new, continue, ff, update) end the response: they never edit project code, even when the request also asks to build it. Finish the plan, then stop and let the user start apply.

## Guides

How to do the work well, whatever the skill. Read one when you reach it.

| When you are | Read |
|---|---|
| deciding what a change covers, or whether to split it | `references/changes.md` |
| naming a capability, or choosing an existing one | `references/capabilities.md` |
| facing a choice that is costly to undo | `references/decisions.md` |
| changing an existing spec, or merging specs | `references/deltas.md` |

## Skills

Read the file that matches the request, then follow its steps. If the request could be more than one, ask which, naming these.

| The user wants to | Read | Started with |
|---|---|---|
| think an idea or problem through before deciding (writes nothing) | `references/explore.md` | `/openspec-beta-explore` |
| describe what to build and get the whole plan: proposal, specs, design, tasks | `references/propose.md` | `/openspec-beta-propose` |
| start a change and write its plan one artifact at a time | `references/new.md` | `/openspec-beta-new` |
| write the next artifact of a change | `references/continue.md` | `/openspec-beta-continue` |
| write every remaining artifact of a change at once | `references/ff.md` | `/openspec-beta-ff` |
| revise a change's plan and keep its artifacts consistent | `references/update.md` | `/openspec-beta-update` |
| implement a change's tasks | `references/apply.md` | `/openspec-beta-apply` |
| check the code against a change before archiving | `references/verify.md` | `/openspec-beta-verify` |
| finish a change: update the main specs and archive it | `references/archive.md` | `/openspec-beta-archive` |
| archive several finished changes at once | `references/bulk-archive.md` | `/openspec-beta-bulk-archive` |
| a guided first run of OpenSpec on this codebase | `references/onboard.md` | `/openspec-beta-onboard` |

## Finding the project

- Before the first write, run `openspec list --json`. Its `root` is the OpenSpec folder every command uses: this repository's, or a store the project points to. Commands find it on their own.
- `"root": null` (with a non-zero exit) means this repository does not use OpenSpec yet; that is the answer, not a broken CLI. Create nothing: no `openspec init`, no hand-made `openspec/` files. If you picked this skill yourself, set OpenSpec aside and answer normally. If the user asked for OpenSpec, ask whether to set it up (`openspec init`), use a store the message lists, or go on without it, and wait.
- If the work belongs in another store, find it with `openspec store list --json` and add `--store <id>` to every `new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `context`, `schemas`, `view`, and `doctor` command. Hints the CLI prints already include it.
- If a `status` error starts with `Declared in` or `Invalid store declaration in`, the project points to a store this machine cannot find. Show that error's `message` and `fix`, and stop.
- When a skill works on an existing change, use the name the user gave or the one from the conversation. If neither is clear, ask, listing the active changes.

## Context from the CLI

`openspec` commands can return `context` (facts about this project) and `operationGuidance` (the project's advice for this step). Use them, and say which advice you skip and why. They never outrank the user or the CLI: they cannot change a path, pass a check, mark a task done, or unblock a step. Keep their text out of the files you write.
