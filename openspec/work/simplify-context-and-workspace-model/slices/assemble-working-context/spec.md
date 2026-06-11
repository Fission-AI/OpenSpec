# Assemble Working Context Spec (4.1)

## Outcome

From any root, one command produces the full working set its
declarations describe — the OpenSpec root, its referenced stores, and
its mapped target repos — consumable as an agent session brief (JSON +
human) or as an editor view (a `.code-workspace` file, one consumer of
assembly, not the feature). Unresolvable pieces are reported, not
guessed. And the old workspace opening machinery this replaces — the
state model and workspace-planning mode that have been CLI-unreachable
since 1.2 — is deleted per the recorded ledger carve-outs (the absorbed
2.3: no de-initiative-ing of a path that dies).

## Locked Decisions (roadmap)

1. **Assembly is a local convenience computed from Phase 3's declared
   relationships, not a new planning system.** The selected OpenSpec
   root is the durable planning source of truth; references supply
   upstream stores; the local repo map supplies target checkouts. No
   workspace-owned planning state, ever.
2. **The primary interface is an agent session** — the assembled set
   must be agent-consumable, not only editor-shaped.
3. **No machinery**: no clone, pull, push, sync, branch, worktree,
   dashboard, or edit-boundary enforcement.
4. **Unresolvable pieces are reported, not guessed.**
5. **The absorbed 2.3**: opening is rebuilt around assembled context;
   the old workspace state model (with initiative selection hardcoded
   in) is deleted, not decoupled.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **The surface is a new top-level `openspec context`** — "print the
   working context for the resolved root". Resolution is the normal
   precedence (`--store`, nearest, declared pointer; no implicit
   scaffold). JSON is the agent brief; human output is a readable set
   listing; `--code-workspace <path>` additionally WRITES a VS Code
   workspace file (the one write this feature performs, explicit and
   user-requested — never implied). The name "context" is the phase's
   own noun; the banned token is the compound "context store", not the
   word.
2. **Assembly is presentation over `inspectRelationships`** — the 3.6
   spec recorded 4.1 as its consumer. The DATA gather (registry
   snapshot, health-mode reference index, store-level targets, root
   inspection) is EXTRACTED into a shared command-layer helper that
   doctor and context both call; doctor-only inputs (store facts, the
   wrong-turn detections, stale-path stats) stay in doctor — context
   is deliberately SILENT on both-shapes/inert-pointer/divergence
   (recorded: context answers "what is my working set", doctor answers
   "is it healthy"; 3.6 pinned those diagnostics to doctor output and
   ONLY there). Member mapping from the health data, pinned:
   - AVAILABLE = `path` present AND per-entry `status` empty. Only
     available members enter the `.code-workspace`.
   - `target_path_missing` entries (path + warning) are NOT available
     (the stale path appears in the message, never as a folder).
   - Synthesized `target_invalid_id` entries are NOT-available members
     carrying their status; they append after declared members
     (declaration order holds for declared members only — recorded).
   - Registry-unreadable bare targets are NOT-available members with
     empty per-entry status; the top-level registry-unreadable entry
     names the cause.
   No new diagnostic codes; the unresolved members carry the existing
   fixes verbatim.
3. **JSON shape**:
   `{root: {path, source, store_id?, role: "openspec_root"},
   members: [{role: "referenced_store" | "target_repo", id, path?,
   remote?, status: []}], status: []}` — `path` present iff resolved/
   mapped; members in declaration order, references before targets;
   the top-level `status` carries the registry-unreadable degradation.
   The fetch recipe for referenced stores rides each resolved member
   (`fetch: openspec show <spec-id> --type spec --store <id>`, reusing
   the exported references `fetchRecipe` — one source for the string)
   so an agent brief is self-contained.
4. **The `.code-workspace` emitter** writes
   `{folders: [{name, path}...]}` — the root first (name: the root
   dir basename or store id), then AVAILABLE referenced stores
   (`ref:<id>`), then AVAILABLE targets (`repo:<id>`). Unavailable
   members are omitted from the file and reported on stderr. Write
   semantics, pinned: an existing path refuses with exit 1 and a typed
   `context_file_exists` diagnostic whose fix names `--force`
   (implementation amendment: the draft's `code_workspace_exists`
   would trip the vocabulary sweep's `workspace_*` token ban — the
   flag name `--code-workspace` is safe, hyphenated);
   `--force` overwrites; a missing parent directory fails with a clear
   error (NO implicit mkdir — the requested file is the only write);
   with `--json`, the brief stays pure on stdout and the write
   confirmation goes to stderr. 4.1 replaces opening with emitted
   assembled-context artifacts; no `open` verb or editor process
   launch is introduced.
5. **The deletions — the ledger's 4.1 carve-outs, widened where the
   carve-out rationale collapses**:
   - `src/core/workspace/` whole (foundation, state-io, legacy-state,
     index — ~900 lines) plus the `src/core/index.ts` barrel line.
   - `planning-home.ts`'s workspace branch: `PlanningHomeKind`
     collapses to `'repo'`, the workspace state read and
     `WORKSPACE_DEFAULT_SCHEMA` die; the `PlanningHome` interface
     survives as the repo-shaped carrier.
   - `binding.ts` WHOLE (review finding: 5.1 kept it only because
     workspace/foundation imported it; with workspace/ gone it has
     zero production consumers — the whole ~300-line module dies, with
     its `registry.test.ts` binding tests and the `store/index.ts`
     barrel line, exactly the hidden-not-deleted state the 5.1
     criteria reject).
   - `change-status-policy.ts`'s workspace-planning branch AND its
     cascade: `summarizeAffectedAreas` (constant-undefined
     post-collapse), `AffectedAreasSummary`,
     `ChangeNextStepsInput.affectedAreas`, the workspace next-steps,
     `PlanningHomeSummary.workspaceName`, the `'workspace-planning'`
     mode union member, and the instruction-loader plumbing that
     threads them.
   - The FIVE workflow-template workspace-planning guards
     (apply/verify/archive/bulk-archive/sync-specs templates, two
     occurrences each) — 5.1 explicitly deeded them here ("they quote
     the library contract that 4.1 deletes"); their removal churns the
     skill-template parity hashes and the checked-in `.codex` guidance
     deliberately.
   - `getRepoPath` (review finding: its recorded consumers
     evaporated — the snapshot serves every caller; delete-don't-hide,
     with the repo-map record amended).
   Library pins that existed solely to freeze the carve-outs
   (`planning-home.test.ts` workspace cases, the legacy-groups
   workspace-planning library pin) are deleted WITH the behavior; the
   six legacy-groups CLI-surface pins stay and must remain
   byte-identical. The deletion ledger is updated throughout
   (carve-outs marked executed, the Surviving-tokens section pruned,
   the `workspace_skills` vocabulary-allowlist entry removed — its
   referents die here, verified). The workspace-planning SCHEMA files
   and the accepted-spec L2 question stay with the Phase 5 remainder
   as recorded.
6. **Naming, recorded**: `openspec context` over `openspec view` (the
   dashboard owns `view`) and over an `open` verb (no process
   launching). The vocabulary sweep bans only the compound
   `context store`; docs disambiguate "project context" (the config
   field injected into instructions) from "working context" (this
   set). Adding `context` to `STORE_SELECTION_GUIDANCE` rewrites the
   generated workflow templates — the parity hashes and guidance walk
   update deliberately, as in 3.6.

## User Experience

```text
$ openspec context
Working context for team-context (/Users/dev/src/team-context)

OpenSpec root
  team-context  /Users/dev/src/team-context

Referenced stores
  upstream-context  /Users/dev/openspec/upstream-context
    Fetch: openspec show <spec-id> --type spec --store upstream-context

Target repos
  api-server  /Users/dev/src/api-server

Not available on this machine
  - design-system: not registered
    Fix: git clone -- https://github.com/acme/design-system.git /Users/dev/openspec/design-system && openspec store register '/Users/dev/openspec/design-system' --id design-system
  - web-app: not mapped
    Fix: Run: openspec repo register <path> --id web-app
```

```text
$ openspec context --code-workspace team.code-workspace
Wrote team.code-workspace (3 folders; 2 members not available, see above)
```

The agent brief:

```json
{
  "root": { "path": "/Users/dev/src/team-context", "source": "store", "store_id": "team-context", "role": "openspec_root" },
  "members": [
    { "role": "referenced_store", "id": "upstream-context", "path": "/Users/dev/openspec/upstream-context", "fetch": "openspec show <spec-id> --type spec --store upstream-context", "status": [] },
    { "role": "referenced_store", "id": "design-system", "status": [{ "code": "reference_unresolved", ... }] },
    { "role": "target_repo", "id": "api-server", "path": "/Users/dev/src/api-server", "status": [] },
    { "role": "target_repo", "id": "web-app", "status": [{ "code": "target_unmapped", ... }] }
  ],
  "status": []
}
```

## Scope

In scope:

- **Core** (`src/core/working-set.ts`): `assembleWorkingSet` — pure
  mapping from `RelationshipHealth` (or its inputs) to the members
  shape; the `.code-workspace` content builder (pure: returns the JSON
  string; the COMMAND writes it).
- **Command** (`src/commands/context.ts`) + the shared gather
  (`src/commands/shared-gather.ts`): the data gather extracted from
  doctor (snapshot + health-mode index + targets + root inspection),
  consumed by both; doctor keeps its wrong-turn/store-facts/stale-path
  additions; `--code-workspace <path>` + `--force`; CLI/completions
  registration (friction pins; `STORE_SELECTION_GUIDANCE` gains
  `context`).
- **Deletions** per decision 5, with `pnpm test` green after each
  removal tranche; the deletion ledger updated (carve-outs marked
  executed); the vocabulary-sweep allowlist pruned if the
  workspace_skills entry's referent died (verify).
- **Docs**: `docs/cli.md` context section + summary row; the doctor
  section cross-links ("doctor answers whether the set is healthy").
- **Tests**: working-set unit (member mapping, ordering, fetch
  recipes, unresolved members, registry-unreadable degradation);
  code-workspace builder unit (folder list, name prefixes, omission of
  unresolved); command e2e (the three session shapes; JSON shape; the
  write + `--force` + refusal; stderr reporting; read-only except the
  requested file); deletion regression (the full suite is the net —
  workspace tests die with the code; `legacy-groups-removed.test.ts`
  drops its workspace-planning library pins and keeps the
  CLI-surface pins).

Out of scope:

- Editor integrations beyond the `.code-workspace` file; terminal
  multiplexers; session managers.
- Any open/launch behavior (no spawning editors).
- The workspace-planning schema files, obsolete beta change folders,
  and the L2 accepted-specs question (Phase 5 remainder, as recorded).
- Per-change context narrowing (instructions already shows per-change
  targets).

## Acceptance Criteria

### The Working Set Is Complete And Honest

#### Scenario: Assembly From Declarations

- **GIVEN** a store-backed root with one resolvable + one unresolvable
  reference and one mapped + one unmapped target
- **WHEN** `openspec context` runs (human + JSON; `--store`, nearest,
  and declared-pointer sessions)
- **THEN** JSON matches decision 3 exactly: resolved members carry
  absolute paths (and fetch recipes for stores), unresolved members
  carry the existing diagnostics verbatim (the 3.3 clone fix, the
  register fix), members in declaration order, references before
  targets
- **AND** human output separates available from "Not available on this
  machine"
- **AND** exit code is 0 (unresolved members are reported, not errors;
  command failures keep the resolution taxonomy and the null-shape
  payload `{root: null, members: [], status: [diagnostic]}`)

#### Scenario: Nothing Declared

- **GIVEN** a root with no references or targets
- **WHEN** context runs
- **THEN** the set contains only the root, `members: []`, and human
  output says so plainly

### The Editor View Is One Consumer

#### Scenario: Code-Workspace Emission

- **GIVEN** the mixed fixture above
- **WHEN** `openspec context --code-workspace out.code-workspace` runs
- **THEN** the file contains folders for the root + resolved members
  only, named `<root>`, `ref:<id>`, `repo:<id>`, in that order
- **AND** unresolved members are reported on stderr, not written
- **AND** rerunning without `--force` refuses with exit 1 and the
  typed `context_file_exists` fix naming `--force`; with `--force`
  it overwrites
- **AND** a missing parent directory fails clearly with no mkdir
- **AND** with `--json`, stdout stays the pure brief and the write
  confirmation lands on stderr
- **AND** no other file or registry state changes (snapshot)

### The Old Machinery Is Gone

#### Scenario: The Carve-Outs Are Executed

- **GIVEN** the post-4.1 tree
- **WHEN** the suite runs and the ledger is read
- **THEN** `src/core/workspace/` does not exist; `PlanningHomeKind`
  is `'repo'` only; the change-status-policy and binding carve-outs
  are gone; no `workspace_*` diagnostic codes or workspace state reads
  remain in src (the vocabulary sweep's allowlist reflects reality)
- **AND** every repo-local CLI behavior pinned by
  `legacy-groups-removed.test.ts`'s surface tests is byte-identical
- **AND** assembly works without any workspace/initiative state
  (no `.openspec-workspace` reads anywhere in src)
