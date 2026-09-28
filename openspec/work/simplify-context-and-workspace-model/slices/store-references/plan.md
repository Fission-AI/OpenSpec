# Store References Plan (3.1)

## Status

Spec locked 2026-06-11 after two adversarial rounds (tolerant summary
extraction; both-surfaces-both-modes index; async command-boundary
assembly; 50KB shared budget; five warning codes; parse-raw/
validate-in-assembler split; one-level rule). Plan drafted 2026-06-11.
Implementation not started.

The main move:

```text
One declaration in config, one async assembler, one index in every
instructions output — upstream specs become fetchable context, never
copied content.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(Phase 3 locked decisions), `../store-rename-and-guidance/spec.md`
(vocabulary and hint bars the new strings must meet).

## Current Code Map (verified during spec review)

- **Config**: `src/core/project-config.ts` — `ProjectConfigSchema`
  (19-41), `readProjectConfig` (66-161) with resilient field-by-field
  `safeParse`; unknown keys already tolerated; 50KB context cap at 45,
  103. Consumers: `instruction-loader.ts:292`.
- **Artifact instructions**: command at
  `src/commands/workflow/instructions.ts` — root resolved (~74), sync
  `generateInstructions(context, artifactId, projectRoot)` called
  (~111), JSON emitted with `root: toRootOutput(root)` (~117), human
  `<project_context>` block at 171-178 (conditional on `context`).
  Generator: `src/core/artifact-graph/instruction-loader.ts:271-339`,
  returns `ArtifactInstructions` (71-104).
- **Apply instructions**: `generateApplyInstructions`
  (`instructions.ts:282-381`), JSON at ~418, human
  `printApplyInstructionsText` (429-484, markdown-style sections).
- **Store resolution pipeline**: `resolveStoreRoot`
  (`src/core/root-selection.ts:134-218`, private, async): registry
  lookup (unknown-id error at 163-174), metadata identity check
  (~187-203), root inspection via `inspectOpenSpecRoot` (healthy flag).
  Registry read: `loadStoreRegistry`/`listStoreRegistryEntries`
  (`src/core/store/{foundation,registry}.ts`).
- **Spec enumeration**: `getSpecIds` (`src/utils/item-discovery.ts:25-44`,
  skips dirs without `spec.md`). Sections parsing:
  `src/core/parsers/markdown-parser.ts` — `parseSections`/`findSection`
  usable without `parseSpec`'s throw-on-missing validation (80-86).
- **Id grammar**: `isValidStoreId` (`src/core/store/foundation.ts:122-128`).
- **Path canonicalization for self-reference**:
  `normalizePathForComparison` (`src/core/store/registry.ts:75-81`) or
  `FileSystemUtils.canonicalizeExistingPath`.
- **Diagnostic shape**: severity/code/message/fix(/target) as in
  `root-selection.ts:60-66` and store diagnostics.
- **Tests**: `test/core/project-config.test.ts`,
  `test/core/artifact-graph/instruction-loader.test.ts`,
  `test/commands/artifact-workflow.test.ts` (instructions output
  assertions — verify name at implementation), `test/cli-e2e/`.

## Implementation Plan

### Checkpoint 1 — config + assembler core (commit)

1. `project-config.ts`: add `references: z.array(z.string()).optional()`
   to the schema; in the resilient parse, keep string entries, drop
   non-strings (warn like other fields), dedupe order-preserving. No
   grammar validation here (decision 8).
2. New `src/core/references.ts`:
   - `export interface ReferenceSpecEntry { id: string; summary: string }`
   - `export interface ReferenceIndexEntry { store_id: string; root?: string;
     specs?: ReferenceSpecEntry[]; fetch?: string; status: Diagnostic[] }`
   - `export async function assembleReferenceIndex(input: {
     references: string[]; resolvedRoot: ResolvedOpenSpecRoot }):
     Promise<ReferenceIndexEntry[]>`
   - **One registry read for the whole call** (`readStoreRegistryState`
     + `listStoreRegistryEntries`, `foundation.ts:319-332` — note:
     missing registry file returns null → every reference degrades to
     `reference_unresolved`; corrupt file throws → try/catch maps every
     entry to `reference_registry_unreadable`).
   - Per id: grammar check (`isValidStoreId`) → `reference_invalid_id`;
     entry absent → `reference_unresolved` (fix carries `--id <id>`);
     entry present → the shared inspection (below); all its failure
     kinds → `reference_root_unhealthy` (incl. missing checkout path —
     `inspectOpenSpecRoot` already reports `healthy:false` for a
     nonexistent path); self-reference
     (`FileSystemUtils.canonicalizeExistingPath` equality with
     `resolvedRoot.path`, or `resolvedRoot.storeId === id`): omit the
     entry entirely.
   - **The extraction cut is narrow — stages 5-8 of `resolveStoreRoot`
     only** (metadata read/identity check + root inspection +
     canonicalization), as a new exported
     `inspectRegisteredStore(id, storeRoot)` returning a discriminated
     result (`ok` | `metadata_error` (captured StoreError) |
     `metadata_missing` | `metadata_id_mismatch` | `unhealthy_root`).
     `resolveStoreRoot` keeps stages 1-3 (validate, registry read,
     entry lookup) inline — those are exactly where the assembler
     deliberately diverges — and maps each failure kind to its existing
     throw, rethrowing the captured metadata `StoreError` so every
     current code and message stays byte-identical
     (`invalid_store_id`, `invalid_store_registry`,
     `invalid_store_metadata`, `no_registered_stores`, `unknown_store`,
     `store_identity_mismatch`, `unhealthy_store_root`).
   - Healthy: enumerate `getSpecIds(referencedRoot)`; per spec read
     `spec.md` with a **self-contained ~15-line first-Purpose-line
     scanner** (find the `## Purpose` heading, take the first non-empty
     line; `parseSections`/`findSection` are `protected` on the parser
     class — do not widen visibility); unreadable/unparseable → empty
     summary. Build `fetch`:
     `openspec show <spec-id> --type spec --store <id>`.
   - **Pure renderers live here too**:
     `renderReferencedStoresBlock(entries)` (artifact XML) and
     `renderReferencedStoresSection(entries)` (apply markdown). The
     assembler budgets incrementally against the larger of the two
     renderings: stop appending spec entries once the next line would
     exceed 50KB; the `reference_index_truncated` warning itself is
     exempt from the cap (no oscillation). The command layer prints
     these pre-rendered strings — no duplicate rendering logic.
3. Unit tests: `test/core/references.test.ts` covering every branch
   (resolved, each diagnostic, self-ref, zero specs, missing Purpose,
   unparseable file, dedupe+invalid mix, truncation) and
   `project-config.test.ts` additions.

### Checkpoint 2 — instruction surfaces + docs (commit)

1. Command layer (`instructions.ts`): after root resolution, **read the
   resolved root's config once** and pass it down — `generateInstructions`
   gains an optional pre-read config param that suppresses its internal
   `readProjectConfig` (omitted param keeps today's behavior for library
   callers/tests; no double read), and the references list feeds
   `await assembleReferenceIndex`. The index passes into
   `generateInstructions` (populates `ArtifactInstructions.references`)
   and into `generateApplyInstructions` (`ApplyInstructions` lives in
   `src/commands/workflow/shared.ts:34` — commands layer, edit there).
   Field omitted (not empty array) when no references are declared —
   additive JSON.
2. Human output:
   - Artifact mode: `<referenced_stores>` block printed in the fixed
     slot after the conditional `<project_context>`; per-store lines as
     in the spec UX (bare `- <id>` when summary empty; the
     "not registered" form with the pasteable fix; the comment line
     "Read-only upstream context. Fetch what you need; cite what you
     use.").
   - Apply mode: `### Referenced Stores` markdown section in
     `printApplyInstructionsText`, same content in that file's style.
3. `docs/cli.md`: new "Referencing stores from a project" subsection in
   the Stores section: the config key, the index behavior, one example.
4. Tests: instructions JSON shape for both surfaces (references
   present/omitted), human output ordering pins (context+references,
   references alone), apply human section; **symmetric-declaration
   test** (`instructions --store <id> --json` with the cwd config
   carrying *different* references — the index must be the store's);
   **boundary byte-identity test** (`status --json` and `new change` in
   a references-declared repo vs an identical repo without the key —
   identical output apart from the instructions surfaces, store
   untouched, no link metadata anywhere); **no-recursion assertion**
   (referenced store's own config carries references — they don't
   appear); **nothing-frozen assertion** (edit the store spec, re-run,
   summary changes); **not-inlined assertion** (spec body text absent
   from output); e2e layered-flow test in `test/cli-e2e/` (app repo +
   registered store + reference → instructions index → run the printed
   fetch verbatim → design artifact in app root cites the store spec →
   validate/status; store untouched).
5. Full suite; built-binary smoke of the UX example.

## Test Plan

```bash
pnpm test -- test/core/references.test.ts test/core/project-config.test.ts
pnpm test -- test/core/artifact-graph test/commands/artifact-workflow.test.ts
pnpm run build && pnpm test -- test/cli-e2e/
pnpm test   # full, per checkpoint
```

## Risks And Guardrails

- **Resolution fork risk**: the refactor must leave exactly one
  metadata→health inspection path. The existing error contract (codes,
  messages) must stay byte-identical — the nets are
  `test/core/root-selection.test.ts` (pins all six resolver codes with
  message substrings) and `test/commands/store-root-selection.test.ts`
  (CLI layer).
- **Sync/async boundary**: `generateInstructions` stays sync; the index
  is assembled in the command layer and passed in. Direct library
  callers of `generateInstructions` (tests) keep working with the param
  omitted.
- **Performance**: one registry read per command invocation (not per
  reference); spec enumeration only for healthy resolved stores;
  first-line extraction reads each spec file once. No caching in 3.1.
- **JSON additivity**: `references` omitted when undeclared, so
  existing consumers see byte-identical output — pin with a
  no-references snapshot assertion.
- **Vocabulary/error bars**: every fix string pasteable (`--id <id>`,
  `openspec store doctor <id>`); absolute `root` paths; "referenced
  store(s)" as the only noun.
- **50KB budget mechanics**: measure on the rendered human block (the
  larger of the two renderings) so one budget covers both surfaces;
  truncation must keep valid structure (no half entries).

## Done Definition

- All spec acceptance scenarios pass; both checkpoints green on the
  full suite and committed.
- The e2e layered flow proves the PM-to-dev journey against the built
  binary, including the verbatim fetch.
- Roadmap 3.1 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to 3.2.
