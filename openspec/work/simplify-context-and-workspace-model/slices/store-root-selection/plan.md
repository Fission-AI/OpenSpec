# Store Root Selection For Normal Commands Plan

## Status

Implemented on `codex/store-root-selection`; tests pass; review follow-up is
fixed. Merge to `main` remains.

This plan implements `spec.md` for slice 1.2 after the 2026-06-10 locked
decisions. The main product move is simple:

```text
--store <id> selects an OpenSpec root.
```

A context store remains local registration and identity for a standalone
OpenSpec repo. Normal command behavior should read and write ordinary
`openspec/specs/`, `openspec/changes/`, and `openspec/changes/archive/` files in
the resolved root.

## Source Of Truth

Start from `spec.md`.

Also keep these nearby artifacts in view:

- `../../goal.md`
- `../../roadmap.md`
- `../store-root-parity/spec.md`
- `../store-root-parity/plan.md`

The previous slice must be present first because this plan depends on healthy
registered context stores having the normal root shape:

```text
context-store-root/
  .openspec-store/
    store.yaml
  openspec/
    config.yaml
    specs/
    changes/
      archive/
```

Implementation should be stacked on the slice 1.1 branch/PR until it merges.
Do not start this slice from `main` unless `store-root-parity` has already
landed, because `src/core/openspec-root.ts` and the registry health behavior in
the code map come from that prerequisite work.

## User-Facing Frame

What the human wants:

- "I am in an app repo, but the OpenSpec work lives in my standalone planning
  repo."
- "Use the registered store I named, not a nearby accidental `openspec/` folder."
- "Do not make me learn initiative or workspace planning just to put work in the
  right Git repo."
- "Tell me which root was used without corrupting raw command output."

What the agent needs to know:

- Which OpenSpec root every command resolved.
- Whether the root came from `--store`, the nearest `openspec/`, or preserved
  implicit-root behavior.
- Whether a selected store is unknown, unhealthy, or mismatched with its
  `.openspec-store/store.yaml` identity.
- Whether a command wrote only the selected root's OpenSpec artifacts.

How the user knows it worked:

- With `--store team-context`, commands use the registered store's root.
- Human mode writes `Using OpenSpec root: team-context (/abs/path)` to stderr.
- JSON mode includes an additive `root` block with the shared shape.
- No new initiative metadata is created, and `openspec set change` is gone.

## Goals

- Add `--store <id>` to the supported top-level commands:
  `new change`, `status`, `instructions`, `list`, `show`, `validate`, and
  `archive`.
- Route those commands through one shared OpenSpec-root resolver.
- Demote leftover workspace view state for those commands. A
  `.openspec-workspace-view.yaml` ancestor is not a normal command root.
- Preserve current no-store behavior per command except where the spec calls out
  intentional changes.
- Remove initiative-link creation from `new change`.
- Remove `openspec set change` from CLI registration, help, completions metadata,
  workflow exports if unused, and tests/docs references.
- Add `--json` to `archive` and include the shared root block in JSON success
  payloads for all supported commands.

## Non-Goals

- Do not add `--store-path` selection.
- Do not add a sticky/default store for a project repo.
- Do not add code-repo relationship declarations, local mapping, views, clone,
  pull, push, sync, branch, worktree, dashboard, apply, verify, or
  orchestration.
- Do not delete initiative commands broadly or migrate legacy initiative data.
- Do not change deprecated noun-form commands such as `openspec change show` or
  `openspec spec show`; they remain cwd-based and do not gain `--store`.
- Do not rewrite public docs or rename `context-store` terminology in this
  slice.

## Current Code Map

Root and context-store plumbing:

- `src/core/planning-home.ts` currently resolves repo roots, implicit roots, and
  workspace planning homes.
- `src/core/context-store/registry.ts` resolves registered context-store ids and
  detects metadata mismatches. Its current error fix text still mentions
  `--store-path`, and unknown-store errors do not enumerate registered ids; the
  normal-command resolver must update or wrap those errors.
- `src/core/openspec-root.ts` inspects healthy OpenSpec root shape.
- `src/core/context-store/operations.ts` powers setup/register/doctor.
- `src/commands/context-store.ts` prints setup/register human next-step output.

Supported command surfaces:

- `src/cli/index.ts` registers top-level `archive`, `validate`, `show`,
  `status`, `instructions`, `new change`, and the soon-to-be-removed `set
  change`. Top-level `show` currently uses `allowUnknownOption(true)`, so
  `--store-path` must be registered explicitly there or it will be silently
  ignored.
- `src/commands/workflow/new-change.ts` already uses planning-home resolution and
  currently creates initiative metadata. It also calls
  `assertInitiativeSelectorsHaveReference`, which must be removed or replaced so
  `new change --store <id>` works without `--initiative`.
- `src/commands/workflow/status.ts` and
  `src/commands/workflow/instructions.ts` already use planning-home paths.
- `src/core/list.ts`, `src/core/archive.ts`, `src/commands/show.ts`,
  `src/commands/validate.ts`, `src/commands/change.ts`, `src/commands/spec.ts`,
  and `src/utils/item-discovery.ts` still contain cwd-based `openspec/...`
  assumptions.
- `src/core/completions/command-registry.ts` still advertises initiative-related
  `new change` flags and the `set change` command.

Existing tests to update or replace:

- `test/commands/artifact-workflow.test.ts` covers `new change`, `status`, and
  `instructions`.
- `test/commands/change-initiative-link.test.ts` covers behavior this slice
  removes.
- `test/commands/context-store.test.ts` covers setup/register output.
- `test/core/planning-home.test.ts` covers workspace planning-home behavior that
  normal commands will stop using.
- `test/commands/show.test.ts`, `test/commands/validate.test.ts`,
  `test/core/list.test.ts`, `test/core/archive.test.ts`, and completion tests
  cover the cwd-based command paths that need root injection.

## Shared Resolver Design

Add a shared resolver for normal OpenSpec commands. It can live in a new module
such as `src/core/root-selection.ts`, or replace the normal-command parts of
`planning-home.ts` if that keeps the code simpler. Prefer a new module if it
lets workspace-specific utilities remain untouched for later cleanup.

Suggested types:

```ts
type OpenSpecRootSource = 'store' | 'nearest' | 'implicit';

interface StoreSelectorOptions {
  store?: string;
  storePath?: string;
}

interface ResolveOpenSpecRootOptions extends StoreSelectorOptions {
  startPath?: string;
  allowImplicitRoot?: boolean;
  commandName: string;
}

interface ResolvedOpenSpecRoot {
  path: string;
  changesDir: string;
  specsDir: string;
  archiveDir: string;
  defaultSchema: 'spec-driven';
  source: OpenSpecRootSource;
  storeId?: string;
}
```

Resolver rules:

- If `storePath` is present, reject deliberately with guidance:
  `openspec context-store register <path>` and then use `--store <id>`.
- If `store` is present, resolve it through the context-store registry.
- Unknown store errors should name the unknown id and list registered ids.
- Selected store roots must be inspected as healthy OpenSpec roots. Do not
  scaffold or repair them.
- Selected store metadata id must match the registry id.
- Store health and metadata errors should point to `openspec context-store
  doctor`.
- Use a normal-command wrapper around context-store registry resolution, or
  update the registry errors directly, so this path never suggests
  `--store-path` and always includes registered ids for unknown-store failures.
- Resolver check order is: validate store id format, read registry entry, verify
  store metadata identity, then inspect the OpenSpec root shape. Metadata
  missing or mismatched errors win before root-health diagnostics.
- If no store is selected, find the nearest ancestor containing `openspec/` and
  ignore workspace view state.
- If no nearest root exists and registered stores exist, fail with a hint naming
  the registered store ids plus `--store <id>` or `openspec init`.
- If no nearest root exists and no stores are registered, preserve each
  command's current implicit/no-root behavior.

Command-specific no-store behavior:

- `new change` continues to allow an implicit root when no stores are registered.
- Commands that currently fail for missing `openspec/changes` or
  `openspec/specs` should keep failing in that no-store/no-root case.
- Commands that currently report empty or unknown items in an implicit cwd should
  keep that behavior unless the spec says otherwise.
- The shared resolver should expose enough knobs to preserve these differences
  rather than normalizing them by accident.

Compatibility bridge:

- Workflow commands still expect the existing planning-home shape. Provide a
  small adapter from `ResolvedOpenSpecRoot` to the existing `PlanningHome`
  interface with `kind: 'repo'`.
- Do not return `kind: 'workspace'` from the normal command path in this slice.
- Leave workspace commands and old workspace utilities in place unless they are
  directly blocking the supported command set.

## Output Contract

Add shared helpers for root output:

```ts
interface RootOutput {
  path: string;
  source: 'store' | 'nearest' | 'implicit';
  store_id?: string;
}
```

Human output:

- When `--store` is selected, write exactly one root banner to stderr before or
  near the command payload:
  `Using OpenSpec root: team-context (/abs/path)`.
- Do not write the banner to stdout. This protects raw Markdown from `show` and
  agent-consumed text from `instructions`.
- Without `--store`, leave human output unchanged.

JSON output:

- On JSON success, add top-level `root` to every supported command's existing
  JSON payload.
- Keep existing command-specific fields stable; `root` is additive.
- Use `source: 'store'` with `store_id` only for selected stores.
- Use `source: 'nearest'` for nearest-root resolution.
- Use `source: 'implicit'` only for preserved implicit-root behavior.
- Resolver failures should have the same message text, error code, and non-zero
  exit behavior across supported commands. Existing JSON error envelopes can
  remain command-specific, but the resolver status inside them must be
  consistent and JSON-mode failures must not print prose or blank lines to
  stdout.

Path output:

- When a store is selected, any command output that names files in the store
  should use absolute paths.
- Without `--store`, preserve today's relative path style where practical.

## CLI Flag Contract

Supported commands get:

- `--store <id>` with help text like `Registered context store id to use as the
  OpenSpec root`.
- A deliberate `--store-path <path>` rejection path. Use a hidden/compatibility
  option if needed so Commander does not emit a generic unknown-option error.
- Top-level `show` needs special care because it currently uses
  `allowUnknownOption(true)`: explicitly register both `--store <id>` and a
  hidden `--store-path <path>` on that command so the unsupported path selector
  cannot be silently ignored.

`new change` cleanup:

- Remove or deliberately reject `--initiative`.
- Keep `--store` for root selection only.
- Reject `--store-path` with register guidance.
- Keep `--goal` as ordinary optional change metadata.
- Reject `--areas` because affected workspace links only made sense for
  workspace-scoped planning.

`set change` removal:

- Remove `set change` registration from `src/cli/index.ts`.
- Remove `SetChangeOptions`, `setChangeCommand` exports, and
  `src/commands/workflow/set-change.ts` if no remaining import needs them.
- Check `src/commands/workflow/initiative-link.ts` after both `new change` and
  `set change` stop importing it; remove it too if it becomes orphaned.
- Remove `set change` from completion metadata and command-reference tests.
- Do not add a deprecated stub or replacement command in this slice.

## Command Implementation Plan

### `new change`

- Resolve the OpenSpec root before validating schema or writing files.
- Remove initiative-link lookup and metadata creation.
- Remove or replace `assertInitiativeSelectorsHaveReference` and
  `assertRepoLocalInitiativeLinkPlanningHome` usage so `--store` no longer
  requires `--initiative`.
- Reject `--initiative`, `--store-path`, and `--areas` before creating files.
- Preserve `--description`, `--goal`, `--schema`, and `--json`.
- Write changes under the resolved root's `openspec/changes/`.
- When selected by store, print the root banner to stderr and use absolute paths
  in human and JSON path fields.
- Add `root` to JSON success.

### `status`

- Add selector options and resolve the root.
- Use the resolved root for change discovery, schema resolution, and
  `loadChangeContext`.
- Add `root` to every JSON success shape, including no-active-changes output.
- Print the selected-store banner to stderr in human mode.

### `instructions`

- Add selector options and resolve the root for both artifact instructions and
  `instructions apply`.
- Keep stdout payload clean. The root banner goes to stderr only.
- Add `root` to JSON success for artifact and apply instructions.
- Ensure file paths returned for selected stores are absolute where they point
  into the store.

### `list`

- Update top-level `openspec list` to resolve the root before listing.
- Make `ListCommand` accept an absolute root or directories instead of assuming
  cwd.
- Preserve deprecated noun-form `openspec change list` and `openspec spec list`
  behavior.
- Add minimal JSON support for `list --specs --json` in this slice so specs mode
  also gets the shared `root` block.
- Add `root` to JSON success and stderr banner for selected stores.

### `show`

- Resolve the root in top-level `openspec show`.
- Update item discovery to accept a root path.
- Update top-level show delegation so change/spec reads use the resolved root.
- Preserve deprecated noun-form commands as cwd-based.
- Keep raw Markdown stdout unmodified; root banner goes to stderr.
- Add `root` to JSON success for both change and spec output.
- Add a focused `show --store-path /x` test because `allowUnknownOption(true)`
  would otherwise mask the deliberate rejection.

### `validate`

- Resolve the root in top-level `openspec validate`.
- Update direct validation, type detection, bulk validation, and interactive
  item pickers to discover and operate within the resolved root.
- Add `root` to JSON success for single-item and bulk output.
- Keep deprecated noun-form `change validate` and `spec validate` cwd-based.

### `archive`

- Add `--store <id>`, deliberate `--store-path` rejection, and `--json`.
- Resolve the root before selecting or validating a change.
- Use selected root changes, specs, and archive directories for validation,
  spec updates, and moving the change into archive.
- In JSON mode, return the archive result and root block without human prose.
- JSON mode must be non-interactive: suppress spinner/ora output and
  confirmation prompts (require `--yes` or fail with a clear error instead of
  hanging on a prompt).
- JSON mode requires an explicit change name. Without one, fail before the
  interactive picker.
- JSON failure cases such as validation failure, incomplete-task refusal,
  spec-update abort, and cancelled confirmation should exit non-zero and emit a
  machine-readable diagnostic instead of stdout prose. Do not let CLI wrapper
  blank lines or ora failure output pollute JSON stdout.
- In human mode, print selected-store root banner to stderr and keep archive
  status/progress on stdout.

### `context-store setup` and `register`

- Update successful human next steps to show normal command usage:
  `openspec new change <id> --store <store-id>`.
- Update JSON output only if there is already a next-steps field. Do not invent a
  large onboarding payload in this slice.

## Error And Diagnostic Plan

Use existing error styles where possible, but make these cases clear. The names
below are the normal-command diagnostic names; when reusing existing
`ContextStoreError` codes, document the mapping instead of inventing a second
taxonomy silently:

- `unknown_store`: names the unknown id and lists registered ids.
- `no_registered_stores`: when `--store` is used with no registry; must not
  suggest `--store-path`.
- `unhealthy_store_root`: describes missing/incomplete root and points to
  `openspec context-store doctor`.
- `store_identity_mismatch`: describes registry id vs metadata id and points to
  doctor.
- `store_path_not_supported`: points to `context-store register` plus
  `--store <id>`.
- `no_root_with_registered_stores`: names registered stores and suggests
  `--store <id>` or `openspec init`.
- `initiative_option_removed`: tells users that normal changes no longer attach
  to initiatives.
- `areas_option_removed`: tells users that workspace affected areas are not part
  of the normal OpenSpec root path.

Guardrails:

- Resolution failures must occur before writes.
- Store health failures must not run setup/repair.
- Metadata missing or id mismatch should be reported before generic root-health
  failures.
- Unknown or removed options should not create partial change directories.
- No supported command should silently ignore `--store` or `--store-path`.

## Test Plan

Create focused helpers for this slice rather than copying large setup blocks.
Suggested helper shape:

- Temporary app repo root with no `openspec/`.
- Temporary app repo root with its own `openspec/`.
- Temporary registered context store with healthy root.
- Helpers to write store metadata and registry under isolated
  `XDG_DATA_HOME`/`XDG_CONFIG_HOME`.
- Helpers to create changes/specs in a chosen root.
- Helper to parse JSON and assert root block.

Add or update tests:

- `test/core/root-selection.test.ts` or `test/core/planning-home.test.ts`
  for resolver behavior:
  - selected store resolves to healthy root.
  - unknown store lists registered ids.
  - unhealthy root fails without repair.
  - metadata mismatch fails.
  - nearest root wins without `--store`.
  - leftover workspace state is ignored.
  - no root plus registered stores fails with store-selection hint.
  - no root plus no registered stores allows implicit only when requested.
- `test/commands/store-root-selection.test.ts` for CLI end-to-end behavior:
  - `new change --store team-context` creates only in the store.
  - selected store wins over nearby root.
  - `status`, `instructions`, `list`, `show`, `validate`, and `archive` operate
    in the selected store.
  - human selected-store output writes the root banner to stderr and leaves
    `show`/`instructions` stdout clean.
  - JSON success payloads include the shared `root` block.
  - paths in selected-store output are absolute.
  - `--store-path` rejects with register guidance, including
    `show --store-path /x`.
  - unknown-store resolver errors have matching code/message/exit behavior
    across at least two commands.
  - invalid store id format fails before registry lookup.
  - no-root plus registered stores fails without scaffolding.
  - workspace state alone is not a root.
  - `validate --all`, archive's interactive picker in human mode, and other
    item pickers use the resolved root.
  - stderr/stdout purity tests distinguish streams by spawning the built CLI or
    by separately stubbing `process.stdout.write` and `process.stderr.write`;
    assert `show` stdout starts with the raw Markdown payload.
- `test/commands/artifact-workflow.test.ts` updates:
  - `new change --initiative` now rejects and writes no change.
  - `new change --areas` rejects and writes no affected-area metadata.
  - `new change --goal` still writes ordinary metadata and does not switch schema.
- `test/commands/change-initiative-link.test.ts`:
  - delete or rewrite as legacy-read-only coverage.
  - Initiative commands can remain tested elsewhere, but normal `new change` and
    `set change` linking expectations must be removed.
- `test/commands/completion.test.ts` and
  `test/core/completions/command-registry.test.ts`:
  - `new change` advertises `--store` as root selection.
  - `set change` is absent.
  - old initiative wording is absent from normal `new change` completion
    metadata.
- `test/commands/context-store.test.ts`:
  - setup/register next-step output shows `--store` usage.
- `test/core/archive.test.ts` and command-level archive tests:
  - archive can run against an explicit root and JSON payload includes root.
  - `archive --json` without a change name fails non-interactively.
  - JSON validation/spec-update/task-check failures exit non-zero without prose
    on stdout.

Run order during implementation:

```bash
pnpm test -- test/core/root-selection.test.ts
pnpm test -- test/commands/store-root-selection.test.ts
pnpm test -- test/commands/artifact-workflow.test.ts
pnpm test -- test/commands/context-store.test.ts
pnpm test -- test/commands/completion.test.ts
pnpm test -- test/commands/validate.test.ts test/commands/show.test.ts
pnpm run build
pnpm test
```

## Implementation Checklist

- [ ] Add shared root selection types, resolver, root JSON helper, and selected
  store stderr banner helper.
- [ ] Wrap or update context-store registry errors so normal commands drop
  `--store-path` suggestions and unknown stores list registered ids.
- [ ] Add root-aware item discovery helpers for changes, specs, and archived
  changes.
- [ ] Update supported CLI command option types and parser wiring.
- [ ] Remove `openspec set change` registration and normal command completion
  metadata.
- [ ] Remove `setChangeCommand` exports and implementation if unused.
- [ ] Update `new change` to root selection only, with initiative and areas
  rejection before writes, and remove initiative selector assertions that would
  reject `--store` without `--initiative`.
- [ ] Update `status` and `instructions` to use the shared resolver and output
  root information.
- [ ] Update `list`, including specs JSON output, to use the shared resolver.
- [ ] Update top-level `show` to use the shared resolver while leaving noun-form
  commands unchanged.
- [ ] Update top-level `validate`, including bulk and interactive paths, to use
  the shared resolver.
- [ ] Update `archive` to support selectors, JSON success and failure output,
  non-interactive JSON mode, and selected-root filesystem paths.
- [ ] Update `context-store setup` and `register` next-step output.
- [ ] Decide whether `src/commands/workflow/initiative-link.ts` is still needed
  after `new change` and `set change` cleanup; remove orphaned exports only when
  no remaining imports use them.
- [ ] Replace initiative-link creation tests with removed-option and legacy-read
  tests.
- [ ] Add root-selection resolver and CLI tests from the matrix above.
- [ ] Run targeted tests, then build, then full test suite.

## Risks And Guardrails

- Raw stdout pollution is the easiest regression. Keep root banners on stderr and
  assert that `show` and `instructions` stdout starts with their normal payload.
- Commander unknown-option behavior can produce generic errors or, for `show`,
  silently ignore options because of `allowUnknownOption(true)`. Add deliberate
  hidden compatibility options for `--store-path` where needed.
- Bulk validation and interactive pickers are easy to miss because they discover
  items before opening files. Make discovery root-aware first.
- Existing `ChangeCommand` and `SpecCommand` are also used by deprecated noun
  commands. Avoid changing those constructors in a way that accidentally gives
  noun commands `--store` behavior.
- `archive` does validation, spec updates, task checks, and movement. Resolve all
  directories up front from the same root to avoid cross-root reads or writes.
- Do not let context-store registry resolution create metadata or repair roots.
  Selection is read-only diagnosis plus command execution.

## Done Definition

- All supported commands accept `--store <id>` and act on the selected root.
- `--store-path` rejects deliberately with register guidance.
- No supported command silently ignores `--store`.
- Without `--store`, nearest-root behavior remains, workspace state no longer
  wins, and no-root-with-registered-stores fails with a clear hint.
- `new change` creates no initiative metadata, rejects old initiative options,
  and handles `--goal`/`--areas` per the spec.
- `openspec set change` is not registered, not in help, and not in completion
  metadata.
- JSON success payloads include the shared root block.
- JSON-mode resolver and archive-blocked failures are non-interactive,
  non-zero, and do not pollute stdout with human prose.
- Human selected-store output names the root on stderr without changing raw
  stdout payloads.
- Tests cover the acceptance scenarios in `spec.md`.
