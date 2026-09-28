# Store Rename And Guidance Pass Spec

## Outcome

The product noun for a registered standalone OpenSpec repo is **store**,
everywhere: the command group, the machine tokens, the help text, the
completions metadata, the generated workflow skills, the checked-in agent
guidance, and the docs. The same pass makes stores discoverable to agents —
a fresh agent session in a project repo with a registered store completes a
store-scoped change from a single prompt, without the human spelling out
flags — and stops the same guidance surfaces from advertising initiatives
and workspaces as normal workflow.

This is one regeneration pass, not two: teaching guidance that stores exist
and removing initiative/workspace advertising touch the same files, so they
land together. The rename lands first, before any guidance prose is
written, so no guidance bakes in a name that is about to change.

## Locked Decisions (from roadmap, 2026-06-11)

1. **The noun is "store"**, defined everywhere as "a store — a standalone
   OpenSpec repo you've registered." "Planning repo" and "contracts repo"
   are prose examples of what a store is for, never product nouns.
   "Context" is retired from this concept (freed for Phase 4).
2. **Command group renames `context-store` → `store`.** Subcommand names
   (`setup`, `register`, `unregister`, `remove`, `list`/`ls`, `doctor`) are
   unchanged. The `--store` flag stays. The rejected runner-up
   (using the repo noun) is not revisited.
3. **Machine tokens rename in the same pass:** `context_store`-bearing
   diagnostic codes and JSON keys → `store` forms, and the machine-local
   data directory `context-stores/` → `stores/`.
4. **Committed store-repo formats stay:** the `.openspec-store/` metadata
   directory name, the `store.yaml` file name and shape, and the registry
   file shape are unchanged. A store created before this slice is still a
   valid store after it.
5. **Two riders land with the rename:**
   - Remove the second live meaning of `--store`: `workspace open
     --store <id>` and `workspace open --store-path <path>` (initiative
     selectors) are removed from registration and from the completions
     metadata this slice regenerates.
   - Add an unknown-subcommand hint under the `store` group for the
     inevitable `openspec store new change <id>` mistake, pointing at
     `openspec new change <id> --store <id>`.
6. **Out of scope by prior decision:** the content of
   `schemas/workspace-planning/templates/` (Phase 5 decides its fate), and
   any command behavior changes beyond the rename and the two riders.

## The Rename Rule (one principle, no carve-outs)

The reviews of the first draft converged on one principle, adopted here:

> **The token rename is total and mechanical. The prose rewrite is
> surgical.**

- **Total token rename.** After this slice, no live surface — help,
  errors, hints, JSON codes and keys, dotted diagnostic `target` values,
  completions, generated guidance, checked-in guidance, docs — emits or
  contains the tokens `context-store`, `context_store`, `contextStore`,
  or the phrase "context store". This includes the `initiative` and
  `workspace` groups: their machine tokens, flag descriptions, hint
  strings, and JSON keys rename mechanically even though both groups are
  deleted in the next slice, because a hint a user pastes must work
  verbatim and an acceptance grep must not need a carve-out list.
  Whitelist (the only survivors): the committed format literals
  (`.openspec-store/` directory name, `store.yaml` filename) and the
  `openspec/` planning-history tree (`work/`, `changes/`,
  `initiatives/`, `explorations/`), which sits outside the sweep roots
  entirely.
- **Surgical prose rewrite.** Structural rewriting — new teaching text,
  removed advertising, legacy labeling — happens only on the guidance
  surfaces enumerated in Scope. Inside the `initiative` and `workspace`
  groups the rename substitutes tokens and nothing else: no restructuring,
  no new prose, because that code dies in the next slice.
- **Behavior changes are exactly the two riders.** Everything else is
  byte-equivalent behavior under new names.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **No back-compat alias and no data-dir migration.** The `context-store`
   command group disappears entirely — no hidden alias — and the old
   `context-stores/` data directory is neither read nor migrated. The
   feature has zero users (everything since slice 1.1 is unmerged), and
   Phase 5's criteria are already locked as delete-don't-hide.
2. **Internal identifiers rename too.** `src/core/context-store/` →
   `src/core/store/`, `src/commands/context-store.ts` →
   `src/commands/store.ts`, `ContextStore*` symbols → `Store*`, and test
   and helper files follow (`test/commands/context-store*.test.ts`,
   `test/core/context-store/`, `test/helpers/context-store-git.ts`). One
   concept, one token applies to the codebase, not just user-facing
   strings; the rename is compiler-checked and free while there are no
   users.
3. **The legacy groups get token substitution only.** The `initiative` and
   `workspace` groups are deleted in the next slice (the Phase 5
   command-group deletion), so this slice renames their tokens (per the
   rename rule above) and their group one-liners, and changes how
   completions present them — but does not restructure their prose,
   behavior, or tests beyond what the rename forces. Their `--store`
   selectors (for example `initiative create --store`, a store-id
   selector, and initiative's live `--store-path`) keep their behavior
   under reworded descriptions and die with the groups next slice; the
   spec names this as an accepted, expiring inconsistency rather than
   pretending `--store` has exactly one meaning while the legacy groups
   still breathe.
4. **Workspace guards in workflow templates stay; stray workspace prose
   goes.** The guards quote a live JSON contract (`actionContext.mode:
   "workspace-planning"`, still reachable until 4.1 rebuilds opening) and
   they refuse workspace flows rather than advertise them. Ground truth
   correction to the roadmap's surface inventory: five templates carry
   the guard (apply-change, archive-change, bulk-archive-change,
   sync-specs, verify-change), twice each (two profile variants); zero
   templates reference initiatives. Three further mentions sit outside
   guards — `continue-change.ts:72,192` and `onboard.ts:281` ("workspace
   planning context") — and are reworded to schema-instruction language.
5. **Docs get a mechanical accuracy pass, not the deferred rewrite.** The
   rename deletes the documented `context-store` commands, so every doc
   that instructs running them is updated mechanically: `docs/cli.md`
   (store section renamed and reworded to the locked vocabulary; the
   `workspace open --store`/`--store-path` rows deleted per rider 1; the
   stale default-XDG-path line corrected — 1.3 already made `--path`
   required; initiative rows token-renamed and legacy-labeled),
   `docs/concepts.md` (token renames), and the `docs/workspaces-beta/`
   files (`agent-cli-playbook.md`, `user-guide.md`), which get token
   renames plus correctness fixes where a documented invocation already
   fails against the current CLI (setup examples missing the `--path`
   that 1.3 made required; pre-1.3 prompt-flow prose). Deleting the beta
   docs outright belongs to the Phase 5 remainder; the public
   concept-docs rewrite (L1) stays deferred.
6. **The checked-in beta guidance is cut, not updated.**
   `.codex/skills/use-openspec/references/shared-context-beta.md`
   advertises initiative/workspace flows that the next slice deletes; per
   the locked 5.1 sequencing ("guidance surfaces die in slice 1.4"), the
   reference file is deleted, `SKILL.md` is rewritten around store
   discovery instead of routing to it, and
   `references/artifact-placement.md` loses its beta context-store flow
   section and workspace-inspection routing (placement guidance itself
   stays). Ground truth discovered during implementation: `.codex/` is
   git-ignored (`.gitignore:158`) — this guidance is the L8
   ignored-local-skill, not checked-in source, so its rewrite lands on
   disk for local agents but cannot appear in a commit; L8 still owns
   its final disposition.
7. **Dead store code is deleted, not renamed.**
   `getDefaultContextStoreRoot` (`foundation.ts:67`) lost its last
   production caller when 1.3 made `--path` required; the rename pass
   deletes it (and its tests) per the locked delete-don't-hide criteria
   rather than carrying a dead export under a new name.
8. **Module-size bar, recorded reason.** The rename touches
   `src/core/context-store/operations.ts` (~1077 lines) and
   `src/commands/context-store.ts` (~751 lines), both over the ~600-line
   bar. No split in this slice: the changes are mechanical token
   substitution, and the upcoming Phase 5 deletions and 4.1 rebuild will
   shrink or restructure these modules; splitting mid-rename would create
   review noise for structure that is about to change again.

## User Experience

### A human renames nothing; the product finally says one word

```bash
openspec store setup team-context --path ~/src/team-context
openspec store list
openspec store doctor
```

Top-level help describes the group as the standalone OpenSpec repo
feature, in the locked vocabulary:

```text
store      Create and manage stores - standalone OpenSpec repos you register on this machine
```

The `--store` flag on lifecycle commands reads "Store id to use as the
OpenSpec root (a store is a standalone OpenSpec repo you've registered)".
Nothing in help, errors, JSON, completions, or docs says "context store"
anymore.

### An agent discovers the store on its own

A human in an app repo says: "create a change for the billing rework in
our team store." The agent's generated workflow skill tells it how stores
work: discover with `openspec store list --json`, then carry
`--store <id>` on every lifecycle command. The agent runs:

```bash
openspec store list --json          # finds id: team-context
openspec new change billing-rework --store team-context
```

and every hint the CLI prints keeps `--store team-context` in the loop, so
the agent never falls back to the wrong root. No initiative or workspace
command appears anywhere in the skill's instructions.

### The inevitable wrong turn lands somewhere useful

```text
$ openspec store new change billing-rework
Error: unknown command 'new' for 'openspec store'.
Store subcommands manage store registration: setup, register, unregister,
remove, list (ls), doctor.
To create or work on a change in a store, use the normal command with
--store, for example:
  openspec new change billing-rework --store <id>
```

### Old beta surfaces stop volunteering

`workspace open --store` and `--store-path` no longer exist. The
`workspace` and `initiative` group one-liners say they are legacy beta
surfaces, completions metadata stops presenting their flows as normal
steps, and the hints they still print name commands that actually exist.
(Both groups are deleted outright in the next slice; this slice only
stops the advertising and keeps every printed hint pasteable.)

## Scope

In scope:

- **Group rename**: `context-store` → `store` in command registration
  (`src/commands/context-store.ts:691-751`, `src/cli/index.ts:22,349`),
  with subcommand names, arguments, and behavior unchanged. Telemetry
  command paths follow mechanically (`store:setup` etc. via the generic
  command-path tracker at `src/cli/index.ts:100-101`).
- **Machine tokens, repo-wide per the rename rule**: every diagnostic
  code containing `context_store` (the 37 `context_store_*`-prefixed
  codes plus `invalid_context_store_id`, `invalid_context_store_metadata`,
  `invalid_context_store_path`, `invalid_context_store_registry`,
  `no_context_store_registry`, `context_stores_unreadable`,
  `context_stores_partially_unreadable`, and
  `workspace_context_store_unavailable` — 45 total today, pinned by
  sweep, not by this count); every dotted diagnostic `target` value in
  the `context_store.*` family (foundation, operations, git, registry,
  root-selection, openspec-root); every JSON output key
  (`context_store`/`context_stores` → `store`/`stores`), including the
  `initiative` command output shapes (`src/commands/initiative.ts:50-71`)
  and workspace-open JSON (`src/commands/workspace/open-view.ts:61`); the
  XDG data dir `context-stores/` → `stores/`
  (`foundation.ts:14,59-65`), registry filename `registry.yaml`
  unchanged.
- **Hint strings on kept-alive paths**: every fix/hint that names a
  `context-store` command renames so it stays pasteable, including
  initiative resolution (`src/core/collections/initiatives/resolution.ts:551,565,625`,
  and its `--store`/`--store-path` advertising at `:192,234`, which
  renames to name surviving selectors only), workspace surfaces
  (`src/commands/workspace/context-status.ts:48`, `open-view.ts:211`,
  `open-target-selection.ts:142`), and stray core strings
  (`src/core/change-metadata/schema.ts:14`,
  `src/core/collections/runtime.ts:282`,
  `src/core/workspace/open-surface.ts:21,120-138` — token substitution
  only on the legacy generated workspace guidance).
- **Internal renames**: module directory, command file, exported symbols,
  helper/test files (per autonomous decision 2), and deletion of the dead
  `getDefaultContextStoreRoot` export (decision 7).
- **Preserved formats, guarded by tests**: `.openspec-store/` directory
  name, `store.yaml` filename and shape, registry shape.
- **Rider 1**: remove `--store`/`--store-path` from `workspace open`
  (`src/commands/workspace/registration.ts:138-139`, completions
  `command-registry.ts:383-392`). `workspace open --initiative <id>` keeps
  resolving through the existing cross-store search, the qualified
  `<store>/<initiative>` form, and the interactive picker
  (`open-target-selection.ts:195-240`).
- **Rider 2**: an unknown-subcommand handler on the `store` group naming
  the real subcommands (including the `ls` alias) and pointing
  lifecycle-shaped mistakes at `openspec <command> --store <id>`. The
  hint prints on stderr in both human and JSON invocations, consistent
  with existing Commander unknown-command behavior; no new JSON envelope.
- **Help and flag prose**: the `store` group and subcommand one-liners,
  `STORE_OPTION_DESCRIPTION` (`src/cli/index.ts:41`), the hidden
  `--store-path` rejection message (`src/cli/index.ts:47-53`), and the
  `workspace` and `initiative` group one-liners (legacy-beta labeling).
- **Completions metadata**: `shared-flags.ts:29-33` store-flag
  description; `command-registry.ts` store group entries renamed and
  reworded; initiative/workspace entries token-renamed and labeled
  legacy; the `workspace open` store selectors removed.
- **Generated workflow skills** (`src/core/templates/workflows/`, 12
  templates): add store teaching — when the user names a store or the
  work lives in a registered store, discover ids with
  `openspec store list --json` and carry `--store <id>` on every
  `openspec` command the skill issues; note that printed hints carry the
  flag. Workspace guards stay in the five templates that carry them; the
  three out-of-guard workspace-planning prose mentions
  (`continue-change.ts:72,192`, `onboard.ts:281`) reword to
  schema-instruction language; no initiative or workspace flow is
  presented as a normal step.
- **Checked-in agent guidance**: `.codex/skills/use-openspec/SKILL.md`
  rewritten around store discovery (`openspec store list --json` as the
  inspection command; `--store` as root selection);
  `references/shared-context-beta.md` deleted;
  `references/artifact-placement.md` updated per decision 6.
- **Docs accuracy pass** per decision 5: `docs/cli.md`,
  `docs/concepts.md`, and `docs/workspaces-beta/agent-cli-playbook.md`,
  `user-guide.md`.
- **Dogfood acceptance** (runbook): a headless agent session in a scratch
  project repo that carries generated workflow skills (produced by
  `openspec init` in the scratch repo), with isolated XDG state and a
  registered store, completes a store-scoped change from a single plain
  prompt that names the team store but no ids or flags.

Out of scope:

- Deleting the `workspace` and `initiative` command groups (the next
  slice in the queue) or restructuring their internals beyond token
  substitution and one-liners.
- `schemas/workspace-planning/templates/` content, the
  `workspace-planning` schema name, and the `actionContext.mode:
  "workspace-planning"` contract value (alive until 4.1).
- Any command behavior change beyond the rename and the two riders: no
  resolver changes, no new flags, no setup/register/doctor behavior
  changes, no removal of the initiative group's own selectors.
- Migration or reading of the old `context-stores/` data directory.
- Changes to `.openspec-store/store.yaml` or registry content shapes.
- References and fallback stores (Phase 3); `view`/opening
  (Phase 4).
- Deleting `docs/workspaces-beta/` (Phase 5 remainder) and the public
  concept-docs rewrite (L1) beyond the accuracy pass above.

## Acceptance Criteria

### The Rename Is Total

#### Scenario: The Store Group Replaces Context-Store

- **GIVEN** the built CLI
- **WHEN** the user runs `openspec store setup|register|unregister|remove|list|ls|doctor`
- **THEN** each behaves exactly as its `context-store` counterpart did
  before this slice
- **AND** `openspec context-store <anything>` fails as an unknown command
  with no alias or redirect
- **AND** `openspec --help` lists `store` with a one-liner using the
  locked definition and lists no `context-store` group

#### Scenario: Machine Tokens Speak Store

- **WHEN** any command emits JSON (success or error), including the
  legacy `initiative` and `workspace` groups
- **THEN** diagnostic codes use `store` forms (for example
  `store_not_found`, `invalid_store_id`, `no_store_registry`,
  `workspace_store_unavailable`), dotted `target` values use the
  `store.*` family, and payload keys are `store`/`stores`
- **AND** no output contains the token `context_store`

#### Scenario: The Sweep Is The Test

- **WHEN** the repo is swept for `context-store`, `context_store`,
  `contextStore`, and the phrase "context store" (case-insensitive)
  across `src/`, `test/`, `docs/`, `.codex/`, scripts, and completions
- **THEN** the only matches are the committed format literals
  (`.openspec-store/`, `store.yaml` where it names that file), the
  `openspec/work/` planning-history folder, and archived/changelog
  history
- **AND** this sweep is encoded as a test or check the suite runs, so
  drift cannot return silently

#### Scenario: The Data Directory Moves, The Committed Format Does Not

- **GIVEN** a fresh machine state
- **WHEN** the user sets up and registers a store
- **THEN** the registry lives at `<data-dir>/stores/registry.yaml`
- **AND** the store root still carries `.openspec-store/store.yaml` with
  the same schema as before this slice
- **AND** a store repo created before this slice registers successfully
  after it
- **AND** nothing reads or writes the old `context-stores/` directory

#### Scenario: Tests Guard The Committed Names

- **WHEN** the suite runs
- **THEN** explicit assertions pin `.openspec-store` and `store.yaml` as
  on-disk literals, so a future rename pass cannot silently break cloned
  stores

#### Scenario: Telemetry Paths Follow

- **WHEN** a store subcommand runs with telemetry enabled
- **THEN** the tracked command path is the `store:` form (for example
  `store:setup`), with no other telemetry changes

### --store Converges On Root Selection

#### Scenario: Workspace Open Loses Its Store Selectors

- **WHEN** the user runs `openspec workspace open --store x` or
  `--store-path /tmp/x`
- **THEN** the CLI rejects the unknown option
- **AND** `workspace open --help` and completions metadata list neither
  option
- **AND** `workspace open --initiative <id>` still resolves initiatives
  through registered stores, including the qualified
  `<store>/<initiative>` form and the interactive picker
- **AND** no surviving hint or completion advertises the removed
  selectors

#### Scenario: One Root-Selection Description On Lifecycle Commands

- **WHEN** `--store` appears in the help or completions of any command
  outside the legacy `initiative` group
- **THEN** its description is the root-selection meaning in store
  vocabulary, identical across commands
- **AND** the legacy `initiative` group's `--store`/`--store-path`
  selectors keep their behavior under store-vocabulary descriptions
  (an accepted inconsistency that the next slice deletes with the group)

### The Wrong Turn Gets A Hint

#### Scenario: Lifecycle Commands Under The Store Group

- **WHEN** the user runs `openspec store new change add-x` (or another
  unknown `store` subcommand)
- **THEN** the error names the real store subcommands, including the
  `ls` alias
- **AND** points at the normal command with `--store`, for example
  `openspec new change add-x --store <id>`
- **AND** the hint is copy-pasteable apart from the `<id>` placeholder
- **AND** the hint prints on stderr for both human and `--json`
  invocations

### Every Hint Stays Pasteable

#### Scenario: Kept-Alive Surfaces Name Living Commands

- **GIVEN** the `initiative` and `workspace` groups still exist this
  slice
- **WHEN** any of their reachable errors, hints, or fix texts names an
  `openspec` command (for example initiative resolution's
  registry-missing fix, workspace context status, workspace open
  failures)
- **THEN** the named command exists in the renamed CLI and works verbatim
  apart from placeholders

### Guidance Teaches Stores And Stops Advertising Beta

#### Scenario: Generated Workflow Skills Teach Store Selection

- **GIVEN** freshly generated workflow skills (any profile)
- **WHEN** a skill instructs the agent to run root-resolving `openspec`
  commands
- **THEN** the skill teaches discovering stores with
  `openspec store list --json` and carrying `--store <id>` on every
  command when the work selects a store
- **AND** no generated skill mentions `initiative` or presents workspace
  flows as normal steps
- **AND** the workspace-planning guards remain in the five templates that
  carry them today
- **AND** the three out-of-guard workspace-planning prose mentions are
  gone

#### Scenario: Checked-In Skill Guidance Routes To Stores

- **WHEN** an agent reads any file under `.codex/skills/use-openspec/`
- **THEN** store inspection is `openspec store list --json`
- **AND** `initiative list` and `workspace list` no longer appear as
  inspection or workflow steps anywhere in the directory
- **AND** the shared-context beta reference file is gone

#### Scenario: Legacy Groups Are Labeled, Not Advertised

- **WHEN** the user reads `openspec --help` or completions metadata
- **THEN** the `workspace` and `initiative` one-liners identify them as
  legacy beta surfaces
- **AND** no completions metadata describes initiative or workspace flows
  as the way to share or coordinate work

#### Scenario: Docs Match The Shipped Commands

- **WHEN** the user reads `docs/cli.md` or `docs/workspaces-beta/`
- **THEN** every documented invocation runs against the built CLI without
  an unknown-command or unknown-option error
- **AND** the `docs/cli.md` store section uses the `store` group name and
  the locked vocabulary, and no longer documents the removed
  `workspace open` store selectors or the pre-1.3 default-XDG-path setup
  behavior

### A Fresh Agent Completes The Loop

#### Scenario: Single-Prompt Store-Scoped Change (Dogfood Proof)

- **GIVEN** a scratch project repo prepared with `openspec init` (so the
  generated workflow skills are present), isolated XDG state, and a
  registered store
- **WHEN** a fresh headless agent session is prompted once, in plain
  language, to create a change in the team store (the prompt names the
  store in words but contains no ids, paths, or flags)
- **THEN** the agent discovers the registered store id and creates the
  change in the store root using `--store`
- **AND** no initiative or workspace command is invoked
- **AND** the transcript is kept as the slice's acceptance evidence

### Nothing Else Moves

#### Scenario: Behavior Parity Outside The Renamed Surfaces

- **WHEN** the full suite runs after the rename
- **THEN** setup/register/unregister/remove/list/doctor behavior,
  root-selection precedence, and the 1.3 journey test pass unchanged
  apart from the renamed tokens
- **AND** the only behavior deltas in the slice are the two riders and
  the deleted dead export
