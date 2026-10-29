## Context

Archive matches MODIFIED, REMOVED and RENAMED blocks to the main spec by normalized heading text, and the scenario-loss guard pairs scenarios by name. Both are deterministic, which is why CI can trust archive's output (#2033). Their weak point is renames: a reworded heading looks like a different requirement, or a dropped scenario.

Teams that need stable links already put IDs in headings: sonqh's `spec-driven-ids` schema (`REQ-UA-004`, #2157), johnmcarbajal's `[cap-NNN]` (#1697), and smithjw's `NAV-5`. Today's parser reads those as part of the name.

## Goals / Non-Goals

**Goals**
- Renames that keep their ID survive validate, archive, and any link that cites the ID.
- Keep archive's merge deterministic, and keep today's output for specs without IDs.
- Add as little prose as possible.

**Non-Goals**
- A coverage report or `@spec` link syntax (follow-up 1).
- Declaring a deliberate scenario removal (#1843, #1697 Q2).
- Detecting overlap between open changes (#1669, #1387).
- Hidden metadata, a database, or two-way traceability. Markdown IDs come first; revisit once they're in use.

## Decisions

### D1

The ID is the first word of the heading, written by the agent, because it's visible, today's parser already keeps it, and teams already do it. Hidden CLI-assigned IDs scored no better (264 of 265 runs kept every ID either way), so they aren't worth a new command.

### D2

Match on the ID first, then on the name, so a requirement or scenario renamed under the same ID is the same block, and a different ID never counts as a match just because the name is shared. With no IDs on either side, today's code runs unchanged.

### D3

Refuse duplicate IDs instead of guessing, because agents number sequentially and parallel changes can pick the same number. A main spec that already has a duplicate falls back to names with a warning, so no existing project starts failing.

### D4

A decision is a `### D1` heading plus the choice and reason in one or two sentences: the bare heading keeps the `#d1` anchor stable (#2056), and dropping the Context, Rationale and Alternatives fields answers #2113's concern about padded, invented alternatives. Decision IDs are local to one change, so the CLI doesn't check them.

### D5

Tasks, tests and code cite the ID (`// AUTH-3.1`, `[D1](./design.md#d1)`), not the heading, so a later report can find links by pattern without anyone rewriting them.

## Evidence

From the [#1979 comment](https://github.com/Fission-AI/OpenSpec/pull/1979#issuecomment-6447835241):

| Question | Result |
|---|---|
| How often do heading links break for no reason? | Rewords were 25% of breaks in ai-dial-chat, 33% in OpenLore, 4% in OpenSpec |
| Do agents keep IDs through edits? | 264 of 265 runs kept every ID through rename, reorder, split and remove. No ID was ever moved to the wrong scenario |
| Is ID matching safe? | A 118-line prototype left all 1,719 past archives byte-identical, and rename deltas went from 0 of 20 to 20 of 20 passing validate |

The prototype read IDs from a comment line under the heading. Implementation reruns the same checks with heading IDs.

## Risks / Trade-offs

- **A heading that starts with an uppercase number token, like `COVID-19 handling`, reads as an ID.** It still matches correctly while it's unique. Validate's duplicate warning catches the rare clash.
- **Sequential IDs collide in parallel work.** This is accepted (D3): the second change to archive is refused with a clear message, rather than linking to the wrong requirement.
- **An ID can't tell a deliberate drop from an accident,** so removing a scenario still needs #1843.

## Follow-ups

1. **Coverage report.** `openspec coverage` lists which IDs tests cite. Earlier review findings belong to it: scan untracked files too (`git ls-files -z --cached --others --exclude-standard`), skip the specs themselves, and ignore Elixir's `@spec`.
2. **`/opsx:verify` reads cited IDs** instead of guessing coverage.
3. **A lasting home for implementation context**, the `specs/<capability>/design.md` the conventions spec promises (#1967 direction 3).

## Open Questions

- Should the templates suggest a capability prefix (`AUTH-3`), or leave the scheme to each project?
