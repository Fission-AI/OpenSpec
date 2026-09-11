## Why

A `MODIFIED` requirement replaces its whole block, so the loss guard refuses one
that omits a scenario the main spec still has. That guard is right, and four
merged PRs have hardened it (#1246/#1391 multiplicity, #1475 fences, #1521 every
level-4 header). But it compares scenario TITLES, so a deliberate **rename** is
indistinguishable from an accidental **drop**, and the only edit that satisfies
it is restoring the old title — reverting the change where the rename was the
point.

Two reports, two corpora:

- **#1697** — renaming a scenario heading while keeping the requirement is
  impossible. Six workarounds tried; the ones that work either keep a heading
  that no longer describes the scenario, or disable every other check with
  `archive --no-validate`. Where a project names its tests after scenario
  headings, the heading is the traceability key, not decoration.
- **#1793** — the narrowed successor CONTRADICTS its predecessor, so "just keep
  both scenarios" puts two conflicting statements in one requirement block. That
  reporter runs the CLI digest-pinned and reconciles `--json` findings against a
  written per-finding disposition list, which works and is strictly worse than
  the check being able to read the declaration: the exception lives in their
  wrapper, invisible to anyone reading the delta, re-derived at every upgrade.

A replay over 75 archived changes in a third corpus (#1697) measured **29 of 75
changes blocked, 99 findings, every detection correct** — and of the 26 findings
hand-classified, **16 (62%) were intended omissions**. The guard is earning its
keep: 4 were real losses a human caught at archive time and 2 shipped and needed
repair by a later change. So the ask is not weaker detection. It is a way to
STATE INTENT, because intent is not recoverable from structure — one block in
that corpus produced 6 findings against one requirement, 2 renames and 4
accidents, identical in scenario count, heading and id presence.

There is already precedent for an author-declared exclusion in this very check:
a `MODIFIED` whose requirement is renamed away by `## RENAMED Requirements` in
the same delta is skipped (`renamedAway`). What is missing is the same
affordance one level down, at the scenario.

## What Changes

- **A `MODIFIED` requirement block MAY declare a scenario rename**, written one
  level down from `## RENAMED Requirements` and inside the block it applies to:

  ```markdown
  ### Requirement: Full car park refuses entry
  The system SHALL refuse entry when no bay is free, unless the driver holds a permit.

  - RENAMED SCENARIO FROM: `#### Scenario: Car arrives at a full car park`
  - RENAMED SCENARIO TO: `#### Scenario: Car without a permit arrives at a full car park`

  #### Scenario: Car without a permit arrives at a full car park
  - **WHEN** a car arrives, no bay is free, and the driver holds no permit
  - **THEN** entry is refused
  ```

- **A declaration accounts for the old title; it does not suppress the check.**
  The stated successor must really be a scenario in the same block. Where it is
  not, no credit is granted, the omission is still reported as the loss it is,
  and the unbacked declaration is reported as well.
- **Every declaration is paired or reported.** An unpaired `FROM:` or `TO:` is
  an error rather than a silent no-op — the class #1806 found in the
  requirement-level parser, where a dropped half meant a requested rename never
  happened while archive reported success.
- **`validate` and `archive` agree**, sharing both the comparison and the
  sentence, so a declaration accepted at authoring time cannot be refused at
  archive time (the parity `findMissingCurrentScenarios` exists for, #1477).
- **The declaration does not land in the main spec.** It is delta bookkeeping,
  and a main spec never carries delta operation markers.

### What this deliberately does NOT change

- **Detection is untouched.** An UNDECLARED omission is reported exactly as
  today, at the same level, with the same message and exit code. Every existing
  test passes unmodified.
- **The stale-base class stays blocked.** A delta authored before a sibling
  change added a scenario still errors, which is correct: the remedy there is to
  reconcile against the current base, not to declare an intent the author never
  had. #1697's replay separates that class (4 of 26) precisely because its
  remedy differs.
- **No `REMOVED Scenario` operator.** Deliberately dropping a scenario is the
  other half of "declare the omission" (#1697's open question 2), and it is a
  strictly larger semantic: a rename REQUIRES a successor and authorizes no
  loss, whereas a removal authorizes loss and needs its own justification. It
  should be decided on its own evidence, not folded in here.
- **No new flag, no config, no severity knob.** #1793 offers per-finding
  suppression and a severity knob as fallbacks and calls them weaker; both move
  intent out of the delta, which is the thing that matters.
- **No inference.** Nothing looks at scenario bodies to guess whether two
  titles are "the same" behaviour. That is what the hardening PRs closed.

## Capabilities

### Modified Capabilities

- `openspec-conventions`: the delta format gains a scenario-level rename
  declaration carried inside a `MODIFIED` requirement block, and states that
  the declaration is stripped when the block lands in the main spec.
- `cli-validate`: the dropped-scenario check accounts for a declared rename
  whose successor is present, and reports a declaration that is unpaired or
  whose successor is absent.

## Impact

- **Affected specs:** `openspec-conventions` (1 added requirement),
  `cli-validate` (1 modified, 1 added requirement).
- **Affected code:**
  - `src/core/parsers/requirement-blocks.ts` — the declaration parser, the
    integrity check, the shared message, the strip, and the credit seeded into
    `findMissingCurrentScenarios`. Its signature and return type are unchanged.
  - `src/core/validation/validator.ts` — report declaration problems.
  - `src/core/specs-apply.ts` — refuse them, and strip declarations from the
    block that lands in the spec.
- **Risk:** low. The declaration is opt-in and lexically new, so no existing
  delta can accidentally contain one; a corpus that writes none behaves
  identically. The one behaviour change for existing deltas is that a
  `MODIFIED` block containing a line that begins `RENAMED SCENARIO FROM:` or
  `TO:` is now read as a declaration rather than prose.

## Issues addressed

- [#1697](https://github.com/Fission-AI/OpenSpec/issues/1697) — cannot rename a
  scenario; `MODIFIED` reads a rename as a dropped scenario and blocks archive.
- [#1793](https://github.com/Fission-AI/OpenSpec/issues/1793) — the
  scenario-currency check has no way to declare a deliberate scenario rename, so
  a narrowing reads as an omission.
