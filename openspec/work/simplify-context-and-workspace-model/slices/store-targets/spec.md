# Store Targets Spec (3.4)

## Outcome

A planning repo says, once, which code repos its work is about. The
store's config declares target repo ids; a change can narrow that set
as ordinary metadata; and instructions output carries the effective
targets so agents know which repos the work concerns. Targets are
declarations agents read — never machinery: no clone, sync, branch,
worktree, or edit-boundary enforcement, and they never affect where
commands act.

## Locked Decisions (roadmap)

1. **Store-level defaults are the primary shape; per-change narrowing
   is the exception**, expressed as ordinary metadata — no managed link
   objects, no status coupling (Rules We Should Not Forget).
2. **One id namespace.** The kebab id grammar applies to every id kind
   before any `targets:` list is committed. (The typed registry
   sections and `--store`-rejects-repo-ids hint are 3.5, when repo ids
   first become resolvable.)
3. **No machinery.** "Do not imply automatic clone, sync, branch,
   worktree, or edit-boundary enforcement" (roadmap 3.4).
4. **3.3 standing constraint:** target declarations do NOT go into
   `store.yaml` (any new field there is a cross-version protocol
   change under the strict schema). The root's `openspec/config.yaml`
   is the home — the same file that owns `references:` and `store:`.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **`targets:` lives in the root's `openspec/config.yaml`** and uses
   the exact `references:` entry shape: id strings or `{id, remote?}`
   maps, parsed by ONE shared declaration-list parser (the 3.1/3.3
   references parser generalizes; both fields get identical
   normalization, dedup-by-id, fill-if-absent remote semantics, and
   split warnings). The optional remote records where the target repo
   can be cloned from — the same onboarding courtesy as 3.3, consumed
   by 3.5/3.6; 3.4 only records and displays it.
2. **Per-change narrowing is `targets:` in `.openspec.yaml`** — a plain
   string array in the existing non-strict `ChangeMetadataSchema`
   (additive: old CLIs ignore it; "ordinary metadata" exactly as the
   lock requires). Narrowing REPLACES the store list for that change;
   an EMPTY array is treated as undeclared (the store list applies —
   narrowing to nothing is not a supported state, matching the config
   parser's only-set-when-non-empty behavior). Ids must pass the kebab
   grammar, validated with the file's existing `KebabIdentifierSchema`
   (schema.ts:3-11; `affected_areas` carries no grammar and is not the
   precedent). A grammar-invalid change-level id fails metadata reads
   EVERYWHERE (show, validate, archive, instructions) like any other
   metadata error — a deliberate severity cliff this spec owns. An id
   outside the store's declared set is legal but flagged (decision 4)
   — the store list is the vocabulary, not a cage. A narrowed id
   inherits the store declaration's remote when one exists (the remote
   is a property of the repo declaration, not of the provenance).
3. **The display surface is instructions output** (the working-context
   surface agents already read; 4.1 consumes this). Both instruction
   surfaces in both modes gain the effective targets: JSON
   `targets: {source: "store" | "change", repos: [{id, remote?}],
   status: [...]}` — `status` always present (`[]` when clean) so JSON
   consumers see the degradation diagnostics, matching the 3.1
   per-entry pattern; the whole field omitted when neither level
   declares any. Diagnostic envelopes use `target: 'targets'`. Human
   blocks render a `<target_repos>` XML block / `### Target Repos`
   section listing ids (with remotes when declared) and one provenance
   line ("Declared by the store config." / "Narrowed by this
   change."). The block is a hand-written declaration list — no byte
   budget (unlike the references index, which carries file-derived
   content). No new commands — "OpenSpec can list the target repo ids"
   via the surface agents and humans already use.
4. **Degradation over enforcement.** A change-level target id missing
   from the store's declared set adds a `target_not_declared` warning
   entry (message + fix naming the store config and the change's
   metadata file) to BOTH the rendered block and the JSON `status`;
   instructions still generate. Grammar-invalid ids in the CONFIG list
   degrade to `target_invalid_id` warning entries (same two-layer
   split as references: the shared parser's field-level
   `console.warn`s fire for malformed entry SHAPES on every config
   read, while id-grammar problems surface as instruction-time
   diagnostics). Change-level grammar validation is zod-side (the
   metadata file is the change's own document; a bad id there is a
   validation error like any other metadata problem — see decision 2's
   severity cliff). The config-side grammar check uses one neutrally
   named kebab predicate shared with the references call site (the
   codebase has two identical regexes under store-flavored names;
   the one-namespace lock gets one source of truth).
5. **Targets never resolve.** 3.4 records and displays; nothing maps a
   target id to a path (3.5), nothing reports cross-machine health
   (3.6), and target ids are not accepted by `--store` (today they
   fail as unknown stores; the typed hint lands with 3.5's registry
   sections).

## User Experience

The store author declares once:

```yaml
# team-context/openspec/config.yaml
schema: spec-driven
targets:
  - api-server
  - { id: web-app, remote: "git@github.com:acme/web-app.git" }
```

Every change in the store inherits the defaults; instructions show
them:

```text
<target_repos>
<!-- The code repos this work is about. Declarations, not machinery. -->
Declared by the store config.
  - api-server
  - web-app (clone: git@github.com:acme/web-app.git)
</target_repos>
```

A change that only touches the API narrows in its own metadata:

```yaml
# openspec/changes/billing-rework/.openspec.yaml
schema: spec-driven
targets:
  - api-server
```

…and its instructions say so:

```text
<target_repos>
<!-- The code repos this work is about. Declarations, not machinery. -->
Narrowed by this change.
  - api-server
</target_repos>
```

An unrecognized narrowing (valid grammar, undeclared id) degrades
loudly instead of failing:

```text
  - api-sever
  Note: 'api-sever' is not in the store's declared targets.
  Fix: Add it to targets in <abs path>/openspec/config.yaml, or correct the change's .openspec.yaml.
```

## Scope

In scope:

- **Config**: generalize the references entry parser into one shared
  declaration-list parser (`parseDeclarationList(raw, fieldName)` in
  `project-config.ts`); `targets?: ReferenceDeclaration[]` on
  `ProjectConfig` (the declaration type is shared; consider renaming
  the type to `StoreDeclaration`/`RepoDeclaration` only if cheap —
  otherwise keep and note).
- **Change metadata**: `targets: z.array(kebab-validated string).optional()`
  in `ChangeMetadataSchema` (`src/core/change-metadata/schema.ts:22`);
  flows through the existing read path (`change-metadata.ts`).
- **Effective-targets assembly**: a small pure module
  (`src/core/targets.ts`) — `assembleTargets({storeTargets,
  changeTargets})` returning `{source, repos, status}` with the two
  warning codes; renderers for the XML block and markdown section
  (mirroring `references.ts` shapes, without any registry/fs I/O —
  targets resolve nothing in 3.4).
- **Instructions wiring**: both surfaces (artifact + apply), both
  modes, via the existing `loadConfigAndReferences` read (one config
  read still; it already returns the parsed config). The ARTIFACT path
  has the change metadata in hand (`loadChangeContext` before the
  config read); the APPLY path loads change context INSIDE
  `generateApplyInstructions` (instructions.ts:337), so the command
  passes the store-level targets in via the existing options bag and
  the assembly runs inside, where `context.metadata?.targets` is
  available. JSON field `targets` omitted when no level declares.
- **Docs**: `docs/cli.md` — a "Declaring target repos" subsection next
  to the references one, including one sentence separating `targets`
  (repo ids the work is about) from `affected_areas` (free-form areas
  within them) so agents do not populate the two interchangeably.
- **Tests**: shared-parser unit coverage (both fields, both shapes,
  dedup, warnings — and references regression pins stay green
  untouched); targets assembly unit tests (store-only, narrowed,
  narrowed-outside-vocabulary, invalid config ids, neither-level);
  surface tests (JSON shape incl. omitted-when-none; human blocks in
  both modes; provenance lines); change-metadata zod validation
  (grammar-invalid change target rejected); an APPLY-surface test
  where `.openspec.yaml` narrows (JSON + human — the surface with the
  indirect metadata flow); an e2e PM-to-dev flow (store with targets
  → change narrows → instructions show effective set with
  provenance; `--store` and declared-root flows included, asserting
  the RESOLVED root's config is the source when the cwd config
  differs).

Out of scope:

- Resolving target ids to local paths (3.5: registry `repos:` section,
  cross-section uniqueness, the `--store` typed hint), relationship
  health (3.6), assembled context (4.1).
- `targets:` written in a POINTER repo's own config is silently inert
  (the resolved store's config is what instructions read, per 3.2 —
  same as references today; 3.6 owns surfacing that wrong turn).
- Any write/enforcement behavior keyed on targets; per-change
  EXPANSION semantics beyond the warning (the store list is the
  vocabulary; the warning is the only feedback).
- Validate-command surfacing of target warnings (instructions is the
  3.4 surface; 3.6 owns the health roll-up).

## Acceptance Criteria

### Declarations Are Recorded And Displayed

#### Scenario: Store-Level Targets Reach Instructions

- **GIVEN** a store config declaring `targets:` (mixed string and map
  entries)
- **WHEN** instructions run for any change in that store (both
  surfaces, both modes; explicit `--store`, nearest-root, AND
  declared-root/pointer sessions — the resolved store's config is the
  source in all three)
- **THEN** JSON carries
  `targets: {source: "store", repos: [{id}, {id, remote}]}` in
  declaration order, deduped
- **AND** human output renders the `<target_repos>` block / `### Target
  Repos` section with the provenance line and clone notes for
  remote-bearing entries
- **AND** a root with no `targets:` anywhere omits the JSON field and
  renders no block

#### Scenario: The Shared Parser Treats Both Fields Identically

- **GIVEN** a config with equivalent malformed entries in `references:`
  and `targets:` (non-string entries, map without id, non-string
  remote, duplicates)
- **WHEN** the config is read
- **THEN** both fields normalize identically (dedup by id, first
  remote fills, never overrides) with the same split warnings, and all
  3.1/3.3 references behavior is byte-identical to before this slice

### Narrowing Is Ordinary Metadata

#### Scenario: A Change Narrows Its Targets

- **GIVEN** a store declaring `[api-server, web-app]` and a change
  whose `.openspec.yaml` declares `targets: [api-server]`
- **WHEN** instructions run for that change
- **THEN** the effective set is `[api-server]` with
  `source: "change"` and the "Narrowed by this change." provenance
- **AND** a narrowed id whose store declaration carries a remote keeps
  that remote in the effective entry
- **AND** a change-level `targets: []` behaves as undeclared (store
  set, `source: "store"`)
- **AND** a narrowed set equal to the store set still reports
  `source: "change"` (provenance reflects where the list came from)
- **AND** other changes in the store still show the full store set
- **AND** archive/validate/show treat the metadata as ordinary content
  (no behavior change)

#### Scenario: Narrowing Outside The Vocabulary Warns

- **GIVEN** a change narrowing to an id absent from the store's list
- **WHEN** instructions run
- **THEN** the id still appears in the effective set
- **AND** a `target_not_declared` warning entry renders in the human
  block AND appears in the JSON `status` array, with a fix naming the
  store config path and the change metadata file
- **AND** instructions still generate (exit 0)

#### Scenario: Bad Ids Fail Where They Live

- **GIVEN** a config-level target with invalid kebab grammar and,
  separately, a change-level `targets` entry with invalid grammar
- **WHEN** the config is read / the change metadata is validated
- **THEN** the config-level id degrades to a `target_invalid_id`
  warning entry in the rendered block
- **AND** the change-level id fails metadata validation with a zod
  message naming the field

### Nothing Moves

#### Scenario: Targets Are Inert Declarations

- **GIVEN** any well-formed declared targets
- **WHEN** new change, validate, archive, list, show, and root
  resolution run
- **THEN** their outputs are byte-identical to a targets-less config
  (instructions is the only changed surface)
- **AND** `--store <target-repo-id>` fails exactly as any unknown
  store id does today
