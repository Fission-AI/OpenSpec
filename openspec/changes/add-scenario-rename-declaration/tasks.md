# Tasks

## 1. Format

- [x] 1.1 Add the scenario-rename declaration to `openspec-conventions`: the
      `FROM:`/`TO:` spelling, that it lives inside the `MODIFIED` requirement
      block, that the successor must be present, and that it is stripped from
      the block that lands in the main spec.
- [x] 1.2 Record in `cli-validate` that the dropped-scenario check accounts for
      a declared rename, and that an unpaired or unbacked declaration is an
      error. Reproduce the requirement's existing scenarios in the MODIFIED
      block (none of them is renamed).

## 2. Parser

- [x] 2.1 `parseScenarioRenames(requirementRaw)` in
      `src/core/parsers/requirement-blocks.ts`: fence-masked, bullet optional,
      every CommonMark marker, backticks optional, names normalized through the
      same `scenarioNameAt` every `#### ` header runs through.
- [x] 2.2 Record every half that never paired instead of dropping it (#1806's
      class one level up).
- [x] 2.3 `findScenarioRenameProblems(incoming)` — unpaired halves plus a
      declared successor the block does not contain. A function of the incoming
      block alone, so it needs no current spec.
- [x] 2.4 `describeScenarioRenameProblem(problem)` — one shared sentence, so
      validate and archive cannot describe the same declaration differently.
- [x] 2.5 Seed `findMissingCurrentScenarios` with one credit per declaration
      whose successor is present. Signature and return type unchanged.
- [x] 2.6 `stripScenarioRenameDeclarations(requirementRaw)` — fence-aware, and
      it removes the blank line the declaration left behind so a block with no
      declaration comes out byte-identical.

## 3. Commands

- [x] 3.1 `validate`: report each declaration problem as an ERROR naming the
      delta file, after the `renamedAway` skip so a block already reported for
      naming an old requirement header is not complained about twice.
- [x] 3.2 `archive`: refuse a block whose declaration it cannot back up, before
      the loss check, with the same sentence validate prints.
- [x] 3.3 `archive`: write the block with its declarations stripped, and strip
      before the "already in sync" comparison too.

## 4. Tests

- [x] 4.1 Parser unit tests: pairing, the three accepted name forms, every
      bullet marker, fence masking, unpaired halves, absent successor,
      multiplicity, merge, a declaration in the CURRENT spec ignored, and the
      strip (including byte-identity for a block with none).
- [x] 4.2 Parity tests through both commands on both reported reproductions:
      accepted and applied, the declaration absent from the written spec,
      already-in-sync on a second archive, and refused in both commands for an
      absent successor and an unpaired `FROM:`.
- [x] 4.3 Regression: an UNDECLARED omission still reported, and only the
      undeclared one when a declared rename sits beside it.
- [x] 4.4 Full suite green with no existing test modified.
