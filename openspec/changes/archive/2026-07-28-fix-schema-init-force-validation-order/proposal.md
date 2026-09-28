## Why

`openspec schema init --force` removes an existing project-local schema before validating the requested artifact list. A command that ultimately fails for an unknown artifact can therefore destroy the schema it was supposed to replace, turning a recoverable input error into data loss.

## What Changes

- Complete schema-init input collection and artifact validation before replacing an existing schema.
- Preserve the existing schema and its contents when validation fails, including when `--force` is present.
- Keep successful `--force` replacement behavior unchanged once all inputs are valid.
- Add command-level regression coverage for both failed preservation and successful replacement.
- Keep the change narrowly scoped to `schema init` artifact validation and forced replacement; no other CLI behavior changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `schema-init-command`: Require failed schema-init validation to leave an existing schema unchanged before any forced replacement begins.

## Impact

- **CLI behavior**: Failed `schema init --force` validation no longer deletes an existing project-local schema.
- **Code**: The `schema init` action in `src/commands/schema.ts` will separate non-destructive preparation from the destructive replacement step.
- **Tests**: `test/commands/schema.test.ts` will exercise the registered command instead of simulating schema creation for the affected cases.
- **Dependencies and APIs**: No new dependencies or public API changes.
