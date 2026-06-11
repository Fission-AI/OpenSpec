# Relationship Health Spec (3.6)

## Outcome

One read-only question, one place: are the roots this work relates to —
the OpenSpec root itself, the stores it references, and the target
repos it names — actually available on this machine? `openspec doctor`
answers for the resolved root, separating root health, reference
health, and target health, reusing the exact diagnostics every Phase 3
slice already produces. Missing repo mappings and unresolvable
references become easy to see; nothing clones, pulls, pushes, syncs,
branches, or repairs.

## Locked Decisions (roadmap)

1. **Diagnostic only.** No clone/sync/branch/worktree behavior, no
   repairs. (The slices' standing read-only line.)
2. **The report separates** OpenSpec root health, store metadata
   health, reference health, and target checkout health.
3. **Deferred roll-ups land here** (each recorded in its slice):
   3.2's pointer wrong turns, 3.3's canonical-vs-observed remote
   divergence note, 3.5's unmapped targets and corrupt-registry
   silence.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **The surface is a new top-level `openspec doctor`** (root-scoped),
   chosen over extending `store doctor` (machine-scoped, store-centric
   — it cannot see a project repo's references at all) or `status`
   (change-scoped). The roadmap's own framing is "doctor or status
   output"; root-scoped doctor is the only shape that answers "the
   roots THIS WORK relates to". It resolves the root exactly like
   every normal command (explicit `--store` → nearest → declared
   pointer; `allowImplicitRoot: false` — doctor inspects what exists,
   it never scaffolds), prints the banner, and carries the JSON `root`
   block.
2. **No new health machinery — presentation of existing diagnostics.**
   References health IS `assembleReferenceIndex`'s entries (the 3.1
   warning codes verbatim). Targets health IS `assembleTargets` (store
   level only — doctor is root-scoped, not change-scoped; per-change
   narrowing stays on the instructions surface) plus the repo map.
   Root health reuses `inspectOpenSpecRoot` and, for store-backed
   roots, the store metadata facts doctor already knows how to read.
3. **Every recorded deferral lands.** In doctor output (and ONLY
   here): an unmapped declared target gets a `target_unmapped` warning
   with the pasteable fix (`openspec repo register <path> --id <id>`)
   — SUPPRESSED when the registry is unreadable (the register fix
   would be wrong; the top-level entry names the real problem); an
   unreadable registry gets `relationship_registry_unreadable`
   (warning, fix: `openspec store doctor`) at top level WHILE the
   per-reference `reference_registry_unreadable` entries remain (the
   top level names the cause, the entries show the blast radius —
   recorded duplication); a both-shapes root (3.2) surfaces as a
   structured top-level entry, detected by the COMMAND via
   `classifyOpenSpecDir(root.path)` when `source === 'nearest'` and
   passed into the pure inspector (the resolver's stderr warning still
   prints — accepted duplication: stderr is transient runtime
   diagnostics, doctor is the report); the 3.4-recorded inert-pointer
   wrong turn surfaces as `pointer_declarations_inert` (warning, top
   level) when `source === 'declared'` and the pointer directory's own
   config declares references/targets — the command re-reads the
   START-PATH config to detect it; canonical-vs-observed remote
   divergence on a store-backed root gets `store_remote_divergence`
   (severity `info` — divergence is often benign fork workflow),
   living in the STORE section. Instructions output stays
   byte-identical — doctor is where you ASK about health.
4. **JSON shape — the lock's four categories, separated**:
   `{root: {path, source, store_id?, healthy, status: []},
   store: {id, metadata: {present, valid, remote?}, origin_url?,
   status: []} | null,
   references: [{store_id, root?, status: []}],
   targets: [{id, remote?, path?, status: []}],
   status: []}` — `store` is null for non-store-backed roots and
   carries the metadata facts + `store_remote_divergence` for
   `--store` AND declared roots; reference entries are the 3.1 index
   entries minus `specs`/`fetch`, produced by a NEW
   `includeSpecs: false` assembler mode that skips the spec-file reads
   AND the byte budget (post-stripping would pay the I/O and could
   leak the content-only `reference_index_truncated` into a health
   report — pinned never to appear here); a grammar-invalid declared
   target synthesizes a bare `{id, status: [target_invalid_id]}` entry
   (the assembler excludes such ids from repos — doctor must not lose
   them); the top-level `status` carries cross-cutting diagnostics
   (registry unreadable, both-shapes, pointer-inert). The assembler
   gains an optional pre-read registry-state input so doctor's ONE
   read feeds references, targets, and the unreadable signal
   coherently (instructions keeps its current internal read). EXIT
   CODE mirrors `store doctor` exactly: health findings of ANY
   severity exit 0 (agents read `status`); only command failures (no
   root, unknown store, `store_id_is_repo`, corrupt registry at
   resolution, and — implementation amendment — corrupt/missing
   store.yaml on a store-backed root, which store resolution rejects
   before doctor runs; forking a doctor-only resolution path would
   break the one-resolver invariant, so the store section's
   metadata facts are always-valid for resolvable roots) exit 1 via
   the normal failure path with
   `{root: null, store: null, references: [], targets: [],
   status: [diagnostic]}`. (The spec draft claimed errors exit 1
   "matching store doctor" — store doctor in fact exits 0 on
   error-severity health entries; this spec mirrors the REAL
   contract, recorded.)
5. **Human output** mirrors `store doctor`'s voice: one section per
   concern, `ok`/counts on the happy path, `- message` + `Fix:` lines
   for problems. Empty sections render as "(none declared)" — the
   difference between "no references" and "all references broken" must
   be visible at a glance.

## User Experience

```text
$ openspec doctor
Doctor

Root
  Location: /Users/dev/src/team-context
  OpenSpec root: ok
  Store: team-context (metadata ok)

References
  - upstream-context: ok (/Users/dev/openspec/upstream-context)
  - design-system: not registered on this machine
    Fix: git clone https://github.com/acme/design-system.git /Users/dev/openspec/design-system && openspec store register /Users/dev/openspec/design-system --id design-system

Targets
  - api-server: mapped (/Users/dev/src/api-server)
  - web-app: not mapped on this machine
    Fix: openspec repo register <path> --id web-app
```

An agent asks the same question in JSON and gets the diagnostics
envelope it already knows:

```json
{
  "root": { "path": "...", "source": "store", "store_id": "team-context", "healthy": true, "status": [] },
  "store": { "id": "team-context", "metadata": { "present": true, "valid": true }, "status": [] },
  "references": [
    { "store_id": "upstream-context", "root": "/Users/dev/openspec/upstream-context", "status": [] },
    { "store_id": "design-system", "status": [{ "severity": "warning", "code": "reference_unresolved", ... }] }
  ],
  "targets": [
    { "id": "api-server", "path": "/Users/dev/src/api-server", "status": [] },
    { "id": "web-app", "status": [{ "severity": "warning", "code": "target_unmapped", ... }] }
  ],
  "status": []
}
```

## Scope

In scope:

- **Core** (`src/core/relationship-health.ts`): `inspectRelationships
  ({root, projectConfig, repoPaths, registryUnreadable})` — pure
  composition over the existing assemblers' outputs into the JSON
  shape above; the four new/relocated diagnostic entries
  (`target_unmapped`, `relationship_registry_unreadable`, the
  both-shapes structured entry, `store_remote_divergence`).
- **Command** (`src/commands/doctor.ts`): root resolution (normal
  precedence, no implicit scaffold), one config read, one registry
  read, the reference index (without spec content — pass a flag or
  strip), the store-metadata/remote facts for store-backed roots
  (reusing 3.3's metadata read + `gitOriginUrl` probe), JSON + human
  output, exit-code rule mirroring `store doctor`; CLI + completions
  registration (friction pins updated).
- **Docs**: `docs/cli.md` — doctor section + summary table row; one
  sentence in the references/targets/repo-map sections pointing at
  doctor for health.
- **Tests**: unit (the composition shapes; each diagnostic's
  presence/severity/fix; empty-vs-broken separation; the synthesized
  invalid-target entry; unmapped suppression under unreadable
  registry), surface e2e (healthy root all-ok; none-declared
  rendering; unresolved reference with the 3.3 clone fix passing
  through under an EMPTY registry vs `reference_registry_unreadable`
  under a CORRUPT one; unmapped target with the register fix;
  both-shapes root; pointer-inert declarations; store-backed root via
  `--store` and via a pointer with the store section populated;
  remote divergence info; `doctor --store <repo-id>` →
  `store_id_is_repo` exit 1 with the null-shape payload; no-root exit
  1; instructions/list/status byte-identity — scoped to COMMAND
  outputs: `STORE_SELECTION_GUIDANCE` gains doctor (it takes
  `--store`), so the generated skill templates change deliberately
  with their parity pins updated).

Out of scope:

- Any repair/clone/sync behavior; any write.
- Per-change narrowing health (instructions owns the change-scoped
  view); spec-content fetching (the index's `specs`/`fetch` stay on
  instructions).
- Extending `store doctor` (machine-scoped stays as is); 4.1's
  assembled working set (it will CONSUME `inspectRelationships`).
- Watch modes, exit-code knobs, severity filtering.

## Acceptance Criteria

### One Question, One Place

#### Scenario: A Healthy Root Reports Ok Everywhere

- **GIVEN** a store-backed root with one resolvable reference and one
  mapped target
- **WHEN** `openspec doctor` runs (human and `--json`; via `--store`,
  nearest root, and a declared pointer)
- **THEN** all four sections report ok with the resolved paths, the
  JSON shape matches decision 4 exactly, and exit code is 0

#### Scenario: Nothing Declared Is Not A Failure

- **GIVEN** a healthy root with no references, no targets, and no
  store backing
- **WHEN** doctor runs
- **THEN** sections render "(none declared)" / empty arrays /
  `store: null` — distinguishable from failures at a glance — and exit
  code is 0

#### Scenario: Broken Relationships Are Easy To See

- **GIVEN** an unresolvable reference (with a declared remote) and an
  unmapped target
- **WHEN** doctor runs
- **THEN** the reference entry carries `reference_unresolved` with the
  3.3 verbatim clone fix, and the target entry carries
  `target_unmapped` with the register fix
- **AND** exit code is 0 (health findings of any severity exit 0;
  only command failures exit 1)
- **AND** an unhealthy referenced store root
  (`reference_root_unhealthy`) and an invalid reference id surface
  exactly as the 3.1 assembler emits them
- **AND** a grammar-invalid declared target appears as a synthesized
  bare entry carrying `target_invalid_id`
- **AND** `reference_index_truncated` can never appear (health mode
  skips content and its budget)

### The Deferred Roll-Ups Land

#### Scenario: Pointer And Registry Wrong Turns Surface Structurally

- **GIVEN** a real root whose config also declares a `store:` pointer
- **WHEN** doctor runs
- **THEN** the top-level `status` carries the both-shapes warning as a
  structured entry (code, message, fix) — not just stderr prose
- **AND** with an unreadable registry, `relationship_registry_unreadable`
  appears at top level with the `store doctor` fix, per-reference
  entries keep `reference_registry_unreadable` (cause + blast radius,
  recorded duplication), and target entries stay BARE — no
  `target_unmapped` whose register fix would be wrong
- **AND** the inert-pointer case: doctor run in a pointer repo whose
  own config also declares references/targets reports
  `pointer_declarations_inert` at top level while the health sections
  reflect the RESOLVED store's declarations

#### Scenario: Remote Divergence Is An Info Note

- **GIVEN** a store-backed root whose `store.yaml` remote differs from
  the checkout's observed origin
- **WHEN** doctor runs
- **THEN** `store_remote_divergence` appears with severity `info`,
  naming both URLs
- **AND** matching or absent remotes produce no entry

### Nothing Moves

#### Scenario: Doctor Is Read-Only And Changes Nothing Elsewhere

- **GIVEN** any of the above fixtures
- **WHEN** doctor runs and then instructions/list/status run
- **THEN** doctor performed no writes (tree byte-identical) and the
  other commands' outputs are byte-identical to a world where doctor
  was never invoked
- **AND** root resolution failures (no root anywhere) fail with the
  existing taxonomy, not a doctor-specific error
