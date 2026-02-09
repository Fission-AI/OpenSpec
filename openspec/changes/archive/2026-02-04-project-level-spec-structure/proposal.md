## Why

`specStructure` is only configurable in the global config (`~/.config/openspec/config.json`), meaning the same settings apply to all projects on a machine. Projects with different spec organization needs (e.g., one flat, one hierarchical) cannot each declare their own structure preferences.

## What Changes

- Add `specStructure` as an optional field in project-level config (`openspec/config.yaml`)
- Modify `getSpecStructureConfig()` to accept project-level overrides with precedence: project config > global config > defaults
- Each `specStructure` sub-field (`structure`, `maxDepth`, `allowMixed`, `validatePaths`) is resolved independently using field-level merge
- Update `openspec validate --specs` to read project config and pass overrides
- Sub-field-by-field resilient parsing in project config (consistent with `rules` parsing): invalid sub-fields are warned and skipped, valid ones are kept

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `global-config`: `getSpecStructureConfig()` gains an optional `projectOverrides` parameter; merge precedence becomes project > global > defaults
- `cli-validate`: reads project-level `specStructure` from `openspec/config.yaml` and passes it to `getSpecStructureConfig()`

## Impact

- **Code**: `src/core/project-config.ts` (schema + parsing), `src/core/global-config.ts` (signature change), `src/commands/validate.ts` (call site)
- **Docs**: `docs/organizing-specs.md` updated with project-level config example and precedence
- **Tests**: New test cases in `project-config.test.ts` and `global-config.test.ts`
- **Backward compatible**: existing callers of `getSpecStructureConfig()` without arguments continue to work unchanged
