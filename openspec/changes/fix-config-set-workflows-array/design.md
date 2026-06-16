## Context

`GlobalConfigSchema` defines `workflows` as `string[] | undefined`, and `validateConfigKeyPath()` explicitly allows `workflows` as a known top-level key. The `config set` command currently calls `coerceValue(value, --string)` without considering the key being set, so JSON array input remains a string and fails schema validation.

## Goals / Non-Goals

**Goals:**

- Let users configure `workflows` non-interactively with a JSON array value.
- Keep validation responsible for rejecting malformed or schema-incompatible values.
- Preserve existing coercion behavior for scalar config keys.
- Keep the implementation extensible for future known structured config keys.

**Non-Goals:**

- Add a new CLI flag such as `--json`.
- Add repeatable workflow flags or append/remove workflow subcommands.
- Validate workflow IDs beyond the existing schema contract in this change.
- Parse arbitrary JSON for all config keys.

## Decisions

1. Add a key-aware coercion helper for config writes.

   The helper will accept the config key path, raw string value, and `forceString` flag. If `forceString` is true, it returns the raw string exactly as today.

2. Parse JSON only for known structured keys.

   For this change, `workflows` is the only known array-typed settable key. The helper will attempt `JSON.parse()` for `workflows` and return the parsed value. Schema validation will then enforce that the parsed value is an array of strings.

3. Preserve fallback scalar coercion for all other keys.

   Existing `coerceValue()` behavior remains available and unchanged for booleans, numbers, and strings. `config set` will use the new key-aware helper, which delegates to scalar coercion when no structured coercion applies.

## Risks / Trade-offs

- Quoting JSON arrays differs by shell. This is already true for JSON-like CLI arguments, so tests should exercise command behavior through direct argument passing rather than shell-specific quoting.
- Parsing only `workflows` is intentionally narrow. Future structured config keys can be added to the same explicit list when they become settable.
