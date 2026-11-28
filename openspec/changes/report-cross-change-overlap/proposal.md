## Why

Every check `validate` runs compares one change against the main specs as they are today. When two active changes edit the same requirement, each one is consistent with a spec that neither has landed in yet, so both pass and `validate --changes` reports nothing. The collision only shows up when the first change archives and the second starts failing. By then the second author has built against a base that moved, over a requirement they may never have touched.

The scenario loss guard stopped this from losing data: archive now refuses a MODIFIED block that would drop scenarios. What is left is timing. The refusal lands late, on the wrong person, after the work is done. #1246 describes the failure, #1669 asks for the overlap to be visible before either change archives, and #1387 reports a working tool built for the same gap outside the CLI.

## What Changes

- When changes are in scope (`--changes` or `--all`), bulk `validate` reports each requirement that two or more active changes claim.
- Each entry names the spec, the requirement, every claiming change with the operation it applies (`ADDED`, `MODIFIED`, `REMOVED`, `RENAMED_FROM`, `RENAMED_TO`), and whether the main spec holds that requirement today.
- A RENAMED delta claims both of its names. The old name collides with anyone editing it, and the new name collides with anyone adding it.
- Human output gets one advisory section after the existing details. JSON output gets an `overlaps` array, present and possibly empty whenever changes are in scope, and absent otherwise.
- The report is advisory. It never changes the exit code, never fails a run, and draws no conclusion about which change is wrong or which should archive first.
- `--report findings` keeps its own document unchanged and carries no overlaps.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-validate`: bulk validation reports requirements that more than one active change claims.

## Impact

- **Public CLI:** new output on `validate --changes` and `validate --all` only when an overlap exists. No new flag, no default behavior change, no exit code change.
- **JSON consumers:** one additive top level field, `overlaps`, on the full v1 document. The `add-validation-findings-report` design names exactly this field as needing an explicit contract decision before it is added, and this proposal is that decision. The findings document is untouched.
- **Implementation:** a new read only module under `src/core/`, a call site in `src/commands/validate.ts`, docs in `docs-lab/reference/cli.md` and `docs/agent-contract.md` §4.3, tests, and a minor changeset. No new dependency.
- **Existing implementation:** #1698 implements this proposal as written and is kept rebased on `main`.
