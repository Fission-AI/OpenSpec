## Why

`openspec config set` advertises automatic type coercion and accepts `workflows` as a known top-level key, but it currently cannot set `workflows` because the value always remains a string. Users who need to configure a custom workflow profile non-interactively must either use the interactive picker or edit the global config JSON by hand.

This breaks scriptable setup for custom profiles and can leave the global config in a confusing partial state when `profile` is already set to `custom` but `workflows` cannot be written.

## What Changes

Teach `openspec config set workflows <value>` to accept a JSON array value and store it as an array of strings after schema validation.

Keep existing scalar coercion behavior for other keys, including booleans, numbers, strings, and `--string`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-config`: `config set` can set the array-typed `workflows` key from a JSON array value.

## Impact

- `src/core/config-schema.ts` - add targeted coercion for known array-typed config keys.
- `src/commands/config.ts` - use key-aware coercion for `config set`.
- `test/core/config-schema.test.ts` and/or `test/commands/config.test.ts` - cover JSON-array workflow setting and invalid values.
