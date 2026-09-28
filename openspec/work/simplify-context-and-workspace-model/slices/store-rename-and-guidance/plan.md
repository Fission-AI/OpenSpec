# Store Rename And Guidance Pass Plan

## Status

Spec locked 2026-06-11 after two parallel adversarial reviews (subagent +
codex CLI); all findings folded, including the governing rule the reviews
converged on: **total mechanical token rename, surgical prose rewrite,
behavior changes limited to the two riders.** Plan drafted 2026-06-11.
Implementation not started.

The main product move:

```text
One noun — store — everywhere, and guidance that makes agents discover
stores instead of being told about them.
```

## Source Of Truth

Start from `spec.md` (this folder). Also keep nearby:

- `../../roadmap.md` (1.4 section, locked terminology decision, 5.1
  criteria)
- `../store-root-selection/spec.md` (the `--store` selector semantics this
  slice renames around)
- `../store-lifecycle-proof/spec.md` (hint continuity contracts that must
  survive the rename)

Sequencing: stacks directly on the `codex/store-root-parity` tip (slices
1.1–1.3 implemented). The next queue item (the Phase 5 command-group
deletion) assumes this slice already stopped guidance from advertising the
groups it will delete.

## User-Facing Frame

What the human wants:

- "Stop making me translate between 'context store', `--store`, and
  `context_store_*`. One word."
- "When I tell my agent 'use the team store', it should just find it."
- "Help and docs should describe the product I actually have."

What the agent needs:

- A generated skill that says how to discover stores
  (`openspec store list --json`) and to carry `--store <id>` on every
  command when work selects a store.
- Errors and hints that paste-and-run, even on the legacy surfaces that
  survive until the next slice.

How we know it worked:

- The repo-wide token sweep comes back empty outside the whitelist, and
  the sweep is itself a test.
- The headless dogfood: one plain prompt, store discovered, change created
  in the store root.

## Goals

- Rename the `context-store` group to `store` (subcommands unchanged), the
  machine tokens (45 diagnostic codes, dotted `context_store.*` diagnostic
  fields,
  JSON keys, data dir `context-stores/` → `stores/`), and the internal
  identifiers (module dir, command file, symbols, test files).
- Land the two riders: `workspace open` loses `--store`/`--store-path`;
  the `store` group gains an unknown-subcommand hint.
- Regenerate guidance: store teaching in all workflow skill templates,
  legacy labeling for workspace/initiative, rewritten
  `.codex/skills/use-openspec/`, docs accuracy pass.
- Encode the vocabulary sweep as a test; guard the committed format
  literals with tests.
- Run the headless dogfood proof and keep the transcript.

## Non-Goals

- No deletion of the `workspace`/`initiative` groups (next slice); no
  restructuring of their internals beyond token substitution.
- No changes to `schemas/workspace-planning/`, the `workspace-planning`
  schema name, or the `actionContext.mode` contract value.
- No resolver, setup, register, or doctor behavior changes; no new flags.
- No migration of the old `context-stores/` data dir.
- No `.openspec-store/store.yaml` or registry shape changes.
- No public concept-docs rewrite beyond the accuracy pass.

## Current Code Map

### The store feature (renames wholesale)

- `src/core/context-store/` → becomes `src/core/store/`:
  - `foundation.ts` — constants at lines 12–15:
    `CONTEXT_STORE_METADATA_DIR_NAME = '.openspec-store'` and
    `CONTEXT_STORE_METADATA_FILE_NAME = 'store.yaml'` **keep their
    values** (symbols rename); `CONTEXT_STORES_DIR_NAME =
    'context-stores'` renames symbol *and value* (→ `'stores'`);
    `CONTEXT_STORE_REGISTRY_FILE_NAME = 'registry.yaml'` keeps its value.
    Path fns at 59–65; **`getDefaultContextStoreRoot` at 67–69 is deleted**
    (dead since 1.3 made `--path` required). Codes:
    `invalid_context_store_id` (104, 115), `invalid_context_store_metadata`
    (209), `invalid_context_store_registry` (216),
    `context_store_registry_busy` (392).
  - `operations.ts` (~1077 lines) — setup/register/doctor operations,
    ~20 codes, `context_store.*` dotted diagnostic fields, "context store" prose in
    errors.
  - `registry.ts` — `context_store_id_conflict` (100),
    `context_store_path_conflict` (111), `context_store_not_found`
    (149, 382), `no_context_store_registry` (403).
  - `binding.ts` — selector/binding codes (184, 202, 242, 245, 257, 268,
    271, 320, 323).
  - `git.ts` — `context_store_git_*` codes; `errors.ts` —
    `ContextStoreError`; `index.ts` — exports.
- `src/commands/context-store.ts` (751 lines) → `src/commands/store.ts`:
  `registerContextStoreCommand` at 691–751 (group + 6 subcommands, `ls`
  alias at 737); output interfaces with `context_store`/`context_stores`
  JSON keys at 60, 76, 90, 111 (mapped at 143–211); `context_store_error`
  (225) and setup/register/remove cancellation codes (290–407).
- `src/cli/index.ts` — import (22), `STORE_OPTION_DESCRIPTION` (41),
  `hiddenStorePathOption` rejection text naming `context-store register`
  (47–53), telemetry generic command-path tracker (100–101), registration
  call (349).

### Other live surfaces (token substitution per the rename rule)

- `src/core/root-selection.ts` — "context store" error prose (156, 166,
  258) and `context_store.*` dotted diagnostic fields (159–228).
- `src/core/openspec-root.ts` — dotted diagnostic fields (110, 119).
- `src/core/change-metadata/schema.ts:14` — "Context store id" message.
- `src/core/collections/runtime.ts:282` — prose.
- `src/core/collections/initiatives/resolution.ts` — codes
  `context_stores_unreadable` (548) / `context_stores_partially_unreadable`,
  pasteable fix texts naming `context-store` commands (551, 565, 625),
  selector advertising (192, 234 — must name surviving selectors only
  after rider 1).
- `src/commands/initiative.ts` — JSON keys (50–71), `--store`/
  `--store-path` descriptions (464–469), group one-liner (476).
- `src/commands/workspace/` — group one-liner (`registration.ts:53`),
  `open` selectors to remove (`registration.ts:138–139`), JSON key and
  `workspace_context_store_unavailable` (`open-view.ts:61, 209, 211`),
  fix text (`context-status.ts:48`), binding usage + fix text + picker
  labels (`open-target-selection.ts:88, 142, 221`).
- `src/core/workspace/open-surface.ts` — legacy generated workspace
  guidance mentioning context stores (21, 120–138): token substitution
  only.
- `src/core/workspace/foundation.ts` — `ContextStoreBinding`/
  `ContextStoreSelector` types, zod schemas, and helpers (5–8, 47,
  155–181, 327–361); `src/commands/workspace/operations.ts:795` (fix
  text); `src/commands/workspace.ts:219` (printed line
  "Initiative/context-store files are shared coordination context.");
  `src/commands/workspace/types.ts:1,24`; `src/core/index.ts:16`
  (re-export of `./context-store/index.js`);
  `src/core/change-status-policy.ts:44` and
  `src/commands/workflow/new-change.ts:5` (doc comments).
- **This map is grep-grounded but not exhaustive by construction**: CP1
  is sweep-driven (`rg` over the four token forms), and the CP4 sweep
  test is the backstop. Do not treat the listed files as the full set.

### Completions

- `src/core/completions/shared-flags.ts:29–33` — `--store` description.
- `src/core/completions/command-registry.ts` — workspace group (251+),
  `workspace open` selectors (383–392), `context-store` group (419+),
  initiative group (511+). Parity with live Commander commands is
  enforced by `test/core/completions/command-registry.test.ts:144–150`
  (`assertRegistryParity`), so registration and registry must change
  together.

### Generated guidance

- `src/core/templates/workflows/` — 12 files; each exports a skill
  template and an opsx command template with identical instruction
  bodies (hence guards appearing twice per file). Guards in apply-change
  (54, 214), archive-change (37, 155), bulk-archive-change (44, 293),
  sync-specs (36, 184), verify-change (38, 210). Out-of-guard workspace
  prose: continue-change (72, 192), onboard (281).
- Generation: `src/core/shared/skill-generation.ts` (template registry at
  56–69, `generateSkillContent` at 127–149); profile selection in
  `src/core/profiles.ts:14–31` (core = propose, explore, apply, sync,
  archive); init writes skills per tool dir (`src/core/init.ts:516–546`).
- **Hash pins**: `test/core/templates/skill-templates-parity.test.ts`
  pins function payload hashes (32–56) and generated-content hashes
  (58–70), and asserts guard text presence (154–171). Template edits
  require deliberate hash updates — that is the test working as designed.

### Checked-in guidance and docs

- `.codex/skills/use-openspec/SKILL.md` — description (3), beta routing
  (41–48, 67–68), invariants (73–80).
- `.codex/skills/use-openspec/references/shared-context-beta.md` —
  deleted.
- `.codex/skills/use-openspec/references/artifact-placement.md` — beta
  flow mentions (42–44), workspace inspection routing (56–60),
  initiative/workspace flows (83–92).
- `docs/cli.md` — summary table (11, 57–62), workspace open flags
  (320–328, selector rows 323–325), context-store section (354–450,
  stale default-XDG-path text near 377).
- `docs/workspaces-beta/agent-cli-playbook.md` (10, 22) and
  `user-guide.md` (8) — `context-store` invocations.

### Tests (blast radius)

- Rename + expectation updates: `test/commands/context-store.test.ts`
  (72 occurrences) and `context-store-git.test.ts` (rename files),
  `test/core/context-store/{foundation,registry}.test.ts` (rename dir),
  `test/helpers/context-store-git.ts`,
  `test/commands/store-root-selection.test.ts`,
  `test/core/root-selection.test.ts`,
  `test/cli-e2e/store-lifecycle.test.ts`,
  `test/commands/initiative.test.ts`,
  `test/commands/workspace-initiative-open.test.ts`,
  `test/core/collections/**`, `test/utils/change-metadata.test.ts`,
  `test/core/completions/command-registry.test.ts`,
  `test/core/templates/skill-templates-parity.test.ts`,
  `test/core/shared/skill-generation.test.ts`,
  `test/commands/workspace.interactive.test.ts` (10, 120 — uses the
  register helper), `test/core/archive.test.ts:28` (comment only).
- Nuance: `test/commands/context-store.test.ts:244` uses
  `getDefaultContextStoreRoot` in a *negative* regression assertion
  guarding 1.3's no-default-path behavior. Keep the assertion; compute
  the would-be default path inline instead of deleting it with the
  helper.

## Implementation Plan

Four checkpoints, each ending green on the full suite before commit.

### Checkpoint 1 — the mechanical rename (one commit, rename-only)

Serial, compiler-driven, one actor (the renames are interlocked through
imports; fanning out would only create merge pain on shared files):

1. `git mv src/core/context-store src/core/store`;
   `git mv src/commands/context-store.ts src/commands/store.ts`; rename
   test dirs/files and `test/helpers/context-store-git.ts` similarly.
2. Symbol rename `ContextStore*` → `Store*` (and `contextStore*` locals)
   across `src/` and `test/`; fix imports; delete
   `getDefaultContextStoreRoot` and its tests.
3. Value renames: `CONTEXT_STORES_DIR_NAME` symbol → `STORES_DIR_NAME`,
   value `'context-stores'` → `'stores'`. Metadata dir/file and registry
   filename values unchanged.
4. Token sweep over diagnostics and JSON: every code containing
   `context_store` → `store` form (sweep-driven, not list-driven; 45
   today including `invalid_*`, `no_*`, plural `context_stores_*`, and
   `workspace_context_store_unavailable`); dotted `context_store.*`
   diagnostic fields → `store.*`; JSON keys `context_store`/`context_stores` →
   `store`/`stores` everywhere they appear, initiative and workspace
   output included.
5. Command registration rename (`store` group, subcommands untouched) and
   every help/error/hint string: "context store" → "store" with the
   locked definition where the string defines the noun; pasteable hints
   now name `openspec store ...` commands. Completions registry entries
   change in the same step (parity test enforces).
6. Update test expectations mechanically (renamed codes, keys, command
   strings, data-dir paths). No behavior assertions weaken.

Build, full suite, commit.

### Checkpoint 2 — the two riders (one commit)

1. Remove `--store`/`--store-path` from `workspace open` — the exact
   deletion list: the option registrations (`registration.ts:138–139`),
   the `WorkspaceOpenOptions.store`/`storePath` fields
   (`types.ts:75–76`), the now-unreachable first branch of
   `assertWorkspaceOpenSupportedOptions` (`open-view.ts:102–112`)
   including the `workspace_open_store_without_initiative` code and its
   fix text (which advertises the removed selectors), the resolver
   handoff (`open-view.ts:175–178`), and the `command-registry.ts`
   entries (383–392). **Persisted path-bound view state stays**: views
   already created with a path binding keep reopening and doctoring
   through `WorkspaceContextState` (`open-view.ts:184`); only the CLI
   selectors for *new* opens disappear. Initiative resolution keeps the
   cross-store search, the qualified `<store>/<initiative>` form, and
   the interactive picker; its selector-advertising fix texts
   (resolution.ts:192, 234) reword to name only surviving forms.
2. Unknown-subcommand hint on the `store` group: Commander 14's
   `command:*` listener fires for unknown operands on a group with no
   action handler (verified in `command.js:1624–1628`) — but registering
   it **suppresses the default unknownCommand error**, so the handler
   owns the entire stderr text and the exit path (write the full
   error + subcommand list including `ls` + the
   `openspec <command> --store <id>` redirect, then exit 1 via
   `store.error(...)`/explicit exit code). Same text for human and
   `--json` invocations. Verify against the built binary, not just
   unit-level.
3. Tests: workspace-open unknown-option rejection (rewrite the four
   selector-using sites at `workspace-initiative-open.test.ts:134, 284,
   370, 435`); preserve a path-bound reopen/doctor case by writing the
   view state fixture directly instead of creating it via the removed
   flag; new store unknown-subcommand e2e test, which also carries the
   spec's negative assertions — `openspec context-store <anything>`
   fails as unknown with no alias, and `openspec --help` lists `store`
   (locked one-liner) with no `context-store` entry.

Build, full suite, commit.

### Checkpoint 3 — guidance regeneration (one commit)

Disjoint file sets; per the runbook parallelism policy these three
streams may run as a Workflow fan-out with worktree isolation, with one
integration point:

- **Templates**: add one shared store-selection block (single exported
  constant; ~22 call sites across skill + command template functions) —
  discover with `openspec store list --json`, carry `--store <id>` on
  every issued command, hints carry the flag. Reword the three
  out-of-guard workspace-prose mentions (continue-change 72/192,
  onboard 281) to schema-instruction language. Guards untouched. Update
  both hash tables in `skill-templates-parity.test.ts` deliberately and
  extend its guard assertions to require the store block.
- **Checked-in guidance + docs**: rewrite
  `.codex/skills/use-openspec/SKILL.md` (store discovery as the
  inspection step; no initiative/workspace routing); delete
  `references/shared-context-beta.md`; update
  `references/artifact-placement.md`; docs accuracy pass: `docs/cli.md`
  (store section + summary table + workspace-open flag rows *and the
  `--store` example at line ~338* + stale XDG-path text),
  `docs/concepts.md` (token renames at 63, 105, and any others the
  sweep finds), and `docs/workspaces-beta/` — where token renames alone
  are not enough: `agent-cli-playbook.md:28` documents setup without
  `--path` (required since 1.3) and `user-guide.md:9-13` describes the
  pre-1.3 flagless prompt flow, so those examples get `--path` and the
  prose corrected, or every documented invocation fails the docs
  acceptance scenario at runtime rather than at parse time. Close the
  stream by extracting the fenced `openspec` invocations from the
  touched docs and running them (placeholder-aware) against the built
  binary.
- **Help-surface labeling**: `workspace` and `initiative` group
  one-liners (registration files + completions registry) gain the
  legacy-beta labeling; confirm no completions text presents their flows
  as normal steps.

Integrate, build, full suite, commit.

### Checkpoint 4 — sweep, guards, dogfood (one commit)

1. **Sweep-as-test**: new `test/vocabulary-sweep.test.ts` walking
   exactly the spec's sweep roots — `src/`, `test/`, `docs/`, `.codex/`,
   `scripts/` — for `context-store`, `context_store`, `contextStore`,
   and `context store` (case-insensitive), failing with offending
   file:line. The `openspec/` tree (planning history: `work/`,
   `changes/`, `initiatives/`, `explorations/`) is **outside the sweep
   roots by design**, not whitelisted inside them. Within the roots the
   only exemption is the sweep file's own pattern definitions (built by
   concatenation so they never self-match); the committed format
   literals (`.openspec-store`, `store.yaml`) don't match the patterns
   at all.
2. **Format guards**: explicit test pinning `.openspec-store` and
   `store.yaml` literals on disk after setup; test that a store created
   with pre-rename code (fixture built by writing the old-shape files
   directly) registers cleanly; test that the registry now lives at
   `<data-dir>/stores/registry.yaml`. **Negative fixtures for the old
   dir**: a data dir containing only the old
   `context-stores/registry.yaml` (one valid, one corrupt variant) —
   `store list --json` and root selection ignore it without erroring,
   and nothing writes into `context-stores/`.
3. **Telemetry**: one assertion that the tracked command path for a
   store subcommand is the `store:` form; plus an exact-equality check
   that the `--store` description string is identical across Commander
   registrations and completions metadata (the spec's one-description
   scenario), and a checked-in-guidance grep test that
   `.codex/skills/use-openspec/` contains no `initiative list`/
   `workspace list` steps.
4. **Dogfood proof**: scratch project repo,
   `openspec init <scratch> --tools claude --profile core` (the
   `--tools` flag disables prompting, `src/core/init.ts:175–177`),
   isolated `XDG_*` state, `openspec store setup team-context --path
   <tmp>/store`; then one headless agent run (`claude -p` or codex
   exec) with a plain prompt ("create a change in our team store for
   <topic>") and the built CLI on PATH. Assert the change landed under
   the store's `openspec/changes/` and no initiative/workspace command
   ran; save the transcript under this slice folder as
   `dogfood-transcript.md`.

Build, full suite, commit (transcript + any fixes).

## Test Plan

Run order during implementation:

```bash
pnpm test -- test/core/store test/commands/store.test.ts        # CP1 core
pnpm test -- test/commands/store-root-selection.test.ts test/core/root-selection.test.ts
pnpm test -- test/commands/initiative.test.ts test/commands/workspace-initiative-open.test.ts
pnpm test -- test/core/completions/command-registry.test.ts
pnpm test -- test/core/templates test/core/shared/skill-generation.test.ts  # CP3
pnpm run build && pnpm test -- test/cli-e2e/                    # built-binary checks
pnpm test                                                        # full suite per checkpoint
```

New tests added by this slice: vocabulary sweep; store
unknown-subcommand hint (carrying the no-alias and `--help` negative
assertions); workspace-open selector rejection + fixture-based
path-bound reopen; data-dir location + old-dir ignored (valid and
corrupt old registries); pre-rename store registers; committed format
literal pins; telemetry path; `--store` description exact-equality;
checked-in-guidance grep; docs invocation smoke over touched docs;
store block present in generated skills (parity test extension).

## Risks And Guardrails

- **The parity hash tables are the intended friction.** Template edits
  must update `EXPECTED_FUNCTION_HASHES` and
  `EXPECTED_GENERATED_SKILL_CONTENT_HASHES` in the same commit, with the
  diff showing exactly the store block and the three rewordings — never
  regenerate hashes without reading the content diff.
- **Registry/Commander parity**: `assertRegistryParity` fails unless
  registration and completions change in lockstep; do them in one step.
- **Sweep test self-match**: build the forbidden patterns dynamically
  (string concatenation) so the sweep file never matches itself; keep the
  whitelist explicit and short.
- **Commander unknown-subcommand mechanics** differ by version; rider 2
  must be verified against the built binary (e2e), not only via unit
  harness.
- **Initiative/workspace JSON key renames** change contracts of dying
  commands; their tests update mechanically — do not add new coverage,
  do not restructure (the next slice deletes them).
- **Dev-local registries orphaned** by the data-dir rename: acceptable
  and intended (zero users); noted so nobody "fixes" it with a shim.
- **Rename-only commit discipline**: checkpoint 1 mixes file moves with
  token edits by necessity, but keeps prose rewrites out so the diff
  reads as a rename; reviewers diff checkpoints 2–4 for judgment calls.
- **The dogfood depends on agent CLI availability**: if the headless
  agent cannot run in this environment, fall back to scripting the
  agent's expected command sequence is **not** acceptable evidence — the
  proof is agent autonomy; surface the blocker in the status instead.

## Done Definition

- All spec acceptance scenarios pass; the four checkpoint commits are on
  `codex/store-root-parity` with the full suite green at each.
- The vocabulary sweep test is in the suite and passing; format-literal
  guards in place.
- The dogfood transcript is committed and shows single-prompt store
  discovery.
- Roadmap 1.4 progress boxes for spec/plan/implementation/tests ticked,
  changelog updated, slice artifacts consistent with what shipped.
