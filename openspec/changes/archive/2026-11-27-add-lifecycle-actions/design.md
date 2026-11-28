## Context

The lifecycle pilot (explored on `explore/intent-and-lifecycle`) settles the model: a project names actions, triggers attach them to hooks, and OpenSpec only resolves which actions apply. The agent or orchestrator handles them. This change is the foundation: config, validation, lookup, and delivery. Skill checkpoints come in later changes.

## Goals / Non-Goals

**Goals:**
- One strict resolver used by every surface (`lifecycle actions`, `instructions`, `validate --all`).
- Zero behavior change for projects without `lifecycle:`.
- A lifecycle typo never blocks unrelated commands.

**Non-Goals:**
- Running actions, enforcing `policy`, collecting results, or keeping action state.
- Repo-plus-store config merging.

## Decisions

- **Separate strict reader.** `readLifecycleConfig()` in `src/core/lifecycle.ts` validates by hand (not zod) so each problem gets one clear message with its config path, such as `lifecycle.triggers[2].mode`. `readProjectConfig()` ignores `lifecycle:` entirely.
- **Duplicate YAML keys.** The `yaml` parser rejects a whole file with duplicate keys. The strict reader parses with `uniqueKeys: false` and walks the `lifecycle` node to name each duplicate (`Duplicate action id 'x'`). The forgiving readers use `parseConfigYaml()`, which tolerates duplicate keys only inside the `lifecycle` block, so `status`, `list`, `archive`, and `validate --specs` keep working. Duplicates elsewhere still fail as before.
- **Hook names are an explicit list.** The five built-in hooks live in `LIFECYCLE_HOOKS`. Custom hooks are `custom.` plus kebab-case segments, checked with the existing `isKebabId`.
- **Store roots.** When a Store is the resolved root, only the Store's config is read. If the nearest repo config is pointer-only (`store: <id>`) for that Store and has `lifecycle:`, the read is invalid with an issue telling the user to move it.
- **Delivery.** `loadOperationLifecycle(root, operation)` returns `{ lifecycle }`, `{ lifecycleError }`, or `{}`. Instruction commands spread it into their payload, so an unconfigured project's JSON is unchanged. `handling` text is built from the checkpoints and modes present.
- **Errors never look like empty matches.** `lifecycle actions --json` failures return `{ hook, status }` (or `{ status }` without `--at`) with no `actions` key and exit 1.
- **Validation scope.** Only `validate --all` adds a `config/lifecycle` item, and only when `lifecycle:` is present.

## Risks / Trade-offs

- [`lifecycleError` is ignored by older skills] → skills that do not know the field behave as before; later changes teach skills to stop on `before` errors.
- [Tolerating duplicate keys in `lifecycle:` for forgiving readers] → the strict reader still reports them, and `validate --all` fails on them.

## Platform Notes

Config paths come from `resolveConfigFilePath()` (`path.join`), and error messages print them in platform-native form. No new path handling.
