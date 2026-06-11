# Repo Map Spec (3.5)

## Outcome

Shared work names target repos by id; each developer tells OpenSpec
once where those repos live on this machine. The machine-local registry
becomes one file with typed sections — `stores:` and `repos:` — with
cross-section id uniqueness enforced at write time. Given a target repo
id, OpenSpec resolves the local checkout path (the instructions targets
block shows it), and every wrong turn fails clearly: missing mappings
are visible, duplicate ids conflict with a fix, and `--store` with a
repo id rejects with a typed hint instead of a generic unknown-store
error. The map is local settings, never shared planning state.

## Locked Decisions (roadmap)

1. **One id namespace, typed sections.** The machine-local registry is
   one file with `stores:` and `repos:` sections; cross-section id
   uniqueness is enforced at write time; the kebab grammar applies to
   every id kind. `--store` never resolves a target-repo id — it
   rejects with a typed hint.
2. **The map is local.** Local machine settings, not shared planning
   state; nothing about it is committed to any repo.
3. **Failures are clear.** Missing, duplicate, or invalid mappings fail
   with actionable messages.
4. **No machinery.** Mapping a repo never clones, syncs, or enforces
   edit boundaries (3.4's lock carries forward).

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **A minimal `repo` command group: `register`, `unregister`, `list`.**
   Mirrors the store group's local-settings verbs and nothing else — no
   `setup` (OpenSpec never creates code repos), no `doctor` (3.6 owns
   relationship health), no `remove` (OpenSpec never deletes code
   repos). `openspec repo register <path> [--id <id>]` records an
   existing directory (id defaults to the folder name, kebab-validated;
   the path must exist and be a directory — no healthy-OpenSpec-root
   requirement, code repos are not stores); `unregister <id>` forgets
   the mapping (never touches disk); `list` shows id → path (JSON +
   human). Re-registration semantics mirror stores: same id + same path
   → no-op (`already_registered: true`); same id + different path →
   conflict error with the unregister fix.
2. **The registry schema gains an optional `repos:` section** —
   `{<id>: {local_path}}`, strict entries, canonical stored paths (the
   stores-section conventions). Absent section ≡ empty. The schema
   stays strict; a pre-3.5 CLI rejects a repos-bearing registry — the
   registry is machine-local (written and read by the same
   installation), so the one-way story is acceptable and recorded.
   CRITICAL: every state-rebuild site preserves the other section —
   `parseStoreRegistryState`, `serializeStoreRegistryState`,
   `withRegisteredStore`, and `withoutRegisteredStore` all reconstruct
   `{version, stores}` today and would silently erase `repos:`; the
   round-trip is a pinned scenario, not an assumption. Uniqueness is
   enforced in the shared write path BOTH ways, for ids AND paths (one
   checkout has one role): writing a repo whose id/path a store holds
   fails `repo_id_claimed_by_store` / `repo_path_claimed_by_store`;
   writing a store whose id/path a repo holds fails
   `store_id_claimed_by_repo` / `store_path_claimed_by_repo` (naming
   convention recorded: cross-section codes lead with the section
   being written and name the claimant). Within the repos section,
   same-path-two-ids fails `repo_path_conflict` mirroring stores. If a
   real both-roles checkout case ever appears, 3.6 owns relaxing
   this.
3. **`--store <repo-id>` rejects with a typed hint.** When store
   resolution finds no store but the id IS a registered repo, the error
   is `store_id_is_repo`: "Id '<id>' names a target repo
   (<path>), not a store. Stores hold OpenSpec work; target repos are
   mapped code checkouts." The repo check runs BEFORE both unknown-id
   branches — including the zero-stores branch, whose fix must not
   suggest claiming the repo's id (`store setup <id>` would loop into
   the cross-section conflict; the 1.3 no-error-loops lock applies):
   with stores registered the fix is "Pass a store id (registered:
   ...), or cd into the repo to work there."; with none it is "Run
   openspec store setup <different-id> to create a store, or cd into
   the repo to work there." Reachable from every `--store` path
   (explicit flag and the 3.2 declared pointer — the pointer case
   keeps the "Declared in <file>: " prefix as its actionable
   mitigation, matching the unknown_store precedent).
4. **Resolution surface: the targets block.** Effective-target entries
   (3.4) gain `path` when the repo map resolves the id — typed as a
   targets-local `TargetRepoEntry` (`DeclarationEntry & {path?}`) so
   the shared declaration type never grows a references-meaningless
   field. JSON `repos: [{id, remote?, path?}]`; human
   `- api-server → /Users/dev/src/api-server` and the combined form
   `- api-server → /path (clone: <url>)` when both exist (the Unicode
   arrow is a deliberate, recorded choice — archive and specs-apply
   already print it; agents consume JSON). Unmapped ids stay bare with
   no warning (normal for teammates who don't work in that repo), and
   a CORRUPT registry also yields all-bare entries silently — both are
   3.6's health surface, recorded as silence-by-design. The lookup is
   ONE ADDITIONAL registry read in `loadRootConfigContext` (the
   references assembler reads internally and does not expose its read;
   refactoring it for a shared read is not worth the coupling).
5. **No new top-level resolution API.** "Given a target repo id,
   OpenSpec can resolve the local checkout path" is satisfied by
   `repo list --json` (the map itself) and the enriched targets block
   (resolution in context). ONE library accessor exists —
   `getRepoPath(id)` in `store/registry.ts` — used by the targets
   enrichment now and by 4.1 later (no second `resolveRepoPath` name);
   no new CLI command resolves ids.
6. **JSON contracts, pinned.** `repo register`:
   `{repo: {id, path}, registry: {path, registered,
   already_registered}, status: []}`. `repo unregister`:
   `{repo: {id, path}, registry: {path, removed}, status: []}`.
   `repo list`: `{repos: [{id, path}], status: []}` (empty map →
   `repos: []`, human "No repos registered."). Unknown id on
   unregister → `repo_not_found`. Grammar failures use
   `invalid_repo_id` with `target: 'repo.id'` and repo wording — and
   when the DEFAULT folder-name id fails grammar, the fix names
   `--id` (the user didn't choose the bad id). The kebab predicate
   moves to its neutral home: `src/core/id.ts` owns
   `KEBAB_ID_REGEX`/`isKebabId` (the 3.4-recorded move, now that repo
   ids are resolvable); change-metadata, store foundation, and repo
   validation all consume it.

## User Experience

A developer maps the repos the team's work targets:

```bash
$ openspec repo register ~/src/api-server
Repo registered: api-server
Location: ~/src/api-server
$ openspec repo list
api-server  /Users/dev/src/api-server
```

Instructions in the planning store now show where the work lands on
THIS machine:

```text
<target_repos>
<!-- The code repos this work is about. Declarations, not machinery. -->
Declared by the store config.
  - api-server → /Users/dev/src/api-server
  - web-app (clone: git@github.com:acme/web-app.git)
</target_repos>
```

Wrong turns are typed, not generic:

```text
$ openspec list --store api-server
Error: Id 'api-server' names a target repo (/Users/dev/src/api-server), not a store. Stores hold OpenSpec work; target repos are mapped code checkouts.
Fix: Pass a store id (registered: team-context), or cd into the repo to work there.

$ openspec repo register ~/elsewhere/api-server
Error: Repo 'api-server' is already registered at /Users/dev/src/api-server. One checkout per repo id is supported on this machine.
Fix: Use the existing registration, or run openspec repo unregister api-server first.

$ openspec repo register ~/src/team-context --id team-context
Error: Id 'team-context' is already registered as a store (/Users/dev/src/team-context). Store and repo ids share one namespace.
Fix: Choose a different repo id, or run openspec store unregister team-context first.
```

## Scope

In scope:

- **Foundation** (`store/foundation.ts`): `RegistryStateSchema` gains
  optional `repos: z.record(id, {local_path})` (strict);
  `StoreRegistryState.repos?`; parse/serialize round-trip; canonical
  path storage.
- **Registry** (`store/registry.ts`): `registerRepo`, `unregisterRepo`,
  `listRepoEntries`, `getRepoPath(id)`; cross-section id AND path
  uniqueness in BOTH write paths (store writes check repos, repo
  writes check stores) with the four claimant codes;
  `repo_path_conflict` within the section; repo same-id/same-path
  no-op and different-path conflict mirroring stores;
  `withRegisteredStore`/`withoutRegisteredStore` (and the repo
  equivalents) preserve the OTHER section through every rebuild.
- **Id grammar** (`src/core/id.ts`, NEW): `KEBAB_ID_REGEX` +
  `isKebabId` move here from change-metadata/schema (which re-exports
  or imports); store foundation and repo validation consume it.
- **Commands** (`src/commands/repo.ts`): the three subcommands, JSON +
  human output following the store group's shapes (`status` arrays,
  diagnostics envelope `target: 'repo.id'` etc.); completions registry
  entries; command-registry pin updates (deliberate friction).
- **Root selection**: the `store_id_is_repo` rejection in
  `resolveStoreRoot`'s unknown-store path (one registry read already
  in hand), reachable from `--store` and the declared pointer.
- **Targets enrichment** (`core/targets.ts` + instruction wiring):
  `assembleTargets` input gains `repoPaths?: Map<string, string>`;
  entries gain `path?`; human renderer arrow form; the instructions
  flow builds the map from one registry read.
- **Docs**: `docs/cli.md` — the repo group section + the enriched
  targets example; the local-not-shared sentence.
- **Tests**: foundation round-trip (repos section absent/present;
  pre-3.5 registry parses; unknown keys fail); registry unit
  (register/unregister/list; same-path no-op; different-path conflict;
  cross-section conflicts both directions); command e2e (register with
  default and explicit id; missing path; non-directory; list JSON +
  human; unregister; rerun no-op); the `--store <repo-id>` typed hint
  (explicit flag AND pointer path); targets enrichment (mapped path in
  JSON + human arrow; unmapped stays bare with no warning); the
  store-group regression pins stay green (registry with repos section
  doesn't break store list/doctor).

Out of scope:

- Relationship health (3.6 — unmapped-target roll-ups, doctor
  surfaces), assembled context (4.1 — `resolveRepoPath` consumers).
- Any clone/sync/enforcement behavior; remotes for repos (the
  declaration-level remote from 3.4 already covers clone sources).
- Multi-path mappings, per-project maps, or shared/committed maps.
- Renaming the registry file or migrating its location.

## Acceptance Criteria

### The Map Is Typed Local Settings

#### Scenario: Register, List, Unregister

- **GIVEN** an existing directory `~/src/api-server`
- **WHEN** the user runs `repo register ~/src/api-server`
- **THEN** the registry's `repos:` section maps `api-server` to the
  canonical path, and `repo list` (JSON + human) shows it
- **AND** the id defaults to the folder name and `--id` overrides it
  (kebab-validated, invalid grammar fails)
- **AND** a rerun with the same path is a no-op
  (`already_registered: true`)
- **AND** `repo unregister api-server` forgets the mapping without
  touching the directory
- **AND** a registry without a `repos:` section parses exactly as
  today (store flows byte-identical)

#### Scenario: Store Writes Preserve The Repo Map

- **GIVEN** a registry with both sections populated
- **WHEN** a store is registered, another unregistered, and a setup
  rerun executes
- **THEN** the `repos:` section is byte-identical afterward
- **AND** repo writes likewise preserve the `stores:` section

#### Scenario: Failures Are Clear

- **GIVEN** the map above
- **WHEN** the user registers a different path under the same id
- **THEN** the conflict error names the existing path with the
  unregister fix
- **AND** registering a missing path or a file fails with the typed
  store-group-style errors
- **AND** registering a repo under a STORE's id or path fails with
  `repo_id_claimed_by_store` / `repo_path_claimed_by_store` naming the
  claimant, and vice versa (`store_id_claimed_by_repo` /
  `store_path_claimed_by_repo`), in both write paths
- **AND** two repo ids cannot map one path (`repo_path_conflict`)
- **AND** unregistering an unknown repo id fails `repo_not_found`

### One Namespace, Typed Rejections

#### Scenario: --store Never Resolves A Repo Id

- **GIVEN** `api-server` registered as a repo and `team-context` as a
  store
- **WHEN** any command runs with `--store api-server`
- **THEN** the error is `store_id_is_repo` naming the repo's path and
  the registered store ids
- **AND** the same rejection fires when a 3.2 `store:` pointer declares
  a repo id
- **AND** the rejection fires even when NO stores are registered, with
  a fix that does not suggest claiming the repo's id
- **AND** `--store team-context` still resolves normally

### Resolution Shows Up Where Work Happens

#### Scenario: Targets Gain Local Paths

- **GIVEN** a store declaring `targets: [api-server, web-app]` with
  only `api-server` mapped locally
- **WHEN** instructions run (both surfaces, both modes)
- **THEN** the `api-server` entry carries `path` (JSON) and the arrow
  form (human)
- **AND** `web-app` stays bare with no warning
- **AND** a mapped entry that also declares a remote renders the
  combined form
- **AND** a corrupt registry yields all-bare entries silently
- **AND** a change-narrowed set resolves the same way
- **AND** with no repos mapped at all, output is byte-identical to
  pre-3.5
