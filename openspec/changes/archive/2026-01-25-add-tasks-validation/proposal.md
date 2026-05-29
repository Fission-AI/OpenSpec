# Change: Add tasks.md Validation

## Why

AI agents generate OpenSpec change proposals including `tasks.md` as implementation checklists. Currently, `openspec validate` checks `proposal.md` and spec deltas, but does not validate `tasks.md`. This can lead to:
- Missing or empty tasks.md files
- Tasks without checkboxes (making progress tracking impossible)
- Empty task descriptions that provide no implementation guidance

Adding basic tasks.md validation ensures AI-generated proposals include properly formatted implementation checklists before approval.

## What Changes

- Add tasks.md validation to the `Validator` class
- Validate tasks.md when running `openspec validate <change-id>`
- Check three essential requirements:
  1. File exists
  2. At least one checkboxed task is present
  3. No empty task descriptions
- Use the same checkbox pattern as existing `task-progress.ts` (`/^[-*]\s+\[[xX\s]\]/`)
- Report validation errors with line numbers for easy fixing

## Impact

- **Affected specs**: cli-validate
- **Affected code**: `src/core/validation/validator.ts`, `src/commands/validate.ts`
- **Breaking changes**: None (only adds new validation checks)
- **Backward compatibility**: Existing changes may fail validation if tasks.md is missing or improperly formatted
