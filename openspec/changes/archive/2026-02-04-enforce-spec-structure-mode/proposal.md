## Why

`validateSpecStructure()` accepts a `config.structure` field (`'flat'`, `'hierarchical'`, `'auto'`) and a `config.allowMixed` field, but neither is used. Setting `structure: 'flat'` does not flag hierarchical specs, and `allowMixed: false` has no effect. This makes the configuration options misleading — they exist in the schema and docs but do nothing during validation.

## What Changes

- Enforce `structure` mode in `validateSpecStructure()`:
  - `'flat'`: error if any spec has depth > 1
  - `'hierarchical'`: error if any spec has depth === 1
  - `'auto'`: no structure enforcement (current behavior)
- Enforce `allowMixed` when `structure` is `'auto'`:
  - `allowMixed: false`: error if specs mix flat (depth 1) and hierarchical (depth > 1)
  - `allowMixed: true`: no enforcement (current behavior)
- Update existing tests that explicitly document the no-op behavior

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `cli-validate`: spec structure validation enforces `structure` and `allowMixed` config fields

## Impact

- **Code**: `src/utils/spec-discovery.ts` (`validateSpecStructure` function)
- **Tests**: `test/utils/spec-discovery.test.ts` (update existing + add new tests)
- **Backward compatible**: default config (`structure: 'auto'`, `allowMixed: true`) produces identical validation output
