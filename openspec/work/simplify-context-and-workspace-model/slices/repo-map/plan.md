# Repo Map Plan (3.5)

## Status

Spec locked 2026-06-11 after two adversarial rounds (the
section-erasure P1; rejection precedence; path+id cross-section
uniqueness; pinned JSON contracts; the id.ts move). Plan drafted
2026-06-11. Implementation not started.

The main move:

```text
One registry, two typed sections, three small commands — and every
machine knows where the team's target repos live.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(the one-namespace lock + recorded decisions),
`../store-targets/spec.md` (the enrichment surface),
`../store-lifecycle-proof/spec.md` (the command-group contracts
mirrored).

## Current Code Map (verified during spec review)

- **Foundation** (`store/foundation.ts`): `RegistryStateSchema` strict
  at `:182-186`; `parseStoreRegistryState` rebuilds `{version, stores}`
  at `:263-266`; `serializeStoreRegistryState` at `:301-304`;
  `assertValidStoreIds` labels keys "store id" (`:239-248`); the
  single registry lock in `updateStoreRegistryState` (`:381-423`)
  makes cross-section checks race-free.
- **Registry** (`store/registry.ts`): `assertNoRegisteredStoreConflict`
  (`:83`) has FOUR call sites — `withRegisteredStore` (`:126`) plus
  three preflights in `operations.ts` (`:504` prepareSetupPlan, `:585`
  setupPreparedStore, `:775` registerExistingStore). The cross-section
  extension MUST live inside `assertNoRegisteredStoreConflict` itself
  so the preflights reject a repo-claimed id BEFORE any files are
  created (test: `store setup <repo-claimed-id>` creates nothing);
  `store_path_conflict` precedent (`:108-117`);
  `withRegisteredStore`/`withoutRegisteredStore` rebuild
  `{version, stores}` (`:135-140`, `:210-216`) — the P1 erasure sites.
- **Root selection** (`root-selection.ts`): registry state in hand at
  `:147-152`; unknown-store branches at `:157-177` (zero-stores first,
  then `unknown_store`); the pointer rewrap preserves code/target/fix
  (`:302-318`), so the typed hint propagates with the "Declared in"
  prefix.
- **Targets** (`core/targets.ts` + wiring): `assembleTargets` input;
  the wiring sites `instruction-loader.ts:343` and
  `instructions.ts:370`; `loadRootConfigContext`
  (`instructions.ts:82-101`) hosts the one additional registry read.
- **Id grammar**: `KEBAB_ID_REGEX`/`isKebabId` currently in
  `change-metadata/schema.ts:7-11`; consumers: schema itself,
  `store/foundation.ts:111`, `targets.ts:53`. New home `src/core/id.ts`
  (imports nothing; everyone imports it — no cycles possible).
- **Commands**: `src/commands/store.ts` shapes (`StoreMutationOutput`
  `:62-76`, list `:92`, `printMutationHuman`, `handleFailure`);
  completions registry `src/core/completions/command-registry.ts`
  (store group ~`:250`; the friction pins in
  `test/core/completions/command-registry.test.ts` — including the
  walks-every-visible-command parity test that REQUIRES a
  COMMAND_REGISTRY entry with a description for any new group); CLI
  wiring: `registerStoreCommand` (`store.ts:709`, registered at
  `cli/index.ts:317`) is the pattern; no existing command or alias
  collides with `repo`.
- **Tests**: `test/core/store/foundation.test.ts`,
  `test/commands/store.test.ts` (registry/commands precedents),
  `test/core/root-selection.test.ts` (its local `registerStore`
  helper; `registerStoreFixture` lives in
  `test/commands/store-root-selection.test.ts:81`),
  `test/commands/store-targets.test.ts` (enrichment), helpers in
  `test/helpers/`. No existing test pins the `no_registered_stores`
  fix text verbatim (only the code and a `--store-path` exclusion),
  so the repo-case fix variant is purely additive.

## Implementation Plan

### Checkpoint 1 — foundation, registry, id.ts (commit)

1. `src/core/id.ts` (NEW): `KEBAB_ID_REGEX`, `isKebabId`;
   `change-metadata/schema.ts` imports from it (keeps its
   `KebabIdentifierSchema` factory); `store/foundation.ts` and
   `core/targets.ts` switch imports. No behavior change anywhere.
2. `foundation.ts`:
   - `RepoEntrySchema {local_path: z.string().min(1)}` strict;
     `RegistryStateSchema` gains `repos:
     z.record(z.string(), RepoEntrySchema).optional()`.
   - `StoreRegistryState.repos?: Record<string, {local_path: string}>`.
   - `parseStoreRegistryState` and `serializeStoreRegistryState` carry
     the section through (spread-if-present, omitted-when-absent so a
     repos-less registry serializes byte-identically to today).
   - Key validation: repo keys validated with repo wording (do NOT
     reuse `assertValidStoreIds`' "store id" label).
3. `registry.ts`:
   - `withRegisteredStore`/`withoutRegisteredStore` preserve `repos`.
   - New `registerRepo({id, path})`, `unregisterRepo(id)`,
     `listRepoEntries(state)` (pure state→entries), and
     `getRepoPath(id)` (async: one registry read, then a dumb id
     lookup of the stored canonical path; null on miss or corrupt
     registry — NO filesystem or canonical comparison), with
     `withRegisteredRepo`/`withoutRegisteredRepo` preserving `stores`.
     Recorded deviation from spec decision 5: the targets enrichment
     uses `listRepoEntries` on its OWN single read (per-id
     `getRepoPath` calls would multiply reads); `getRepoPath`'s 3.5
     caller is `repo unregister` (fetching the path for output), and
     4.1 is its second consumer.
   - Cross-section assert extended: store writes check `repos` for id
     AND canonical-path claims (`store_id_claimed_by_repo`,
     `store_path_claimed_by_repo`); repo writes check `stores`
     (`repo_id_claimed_by_store`, `repo_path_claimed_by_store`) and
     their own section (`repo_id_conflict`-equivalent same-id
     different-path mirroring stores; `repo_path_conflict` same-path
     different-id).
   - Repo same-id/same-path no-op returns `already_registered`.
4. Tests: foundation round-trip (absent/present/both sections;
   pre-3.5 registry parses; repos-less serialization byte-identical;
   unknown keys fail); the PRESERVATION matrix (store register/
   unregister/setup-rerun keep `repos:` byte-identical, repo writes
   keep `stores:`); cross-section conflicts all four codes + both
   in-section conflicts + the early-reject pin (`store setup` with a
   repo-claimed id creates nothing); `getRepoPath`
   hit/miss/corrupt-registry-null; store list + doctor against a
   BOTH-sections registry (ignore repos, no crash); id.ts consumers
   behave identically (existing suites green).

### Checkpoint 2 — commands, rejection, enrichment, docs (commit)

1. `src/commands/repo.ts`: `repo register <path> [--id]`,
   `repo unregister <id>`, `repo list`, with the spec's pinned JSON
   contracts, human output mirroring the store group's voice,
   `invalid_repo_id` (+ the `--id` fix when the DEFAULT folder name
   fails grammar), `repo_not_found`; `--json` everywhere; CLI
   registration + completions entries + the friction-pin updates.
2. Root selection: in `resolveStoreRoot`, before BOTH unknown-id
   branches, check `registry.repos` for the id → `store_id_is_repo`
   with the two fix variants (stores-registered vs none). Unit tests
   incl. the zero-stores case and the pointer path.
3. Targets enrichment: `TargetRepoEntry = DeclarationEntry & {path?}`;
   `EffectiveTargets.repos: TargetRepoEntry[]`; `assembleTargets`
   input gains `repoPaths?: Map<string, string>`;
   `loadRootConfigContext` reads the registry once
   (`readStoreRegistryState` in try/catch → null on corrupt) and
   builds the map; both wiring sites pass it; renderer arrow + combined
   forms.
4. Surface tests: register/list/unregister e2e (default + explicit id;
   missing path; file-not-directory; rerun no-op; conflict messages
   verbatim; EMPTY list JSON `{repos: [], status: []}` + human "No
   repos registered." verbatim; unregister-unknown → `repo_not_found`;
   unregister leaves the directory untouched); `--store <repo-id>`
   typed hint (flag + pointer + zero stores) AND the mixed-registry
   positive (`--store team-context` resolves normally with repos
   present); enrichment on BOTH surfaces both modes (mapped path JSON
   + human arrow; combined remote+path; unmapped bare; corrupt
   registry bare; narrowed set; no-repos byte-identity vs pre-3.5).
5. `docs/cli.md`: the repo group section + enriched targets example +
   the local-not-shared sentence; summary table row.
6. Full suite; built-binary smoke of the UX transcript.

## Risks And Guardrails

- **The preservation matrix is the slice's spine** — write those tests
  FIRST in CP1 so the foundation/registry edits are driven by them.
- **Store-group regression surface**: every store flow passes through
  the touched write helpers; the full store suites are the net.
- **Friction pins**: completions registry tests pin flag lists —
  update deliberately, never loosen.
- **Vocabulary**: repo wording everywhere user-facing
  (`invalid_repo_id`, "repo id", "target repo"); never "store id" in
  repo contexts. The four claimant codes follow the recorded
  convention (section-being-written leads).
- **No store.ts copy-paste drift**: repo.ts mirrors shapes but stays
  small (no git probing, no metadata, no interactive prompts — repos
  register non-interactively; an interactive id prompt is NOT needed
  since the folder-name default covers the common case).
- **`getRepoPath` shape**: stored paths are already canonical; the
  lookup is a dumb id-keyed get after one registry read — no
  filesystem work, no canonical comparison.

## Done Definition

- All spec acceptance scenarios pass; both checkpoints green on the
  full suite and committed.
- Roadmap 3.5 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to 3.6.
