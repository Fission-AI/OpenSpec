## Why
Manual setup for new changes leads to formatting mistakes in spec deltas and slows agents who must recreate the same file skeletons for every proposal. A built-in scaffold command will generate compliant templates so assistants can focus on the change content instead of structure.

## What Changes
- Add an `openspec scaffold <change-id>` CLI command that validates IDs, copies the default proposal/tasks/design template bundle into a new change directory, and errors out if the target already exists (authors add spec deltas later).
- Update CLI documentation and quick-reference guidance so agents discover the scaffold workflow before drafting files manually, including reminders on when to create spec deltas.
- Add automated coverage (unit/integ tests) to ensure the command respects naming rules, copies templates correctly, fails for existing directories, and produces output that passes `openspec validate --strict` untouched.

## Impact
- Affected specs: `specs/cli-scaffold`
- Affected code: `src/cli/index.ts`, `src/commands`, `docs/`
