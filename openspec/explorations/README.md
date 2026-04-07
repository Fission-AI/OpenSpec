# Explorations

This directory stores exploration documents produced by the `/enpalspec:explore` skill.

## Path Convention

```
openspec/explorations/<yyyy-mm>/exploration-<yyyy-mm-dd>-<topic>.md
```

- `<yyyy-mm>` — year and month of the exploration session (e.g. `2026-04`)
- `<yyyy-mm-dd>` — full date of the session (e.g. `2026-04-07`)
- `<topic>` — kebab-case summary of the exploration subject derived from user input (e.g. `auth-redesign`, `real-time-collab`)

**Example:** `openspec/explorations/2026-04/exploration-2026-04-07-auth-redesign.md`

Paths are always constructed using `path.join()` to ensure correct separators on all platforms.

## Document Structure

Each exploration document contains the following sections in order:

```markdown
# Exploration: <topic>

**Date:** <yyyy-mm-dd>
**Linked change:** <change-name> (or "none")

## Context

<Written at session start. Summarises what the user wants to explore and any relevant background.>

## Rounds

<Appended after each Q&A round. Never rewritten from scratch — only appended to.>

### Round 1 — <Theme>

#### Q1.1 — <Question title>

<Question text>

Options:
- A) <option> ← recommended (reason)
- B) <option>
- C) <option>

**Selected:** B — <any notes from user>

...

## Insights & Decisions

<Written at end of session. Summarises key decisions made during exploration.>

## Open Questions

<Written at end of session. Lists unresolved items to address during proposal or design.>
```

## Purpose

Explorations are **not** change artifacts — they live outside `openspec/changes/` so that:

- A single exploration can seed multiple changes
- Explorations can happen before a change name is known
- They provide a discoverable historical trail of design thinking

The `/enpalspec:propose` skill scans this directory for a matching exploration doc before creating change artifacts, and seeds the proposal from the doc's Insights & Decisions section.
