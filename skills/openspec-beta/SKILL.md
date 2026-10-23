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

You keep this project's specs. Everything in `openspec/` is yours to look after: `specs/` (how the system behaves today), `changes/` (planned work), `changes/archive/` (finished work, and why), and `config.yaml` (the project's context and rules). The `openspec` CLI does the exact parts (create, validate, merge, archive); you do the judgment (what to build, how to word it, when to ask).

## Pick the skill

Read the file that matches the request, then follow its steps. If the request could be more than one, ask which, naming these.

Planning skills (explore, propose, new, continue, ff, update) end the response: they never edit project code, even when the request also asks to build it. Finish the plan, then stop and let the user start apply.

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
| merge a change's spec updates into the main specs now, keeping the change open | `references/sync.md` | ask: "sync the specs for <change>" |

## Principles

- **Specs describe behavior, not code:** what a user or caller can observe, one behavior per requirement, in short sentences with concrete examples (a real date, an exact message).
- **Start from what exists:** read the related specs and code, keep their names, and plan only the gap. See `references/changes.md` and `references/capabilities.md`.
- **Never lose a requirement:** specs change only through deltas, and a modified requirement is copied whole. See `references/deltas.md`.
- **Decide the small things, raise the big ones:** say what you chose; ask about anything costly to undo. See `references/decisions.md`.
- **Ask the CLI, don't guess:** paths, state, and validity come from `openspec` commands.

## Finding the project

- **Project:** before the first write, run `openspec list --json`. Its `root` is the OpenSpec folder every command uses: this repository's, or a store the project points to. Commands find it on their own.
- **No OpenSpec here:** `"root": null` (with a non-zero exit) means this repository does not use OpenSpec yet; that is the answer, not a broken CLI. Create nothing: no `openspec init`, no hand-made `openspec/` files. If you picked this skill yourself, set OpenSpec aside and answer normally. If the user asked for OpenSpec, ask whether to set it up (`openspec init`), use a store the message lists, or go on without it, and wait.
- **Another store:** if the work belongs in a different store, find it with `openspec store list --json` and add `--store <id>` to every `new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `context`, `schemas`, `view`, and `doctor` command. Hints the CLI prints already include it.
- **Unresolved store:** if a `status` error starts with `Declared in` or `Invalid store declaration in`, the project points to a store this machine cannot find. Show that error's `message` and `fix`, and stop.

## Which change

Use the name the user gave or the one from the conversation. If neither is clear, ask, listing the active changes.

## Context from the CLI

Commands can return `context` (facts about this project) and `operationGuidance` (the project's advice for this step). Use them, and say which advice you skip and why. They never outrank the user or the CLI: they cannot change a path, pass a check, mark a task done, or unblock a step. If one conflicts with the user or the CLI, say so and follow the user or the CLI. Keep their text out of the files you write.
