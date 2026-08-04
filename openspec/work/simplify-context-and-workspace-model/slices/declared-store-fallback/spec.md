# Declared Store Fallback Spec (3.2)

## Outcome

A repo whose planning is fully externalized — no local OpenSpec root —
declares its store once, and every normal command works there without
`--store` on every invocation. The declaration is a fallback, never an
override: with any local root present, behavior is byte-identical to
today, declaration or not. The fixed precedence is finally complete:
explicit `--store` → nearest local root → declared store (only when no
local root exists) → today's error with the stores hint.

## Locked Decisions (roadmap, 2026-06-11)

1. **The declaration lives in `openspec/config.yaml`** — the fallback
   `store:` pointer shares one home with `references:`. The fallback
   case is a **config-only `openspec/` directory** (no `specs/`, no
   `changes/`): root detection keeps today's stat-only walk, and two
   extra stats distinguish a real root from a pointer. A top-level
   marker file was rejected (`.openspec.yaml` is taken; dot-only
   filename collisions are an agent hazard).
2. **Fallback, never override.** A declared store never overrides a
   local root. With a local root present, behavior is byte-identical
   with or without the declaration.
3. **A root with both planning shape and a pointer warns** (the pointer
   is ignored per precedence). The locked wording said "doctor warns";
   no project-level doctor command exists, so this slice relocates the
   warning to resolution stderr — recorded as a reviewed amendment in
   the roadmap changelog; 3.6 owns the structured health surface.
4. **The no-root error/hint from slice 1.2 remains** for repos with no
   declaration.
5. Without a local root, commands resolve to the declared store and
   report it **through the existing root banner and JSON root block**.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **Detection mechanics.** The walk is unchanged: nearest ancestor
   carrying `openspec/` wins and terminates the walk. On that one
   directory, two stats (`openspec/specs`, `openspec/changes`, each
   required to be a **directory**) classify it: either present → a
   real root, today's `nearest` path, byte-identical. Both absent
   (config-only) → a **warning-silent targeted read** of the config
   (parse for the `store:` key only — never re-emitting the resilient
   parser's field warnings during resolution); a `store:` key makes it
   a pointer and resolution proceeds through the shared store pipeline;
   **no `store:` key → today's behavior is preserved** (the config-only
   directory is still a root — freshly initialized minimal roots keep
   working). The walk never continues past the nearest `openspec/`
   directory; nesting a pointer under a real root is pathological and
   out of scope.
2. **A malformed pointer is an error, never a silent local root.** In a
   config-only directory, a present-but-malformed `store:` value
   (non-string, invalid id grammar) or an unparseable config file fails
   resolution with an origin-naming error (`invalid_store_pointer` for
   the malformed/unparseable cases; the grammar case flows into the
   pipeline's `invalid_store_id`) — it must not degrade into scaffolding
   work next to the pointer. (This deliberately differs from 3.1's
   drop-with-warning references parsing: a dropped reference degrades
   an index; a dropped pointer would silently flip the write target.)
3. **A declared root behaves exactly like a `--store` root except for
   its `source` — enforced by one predicate.** "Store-selected" means
   `root.storeId` is set; every consumer currently keyed on
   `source === 'store'` switches to that predicate: the banner and
   `withStoreFlag` (`root-selection.ts:339,349`), new-change's absolute
   path display (`new-change.ts:77`), status's `storeId` threading
   (`status.ts:106`), validate/show noun-form suggestion suppression —
   both show branches, including `printNonInteractiveHint`
   (`validate.ts:136`, `show.ts:138`, `show.ts:160` — the eighth check,
   found in plan review), and archive's absolute cross-root display
   paths (`archive.ts:446`).
   Resolution runs the same `resolveStoreRoot` pipeline via an optional
   `declaredOrigin` parameter; errors keep their codes and gain a true
   prefix: "Declared in <abs path to the actual config file read>: " +
   the existing message. The JSON root block carries
   `source: "declared"` (additive enum value) plus `store_id`; hint
   continuity appends `--store <id>` exactly as for explicit selection
   (pasted hints work from any cwd). Explicit `--store` always wins and
   never consults the pointer.
4. **Pointer resolution is one hop.** A resolved store's own `store:`
   key is never consulted — no chaining, no recursion (a pointer chain
   target that is itself config-only simply fails health as
   `unhealthy_store_root`).
5. **The both-shapes warning lives in resolution, on stderr** (the
   recorded amendment of the locked "doctor" wording). When the nearest
   root has planning shape AND a `store:` pointer, commands emit
   exactly one stderr warning per invocation — "Warning: <absolute
   config path> declares store 'x', but this directory is a real
   OpenSpec root; the declaration is ignored." (implementation
   amendment: the absolute path replaces the spec draft's relative
   `openspec/config.yaml`, per the absolute-paths quality bar) — in
   both human and JSON modes (stderr keeps stdout payloads clean).
   `references:` in the same config keeps working; only the `store:`
   pointer is ignored.
6. **The pointer directory is never scaffolded by normal commands; only
   `openspec init` may convert it, deliberately.** No lifecycle command
   creates `specs/` or `changes/` inside a config-only pointer
   directory; work lands in the declared store's root. `openspec init`
   run in a pointer repo **refuses** with an actionable error ("this
   repo's planning is externalized to store 'x' (openspec/config.yaml);
   remove the store: line first to convert it to a local root") instead
   of silently scaffolding a both-shapes directory.

## User Experience

A team keeps all planning in `team-context`. Their app repo carries
only a pointer:

```yaml
# app-repo/openspec/config.yaml
store: team-context
```

Every normal command just works there, no flag:

```text
$ openspec new change billing-rework
Using OpenSpec root: team-context (/Users/dev/src/team-context)
Created change 'billing-rework' at /Users/dev/src/team-context/openspec/changes/billing-rework/
...
$ openspec status --change billing-rework --json
{ ..., "root": { "path": "/Users/dev/src/team-context",
                 "source": "declared", "store_id": "team-context" } }
```

(Note the absolute path: a declared root is cross-root, exactly like
`--store`, so every displayed path is absolute.)

The pointer never hijacks a real root: in a repo that has its own
`openspec/specs/`, the same `store:` line changes nothing except one
stderr warning that it is being ignored. And a teammate without the
store registered gets the full store-error treatment, told exactly
where the requirement came from:

```text
Error: Declared in /Users/dev/src/app-repo/openspec/config.yaml: Unknown store
'team-context'. No stores are registered. Run openspec store setup team-context
or openspec store register <path> first.
```

## Scope

In scope:

- **Config**: `store:` (optional string) in `ProjectConfigSchema` and
  the resilient parser (`src/core/project-config.ts`).
- **Resolver**: in `resolveOpenSpecRoot`
  (`src/core/root-selection.ts:275-313`), after
  `findRepoPlanningRootSync` returns a directory: the two
  directory-shape stats; the pointer branch (warning-silent targeted
  config read, malformed-pointer errors, resolve via the existing
  `resolveStoreRoot` with the `declaredOrigin` prefix); `source:
  'declared'` added to `OpenSpecRootSource` and `RootOutput`; the
  store-selected predicate (`storeId` set) adopted by all seven
  source-keyed consumers (decision 3's list); the both-shapes stderr
  warning.
- **Init guard**: `openspec init` refuses to scaffold a config-only
  pointer directory (decision 6), with its own test.
- **Docs**: extend the `docs/cli.md` "Referencing stores from a
  project" area with a sibling "Declaring a default store" subsection;
  add the `store:` bullet to the config keys covered there.
- **Tests**: resolver unit coverage (pointer resolves; pointer +
  explicit `--store` precedence; pointer ignored with planning shape +
  warning; config-only without pointer unchanged; pointer to
  unknown/unhealthy store errors with origin prefix; invalid pointer id
  grammar); byte-identity pin (real root with and without `store:` —
  identical stdout); an e2e externalized-planning journey (rootless app
  repo with pointer → `new change`, `status`, `instructions`, artifact
  writes, `validate`, `archive`, all without `--store`; work lands in
  the store; the pointer dir gains no `specs/`/`changes/`; banner and
  JSON root block report `declared`).

Out of scope:

- References behavior (3.1, shipped) beyond the natural composition:
  the declared root's `references:` work exactly as for any resolved
  root.
- Remotes (3.3), the structured health surface (3.6), assembly (4.1).
- Any change to explicit `--store` behavior, the stores-hint error, or
  the implicit-root scaffold for directories without `openspec/`.
- Multi-store pointers, per-command pointer overrides, or pointer
  inheritance across the walk.

## Acceptance Criteria

### The Fallback Resolves

#### Scenario: Externalized Planning Without Flags

- **GIVEN** a repo whose `openspec/` contains only `config.yaml` with
  `store: team-context`, and `team-context` registered and healthy
- **WHEN** `new change`, `status`, `instructions`, `validate`, `list`,
  `show`, and `archive` run there without `--store`
- **THEN** every command acts on the store's root
- **AND** the banner prints `Using OpenSpec root: team-context (…)`
- **AND** JSON output's root block is
  `{path: <store root>, source: "declared", store_id: "team-context"}`
- **AND** printed hints carry `--store team-context`
- **AND** the pointer directory never gains `specs/` or `changes/`

#### Scenario: Explicit --store Still Wins

- **GIVEN** the pointer declares `team-context`
- **WHEN** a command runs with `--store other-context`
- **THEN** it resolves `other-context` with `source: "store"`, the
  pointer never consulted

### The Fallback Never Overrides

#### Scenario: Local Root Byte-Identity

- **GIVEN** a repo with a real root (`openspec/specs/` or
  `openspec/changes/` present)
- **WHEN** any command runs with and without a `store:` line in its
  config
- **THEN** stdout is byte-identical in both runs (source stays
  `nearest`)
- **AND** the runs with the pointer emit exactly one stderr warning per
  invocation naming the ignored declaration, in human and JSON modes
  alike, with JSON stdout payloads staying clean

#### Scenario: Config-Only Roots Without Pointers Are Unchanged

- **GIVEN** a config-only `openspec/` directory whose config has no
  `store:` key
- **WHEN** commands run there
- **THEN** behavior is byte-identical to today (the directory is still
  the root)

### Failures Stay Actionable

#### Scenario: Pointer To An Unavailable Store

- **GIVEN** a pointer to an id that is unregistered, unhealthy, or
  grammatically invalid
- **WHEN** a command runs
- **THEN** the existing store-error taxonomy fires (`unknown_store`,
  `no_registered_stores`, `unhealthy_store_root`,
  `store_identity_mismatch`, `invalid_store_id`) with the message
  prefixed "Declared in <absolute path to the config file actually
  read>: "
- **AND** the fix text is pasteable and unchanged in meaning
- **AND** a non-string `store:` value or an unparseable config in a
  config-only directory fails with `invalid_store_pointer` naming the
  origin — never a silent fall-through to local-root behavior, never a
  write next to the pointer
- **AND** a pointer whose target store's own config carries `store:`
  resolves to that target (one hop, no chaining)

#### Scenario: Init Refuses To Bury A Pointer

- **GIVEN** a config-only pointer directory
- **WHEN** the user runs `openspec init`
- **THEN** init fails with the conversion guidance (remove the
  `store:` line first) and creates nothing
- **AND** after the user removes the line and reruns, init scaffolds a
  normal local root

#### Scenario: No Pointer, No Root — Nothing Changed

- **GIVEN** a directory with no `openspec/` anywhere up the walk
- **WHEN** a command runs with registered stores present
- **THEN** the slice 1.2 stores-hint error appears, byte-identical to
  today

### The Composition Holds

#### Scenario: Declared Root With References

- **GIVEN** the declared store's own config carries `references:`
- **WHEN** `instructions` runs in the pointer repo
- **THEN** the index reflects the store's references (3.1 symmetric
  behavior through the declared root)
