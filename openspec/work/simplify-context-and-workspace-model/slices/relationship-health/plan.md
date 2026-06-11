# Relationship Health Plan (3.6)

## Status

Spec locked 2026-06-11 after two adversarial rounds (the real
store-doctor exit contract; the four-category JSON shape with the
store section; the inert-pointer deferral landed; the
`includeSpecs: false` assembler mode; the pre-read registry input).
Plan drafted 2026-06-11. Implementation not started.

The main move:

```text
One read-only command composing five slices' diagnostics — and "is my
setup healthy?" has one answer in one place.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(the report-separation lock + recorded deferrals),
`../store-references/spec.md` (3.1 codes), `../repo-map/spec.md`
(3.5 silence-by-design cases), `../store-targets/spec.md` (the
inert-pointer deferral).

## Current Code Map (verified during spec review)

- **Assemblers**: `assembleReferenceIndex`
  (`references.ts:210-214` input; spec-file reads at `:113-131`;
  budget at `:321-354`; internal registry read at `:229-238`) — gains
  `includeSpecs?: boolean` (default true) and
  `registryEntries?: StoreRegistryEntry[] | null` (pre-read injection,
  `[]` = empty, `null` = unreadable; instructions keeps the internal
  read); `assembleTargets` (`targets.ts`) — takes `repoPaths` AND
  `storeConfigPath` (the fix text needs it); invalid ids excluded
  from repos (the INSPECTOR re-derives them from the raw declarations
  with `isKebabId` — never from message text).
- **Root/store facts**: `inspectOpenSpecRoot` (`openspec-root.ts`),
  `readOptionalStoreMetadataState` (`foundation.ts:464`),
  `gitOriginUrl` (`git.ts:166`); declared roots carry `storeId`
  (`root-selection.ts:136,228,324`) so store facts work for both
  store-backed shapes.
- **Both-shapes/pointer detection**: `classifyOpenSpecDir`
  (`project-config.ts:455`) — the COMMAND re-classifies: at
  `source === 'nearest'` for both-shapes; at `source === 'declared'`
  it re-walks `findRepoPlanningRootSync(process.cwd())` to the pointer
  directory (no start path survives resolution) and reads THAT config
  for inert declarations.
- **Command precedents**: `store doctor` flow (`store.ts:655-668` —
  prints payload, exits 0 regardless of entry severity; exit 1 only
  via `handleFailure` on throw); `resolveRootForCommand` failure
  payload pattern (`root-selection.ts:469-497` — doctor passes
  `{root: null, store: null, references: [], targets: [],
  status: []}` as its failure payload); `shared-output.ts`
  (`printJson`/`emitFailure` from 3.5's simplify).
- **Completions/CLI**: top-level flag-only command precedent is
  `status` (`command-registry.ts:161-178`); CLI registration beside
  `registerRepoCommand` (`cli/index.ts:319`); `store doctor` is a
  nested subcommand (`store.ts:753-759`) — no collision.
- **Guidance pin**: `STORE_SELECTION_GUIDANCE`
  (`src/core/templates/workflows/store-selection.ts:7`) enumerates the
  `--store` commands; the parity test
  (`command-registry.test.ts:167-184`) walks every visible command —
  doctor joins both, and the skill-template hash pins
  (`test/core/templates/skill-templates-parity.test.ts`) update
  deliberately.
- **Tests**: `test/commands/store.test.ts` (doctor precedents),
  `test/core/references.test.ts` / `test/core/targets.test.ts`
  (assembler pins), helpers in `test/helpers/`.

## Implementation Plan

### Checkpoint 1 — assembler options, core inspector (commit)

1. `references.ts`: `AssembleReferenceIndexInput` gains
   `includeSpecs?: boolean` (default true; false skips
   `collectSpecEntries` AND the budget block — the `specs`/`fetch`
   KEYS are absent, not empty: pin `'specs' in entry === false`) and
   `registryEntries?: StoreRegistryEntry[] | null` — mirroring the
   assembler's own post-read variable, because
   `readStoreRegistryState` returns NULL for an absent (healthy-empty)
   registry and THROWS for a corrupt one: injected `[]` = empty,
   injected `null` = unreadable. (A naive `registryState | null`
   injection would mark every fresh machine unreadable.) Doctor maps
   success-null → `[]`, catch → `null`. Existing behavior
   byte-identical when neither option is passed; 3.1 pins untouched.
2. `src/core/relationship-health.ts` (pure, no I/O):
   - `RelationshipHealth {root: {path, source, store_id?, healthy,
     status}, store: {...} | null, references: [...], targets: [...],
     status: []}` per the spec shape.
   - `inspectRelationships({root, rootInspection, storeFacts,
     referenceEntries, effectiveTargets, storeTargets, repoPaths,
     registryUnreadable, bothShapesPointer, inertPointerDeclarations})`
     — composes inputs the COMMAND gathered. `effectiveTargets` is
     `EffectiveTargets | null`; the inspector normalizes null →
     `targets: []`. It receives the RAW `storeTargets` declarations
     too and recovers grammar-invalid ids structurally with
     `isKebabId` (the diagnostics in `EffectiveTargets.status` carry
     the id only inside message text — never parse messages),
     synthesizing bare `{id, status: [target_invalid_id]}` entries.
     Synthesizes `target_unmapped` (suppressed when
     `registryUnreadable`), `relationship_registry_unreadable`, the
     both-shapes structured entry, `pointer_declarations_inert`, and
     `store_remote_divergence` (info, in the store section, only when
     both URLs exist and differ).
3. Unit tests: every diagnostic's presence/severity/fix/section; the
   suppression rule; the synthesized invalid entries; null-targets →
   empty normalization; empty-vs-broken shapes; divergence
   present/absent/matching; the truncation-never pin (a corpus that
   trips the 50KB budget under `includeSpecs: true` produces NO
   `reference_index_truncated` and no `specs`/`fetch` keys under
   `includeSpecs: false`); `reference_root_unhealthy` and
   `reference_invalid_id` pass through untouched.

### Checkpoint 2 — the doctor command, e2e, docs (commit)

1. `src/commands/doctor.ts`:
   - Resolution: `resolveRootForCommand` today forwards ONLY
     `{store, storePath}` — it must be EXTENDED to accept and forward
     `allowImplicitRoot` (additive option; existing callers
     unchanged). Doctor passes `allowImplicitRoot: false` and
     `failurePayload: {root: null, store: null, references: [],
     targets: []}` — NO `status` key in the payload (the mechanism at
     `root-selection.ts:487-490` merges `{...failurePayload,
     status: [error.diagnostic]}`; precedent: `new-change.ts:101-104`,
     the only existing failurePayload user). Exit 1 path covers
     no-root, unknown store, `store_id_is_repo`, resolution-time
     corrupt registry.
   - Gather: ONE `readStoreRegistryState()` in try/catch (success-null
     → empty entries, throw → unreadable); `readProjectConfig
     (root.path)` + `resolveConfigFilePath(root.path)` (the
     `storeConfigPath` for fix text, exactly as instructions thread
     it); `assembleReferenceIndex({includeSpecs: false,
     registryEntries})`; `assembleTargets({storeTargets,
     storeConfigPath, repoPaths})` (store-level only — no change
     metadata); `inspectOpenSpecRoot(root.path)`; store facts
     (`readOptionalStoreMetadataState` + `gitOriginUrl`) when
     `root.storeId`; `classifyOpenSpecDir(root.path)` when nearest;
     when `source === 'declared'`, RE-WALK
     `findRepoPlanningRootSync(process.cwd())` to find the pointer
     directory (the resolved root is the STORE; no start path
     survives resolution) and `readProjectConfig(pointerRoot)` for the
     inert-declarations detection — with a run-from-subdirectory e2e
     case.
   - Output: JSON via `printJson` with the four-key shape (root,
     store, references, targets + status); HUMAN output follows the
     spec's UX transcript as the authoritative artifact — THREE
     headings (Root / References / Targets) with the store facts as a
     `Store:` line under Root (the lock's separation holds: JSON keys
     separate all four; the human Store line is visibly distinct).
     "(none declared)" rendering, Fix lines, the resolution banner on
     stderr (free via resolveRootForCommand — assert it in the
     healthy e2e); exit 0 for all health findings.
   - CLI + completions registration; `--store` and `--json` flags;
     `STORE_SELECTION_GUIDANCE` gains doctor; skill-template parity
     hashes updated deliberately.
2. Surface e2e (`test/commands/doctor.test.ts`): the spec's full
   matrix — healthy three-session shapes; none-declared; unresolved
   reference under EMPTY registry (clone fix passes through) vs
   CORRUPT registry (`relationship_registry_unreadable` top-level +
   per-reference entries + bare targets); unmapped target fix;
   both-shapes; inert pointer declarations; divergence info;
   `doctor --store <repo-id>` exit 1 null-shape; no-root exit 1;
   read-only (tree snapshot) + byte-identity of
   instructions/list/status around a doctor run.
3. `docs/cli.md`: doctor section + summary row + pointers from the
   references/targets/repo-map sections.
4. Full suite; built-binary smoke of the UX transcript.

## Risks And Guardrails

- **Assembler regression surface**: `includeSpecs`/`registryState` are
  additive with defaults preserving 3.1/3.3 behavior — the references
  suites are the net; run them first.
- **The guidance/template pins**: hash updates are the deliberate
  friction — never loosen the parity test.
- **No new resolution semantics**: doctor resolves exactly like every
  command; the failure payload shape is the only doctor-specific
  error surface.
- **Read-only is pinned, not assumed**: the e2e snapshots the root and
  the global data dir around a doctor run.
- **Section vocabulary**: Root/Store/References/Targets — the lock's
  four categories, named identically in JSON keys, human headings,
  and docs.

## Done Definition

- All spec acceptance scenarios pass; both checkpoints green on the
  full suite and committed.
- Roadmap 3.6 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to 4.1 (Phase 3 complete).
