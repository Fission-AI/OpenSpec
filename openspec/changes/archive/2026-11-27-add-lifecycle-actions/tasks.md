## 1. Config and validation

- [x] 1.1 Add `src/core/lifecycle.ts` with `LIFECYCLE_HOOKS`, hook-name rules, and strict `readLifecycleConfig()`
- [x] 1.2 Reject unknown keys, `policy`, duplicate action ids (YAML duplicate keys), duplicate triggers, missing references, invalid modes, invalid instructions, and invalid hook names
- [x] 1.3 Resolve Store roots from the Store config only, and reject `lifecycle:` in a pointer-only repo config
- [x] 1.4 Keep `readProjectConfig()`, `readConfigParseError()`, and `readStorePointer()` working when only the `lifecycle:` block has duplicate keys

## 2. CLI

- [x] 2.1 Add `openspec lifecycle actions [--at <hook>] [--store <id>] [--json]`
- [x] 2.2 Register the command in the completion registry and store-selection guidance; regenerate parity hashes and skills
- [x] 2.3 Add `openspec instructions create`
- [x] 2.4 Attach `lifecycle` / `lifecycleError` to `instructions create|apply|archive`
- [x] 2.5 Add the `config/lifecycle` item to `validate --all` only

## 3. Verification

- [x] 3.1 Unit tests for parsing, validation errors, hook names, resolution, and delivery payloads
- [x] 3.2 CLI tests for `lifecycle actions`, `instructions`, `validate` scopes, `status`/`list`, and Store roots
- [x] 3.3 Windows CI runs the same suite (paths come from `path.join`; tests compare against `path.join` values)
