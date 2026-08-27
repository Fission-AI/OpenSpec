# Simplify Context And Workspace Model Roadmap

This roadmap is an internal plan for the work described in `goal.md`.

The goal is simple:

```text
Specs are what is true.
Work is what is in motion.
```

OpenSpec work should live in normal Git files. Those files can live inside the
project repo, or they can live in a separate OpenSpec repo that points at one or
more project repos.

This roadmap should be readable by someone with no beta context. Each item says:

- What the user can do.
- Why it matters.
- What changes in commands or files.
- How the user or agent knows it worked.

This is not public product copy yet. Keep it practical, small, and honest about
what exists.

## The Story In Plain English

Today, too much of this area is explained through beta terms: context stores,
initiatives, workspaces, collections, and repo-local modes.

The simpler product story should become:

1. OpenSpec can live in this project repo or in its own Git repo.
2. If OpenSpec lives in its own repo, users can register that repo locally.
3. Normal OpenSpec commands can create, read, validate, and archive work in that
   selected OpenSpec repo.
4. A project repo with its own OpenSpec root can reference standalone OpenSpec
   repos its work draws on, such as high-level requirements from PMs and
   architects, without those repos taking over where commands act.
5. Personal worksets can open a planning repo alongside whichever code repos
   the user explicitly chooses for this machine.
6. The assembled OpenSpec context can show the root plus referenced stores; it
   does not infer implementation repos from declarations.

The product should not require users or agents to understand initiatives,
workspace-owned planning, or collection state as the main model.

## Vocabulary For This Roadmap

- **OpenSpec root**: the `openspec/` folder with `config.yaml`, `specs/`, and
  `changes/`.
- **OpenSpec inside a project repo**: the `openspec/` folder lives inside the
  code repo.
- **Standalone OpenSpec repo**: the `openspec/` folder lives in its own Git
  repo.
- **Store**: a standalone OpenSpec repo registered on this machine. It has a
  thin `.openspec-store/store.yaml` identity file, but the real planning work
  lives in normal files under `openspec/`. (Renamed from the beta noun
  "context store" on 2026-06-11; the CLI group rename lands in slice 1.4.)
- **Reference store**: a standalone OpenSpec repo that a project repo's work
  draws on for context (for example PM/architect requirements). A reference
  never changes where commands act; it is read as context.
- **View**: a local convenience for opening the OpenSpec repo and project repos
  together. It is not the source of truth.

## Rules We Should Not Forget

- Keep the normal `openspec/specs/` and `openspec/changes/` lifecycle working.
- When context stores are used, treat them as standalone OpenSpec repos, not as
  a separate planning system.
- References are repo-level config, never per-change lifecycle links. The
  moment each change carries a managed link object with status coupling back
  to a store, we have reinvented initiatives.
- One change lives in one root. Cross-root edits are two changes; the second
  root is reached explicitly with `--store`.
- Do not create new initiative links in the simpler product path.
- Do not create workspace-owned planning state in the simpler product path.
- Do not promise clone, pull, push, sync, branch, worktree, dashboard, apply,
  verify, or archive orchestration in these slices.
- Treat old beta files as history unless they block the simpler path.
- Do not rewrite public docs before the behavior is solid.

## Progress At A Glance

Use this as the quick "where are we?" view.

Working branch: all roadmap implementation happens on the single
`codex/store-root-parity` branch (PR #1190), with each slice stacked on the
previous ones. Merge to `main` is deferred until the work is ready to land
as a whole; the "Merged to `main`" checkboxes in each slice stay open until
then and do not gate the next slice.

Numbered labels are roadmap work item ids. Smaller `Progress` checkboxes inside
an item are status steps for that numbered work item.

- [x] **Phase 0. Make the active direction easy to find.**
  Old beta plans were marked as history, and this `/work` roadmap became the
  active direction.
- [ ] **Phase 1. Make a standalone OpenSpec repo useful.**
  Slices 1.1–1.4 are implemented with passing tests on the working branch;
  only merge to `main` remains. The noun is "store" everywhere (CLI group,
  machine tokens, guidance, docs), and a headless agent completes a
  store-scoped change from one plain prompt (dogfood transcript in the 1.4
  slice folder).
- [x] **Phase 2. Stop putting new work through initiatives.**
  Fully absorbed: 2.1 shipped inside slice 1.2, 2.2 folded into slice 1.4,
  and 2.3 folded into item 4.1. No independent work remains here.
- [x] **Phase 3. Say how roots relate: references.**
  Complete (merge to `main` pending): references, the declared-store
  fallback, canonical remotes, and the `openspec doctor`
  relationship-health roll-up are implemented and tested on the working
  branch. The code-repo declaration/map experiment was removed on
  2026-06-19.
- [ ] **Phase 4. Assemble the working context.**
  Complete (merge to `main` pending): `openspec context` ships the
  assembled working set; the old workspace opening machinery is
  deleted (absorbed old 2.3).
- [ ] **Phase 5. Remove old surfaces only when they confuse the simple path.**
  Criteria agreed (delete, sequenced). First tranche done: the
  `workspace` and `initiative` command groups are deleted (−12.9k net
  lines). The remainder runs after 4.1.
- [ ] **Phase 6. Prove the whole, ready for first users.**
  The final acceptance capstone: persona journeys, usability and technical
  audits, whole-delta review, release-readiness report. Runs last.
- [ ] **Phase 7. Keep and open personal worksets.**
  Complete (merge to `main` pending): the `workset` command group
  (compose/list/open/remove), the two-style opener table with local
  config, the capstone dogfood transcript, and the pushed branch with
  review comments addressed — all on the working branch.

Next incomplete item:

- (none) — every roadmap item is complete through its last
  pre-merge box. The only open boxes across the roadmap are the
  per-item "Merged to `main`" boxes, which close together when the
  branch lands (PR #1190).

## Phase 0. Make The Active Direction Easy To Find

This phase is already done. It cleaned up old roadmap sources so agents and
humans do not follow the wrong plan.

Phase checklist:

- [x] **0.1** Point people away from the old context-store beta plan.
- [x] **0.2** Mark deferred workspace plans as not the current queue.
- [x] **0.3** Reframe local agent guidance around OpenSpec roots.

### 0.1 Point People Away From The Old Context-Store Beta Plan

Progress:

- [x] Done.

What the user or agent needs:

- A clear place to find the current direction.
- Confidence that old initiative docs are history, not the active plan.

What changed:

- The old context-store initiative now points readers to this `goal.md` and
  `roadmap.md`.
- Old beta notes remain discoverable as transition evidence.
- The old initiative roadmap is no longer treated as the implementation queue.

How we know it worked:

- A new reader can start from this `/work` folder instead of chasing the old
  initiative roadmap.

### 0.2 Mark Deferred Workspace Plans As Not The Current Queue

Progress:

- [x] Done.

What the user or agent needs:

- No accidental revival of old workspace apply, verify, archive, branch,
  worktree, or dashboard plans.

What changed:

- The old workspace reimplementation artifacts were marked obsolete or pending
  deletion review.
- Useful research can still be copied forward later.

How we know it worked:

- The old workspace changes no longer look like the next thing to implement.

### 0.3 Reframe Local Agent Guidance Around OpenSpec Roots

Progress:

- [x] Done.

What the user or agent needs:

- Agent instructions that start with "where is the OpenSpec root?" instead of
  "which beta workspace/context-store mode is this?"

What changed:

- Local guidance was reframed around OpenSpec roots, artifact placement, and
  explicit implementation ownership.
- Beta shared-context guidance was described as old, non-default history.

How we know it worked:

- Agents are guided to inspect current files and commands, while avoiding
  promises about clone, sync, branch, worktree, dashboard, or edit-boundary
  behavior.

## Phase 1. Make A Standalone OpenSpec Repo Useful

The user-facing goal of this phase:

```text
I can keep OpenSpec work in its own Git repo and still use normal OpenSpec
commands.
```

Phase checklist:

- [x] **1.1** Create or register a standalone OpenSpec repo.
  Implemented in draft PR #1190.
- [ ] **1.2** Let normal commands use a named standalone OpenSpec repo.
  Implemented, tested, and review follow-up fixed on
  `codex/store-root-selection`; merge remains.
- [ ] **1.3** Prove the standalone repo lifecycle end to end.
  Spec and plan written 2026-06-11; implements on `codex/store-root-parity`
  on top of 1.1 and 1.2.
- [ ] **1.4** One guidance pass: stores in, initiatives out.
  Absorbs old item 2.2; gated on the context-store terminology decision;
  carries the deferred guidance debt from slice 1.2.

### 1.1 Create Or Register A Standalone OpenSpec Repo

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Implementation done in draft PR #1190.
- [x] Tests pass in draft PR #1190.
- [ ] Merged to `main`.

Slice: `slices/store-root-parity/spec.md`

What the user can do:

- Run `context-store setup` and get a normal OpenSpec root in a standalone repo.
- Clone a teammate's standalone OpenSpec repo and register it locally.
- Run `context-store doctor` and see whether the OpenSpec root is healthy.

Why it matters:

- A context store should not feel like a special beta planning system.
- It should be a normal OpenSpec root plus a small identity file.

What changes in commands or files:

- Setup creates or preserves this shape:

```text
context-store-root/
  .openspec-store/
    store.yaml
  openspec/
    config.yaml
    specs/
    changes/
      archive/
```

- Register requires an existing healthy OpenSpec root.
- Register can add `.openspec-store/store.yaml` only after confirmation.
- Doctor reports OpenSpec-root health separately from metadata and Git health.
- Setup/register do not create initiatives, workspace planning files, generated
  agent files, slash commands, or tool config.

How the user or agent knows it worked:

- `created_files` reports the exact files and folders created.
- Re-running setup/register for the same root reports nothing to change.
- `context-store doctor --json` includes a separate `openspec_root` section.
- Existing config, specs, changes, archived changes, and old beta files are not
  overwritten.

### 1.2 Let Normal Commands Use A Named Standalone OpenSpec Repo

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Plan reviewed with `claude -p`; actionable feedback folded into the
  slice artifacts.
- [x] Implementation done on `codex/store-root-selection` (stacked on
  `codex/store-root-parity`).
- [x] Tests pass.
- [x] Review follow-up fixed.
- [ ] Merged to `main`.

Slice: `slices/store-root-selection/spec.md`

Plain-English version of the next slice:

```text
When I am in an app repo, I can tell OpenSpec to create or read work in my
registered standalone OpenSpec repo.
```

Example user flow:

```bash
openspec new change add-billing --store team-context
openspec status --store team-context
openspec instructions apply --store team-context
```

What the user can do:

- Stay in the project repo they are working on.
- Pick a registered standalone OpenSpec repo by name.
- Create, inspect, validate, and archive normal OpenSpec work in that selected
  repo.

Why it matters:

- Without this, users can create/register a standalone OpenSpec repo, but normal
  commands still mostly act on the nearest local `openspec/` folder.
- The user should not need initiative links or workspace planning state just to
  put work in a standalone OpenSpec repo.

What changes in commands or files:

- Add `--store <id>` as the way to choose the OpenSpec root for normal
  commands.
- First command set: `new change`, `status`, `instructions`, `list`, `show`,
  `validate`, and `archive`, behind one shared root resolver.
- The selected command writes normal `openspec/changes/` and reads normal
  `openspec/specs/`.
- The command does not create initiative metadata.
- The command does not create workspace planning files.

Decisions locked on 2026-06-10 (details in the slice spec):

- `--store` is repurposed as root selection with exactly one meaning. Phase
  2.1 is pulled forward into this slice: `new change` stops creating
  initiative links, the old initiative meanings of `--store` and
  `--store-path` are removed, and `openspec set change` is removed because
  initiative linking was its only behavior.
- `--store <id>` (registry lookup) is the only selector. `--store-path` is
  deferred; registering a clone is the answer for path access.
- Leftover workspace view state never wins root resolution on this path. The
  workspace branch is demoted during this slice's resolver rework instead of
  waiting for Phase 2.3/5.1.
- When the current directory has no OpenSpec root and registered stores
  exist, commands error with a hint naming the registered stores instead of
  silently scaffolding a local root. With no registered stores, current
  behavior is unchanged.

How the user or agent knows it worked:

- Without `--store`, commands keep using the nearest/current OpenSpec root.
- With `--store team-context`, `openspec/changes/<id>` is created in the
  registered store root.
- JSON output shows which OpenSpec root was used.
- No new initiative link is created.

### 1.3 Prove The Standalone Repo Lifecycle End To End

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Smoke flow implemented.
- [x] Tests pass.
- [ ] Merged to `main`.

Slice: `slices/store-lifecycle-proof/spec.md`

Plain-English version:

```text
Show that a registered standalone OpenSpec repo can do the same basic lifecycle
as an OpenSpec root inside a project repo — including cloning it and continuing
the work from a second checkout.
```

What the user can do:

- Set up a standalone OpenSpec repo that is a real Git repo (initialized, with
  an initial commit) at a path they chose.
- Create, inspect, validate, and archive a change there from their project
  repo.
- Commit and push the store themselves, clone it on another machine, register
  the clone, and continue the work.
- Ask doctor whether the store repo has commits, uncommitted changes, or a
  remote.

Why it matters:

- This proves standalone OpenSpec repos are not just setup plumbing.
- The sharing path (clone, register, continue) is the reason standalone repos
  exist, and it is where the hands-on walk on 2026-06-11 found the real gaps.
- It catches missing command support before more features are built on top.

Decisions locked on 2026-06-11 (details in the slice spec):

- The proof is a two-checkout journey test in the existing CLI e2e harness,
  not a solo-machine smoke or a separate script harness.
- Setup finishes what it starts: Git on by default, an initial commit of
  exactly the files setup created, and a user-chosen location (`--path`
  required non-interactively; interactive runs prompt with a visible path
  suggestion). Tracked placeholder files keep otherwise-empty store
  directories alive in clones, and setup checks for a usable Git commit
  identity up front instead of failing mid-operation or inventing one.
- The Git line is create-time and read-only: setup may init and commit once;
  doctor reports commits/dirty/remote facts read-only; register never
  commits; nothing clones, pulls, pushes, branches, or syncs.
- The loop never drops the thread: selected-store hints carry `--store <id>`,
  the root banner prints on post-resolution failures, `new change` names the
  next command, and `status` drops the workspace-era "Planning home" line.
- Register errors become terminal instead of circular, with the
  one-checkout-per-id rule and `unregister` as the named escape hatch.
- `view` is explicitly out of this slice; opening things together is Phase 4.

What changes in commands or files:

- `context-store setup` Git and location defaults, plus sharing next-steps.
- Read-only Git facts in `context-store doctor` output.
- Reworked register error messages.
- Hint/banner continuity across the slice 1.2 command set.
- One chained two-checkout journey test covering setup/register, list,
  doctor, root selection, change creation, status, instructions, list/show,
  validate, and archive.

How the user or agent knows it worked:

- The journey passes against the built CLI with isolated global state,
  without using old initiative collections or workspace-owned planning state.
- A clone of a freshly set-up store is immediately a healthy OpenSpec root.
- The final files are normal `openspec/specs/`, `openspec/changes/`, and
  `openspec/changes/archive/` files in both checkouts.

### 1.4 One Guidance Pass: Stores In, Initiatives Out

This slice absorbed roadmap item 2.2 on 2026-06-11: teaching guidance that
stores exist and stopping the same surfaces from advertising initiatives and
workspaces are one job, and doing them separately would mean regenerating the
guidance twice.

Progress:

Slice: `slices/store-rename-and-guidance/spec.md`

- [x] Terminology decided (2026-06-11): the noun is **store**, defined
  everywhere as "a store — a standalone OpenSpec repo you've registered."
  Command group renames `context-store` → `store`; the `--store` flag stays;
  machine tokens rename in the same pass (`context_store_*` diagnostic codes
  → `store_*`, JSON `context_store` keys → `store`, data dir
  `context-stores/` → `stores/`); committed store-repo formats
  (`.openspec-store/store.yaml`, registry shape) stay. "Planning repo" and
  "contracts repo" are prose examples of what a store is for, never product
  nouns. "Context" is retired from this concept (freed for Phase 4).
  Runner-up considered and rejected: reusing the repo noun, because agents
  already hear that as the code checkout being operated on.
- [x] Spec written.
- [x] Plan written.
- [x] Implementation done (four checkpoints on `codex/store-root-parity`:
  mechanical rename, the two riders, guidance regeneration, guards and
  the dogfood proof; post-implementation review and simplify rounds
  folded).
- [x] Tests pass (full suite green, 95 files / 1745 tests; vocabulary
  sweep, format pins, and the headless dogfood transcript committed).
- [ ] Merged to `main`.

Plain-English version:

```text
An agent prompted in a project repo can discover the registered standalone
OpenSpec repo and use it without the human spelling out flags — and is no
longer steered toward initiatives or workspaces.
```

What the user can do:

- Prompt an agent with "create a change for X in our team store" and have the
  agent find the registered store and use `--store` on its own.
- Read top-level help and recognize the context-store commands as the
  standalone OpenSpec repo feature.
- Follow generated guidance without being pointed at `openspec initiative` or
  workspace flows as normal workflow steps.

Why it matters:

- Prompts are the primary interface. Slice 1.2 shipped `--store`, but
  generated agent guidance never mentions it, so the feature is invisible in
  the product's main surface.
- If guidance and completions keep advertising initiatives and workspaces,
  users and agents keep treating them as the product model.
- Phase 1 is not honestly done while agents cannot discover stores.

What changes in commands or files (surface inventory from 2026-06-11
research, about 13 surfaces):

- The `context-store` → `store` rename pass (group, machine tokens, data
  dir) lands first, before any guidance prose is written.
- Two renames riders: remove the second live meaning of `--store` (legacy
  `workspace open --store` still describes it as an initiative selector in
  the same completions metadata this slice regenerates), and add an
  unknown-subcommand hint under the `store` group for the inevitable
  `openspec store new change <id>` (pointing at
  `openspec new change <id> --store <id>`).
- CLI help one-liners for the `store`, `workspace`, and `initiative`
  command groups (`src/cli/index.ts`, command registration files).
- Completions metadata (`src/core/completions/command-registry.ts`,
  `shared-flags.ts`): present `--store` and store discovery; stop presenting
  initiative/workspace flows as normal steps.
- The seven generated workflow skill templates in
  `src/core/templates/workflows/` that still carry workspace-planning guards
  and initiative references.
- The checked-in `.codex/skills/use-openspec/` guidance, which still
  advertises `initiative list` and `workspace list` as inspection commands.
- Explicitly out of scope: `schemas/workspace-planning/templates/` (content
  of the legacy schema itself; Phase 5 decides its fate), and any command
  behavior changes.

How the user or agent knows it worked:

- A fresh agent session in a project repo with a registered store completes a
  store-scoped change from a single prompt, without hand-holding.
- Generated guidance names `--store`; help text matches the model being
  shipped; a fresh user is guided toward specs and changes, not initiatives.
- Existing initiative data remains untouched.

## Phase 2. Stop Putting New Work Through Initiatives

The user-facing goal of this phase:

```text
Normal OpenSpec work should not require an initiative.
```

Old initiative data can remain readable as legacy history, but the simpler path
should stop attaching new work to initiatives.

As of 2026-06-11 every item in this phase has been absorbed by another slice;
this phase carries no independent work. The sections below say where each item
went.

Phase checklist:

- [x] **2.1** Stop creating new initiative links in normal change flows.
  Pulled forward into slice 1.2 on 2026-06-10; implemented there.
- [x] **2.2** Hide or move initiative commands out of the main path.
  Folded into slice 1.4 on 2026-06-11 (one guidance pass).
- [x] **2.3** Make workspace opening stop depending on initiatives.
  Folded into roadmap item 4.1 on 2026-06-11 (opening is rebuilt there).

### 2.1 Stop Creating New Initiative Links In Normal Change Flows

This item was pulled forward into slice 1.2 (`slices/store-root-selection/`)
on 2026-06-10, because repurposing `--store` as root selection only works
cleanly if initiative-link creation stops in the same slice. Track progress
under 1.2.

Progress:

- [x] Folded into slice 1.2; see the 1.2 progress checklist.

What the user can do:

- Create normal changes without attaching them to an initiative.
- Still read old initiative metadata if it already exists.

Why it matters:

- Initiative links make the simple model harder to understand.
- They make users think the initiative system is required when it should not be
  the normal path.

What changes in commands or files:

- `new change` stops creating new initiative links as part of the main product
  path.
- `openspec set change` is removed because initiative linking was its only
  behavior.
- Existing `.openspec.yaml` initiative metadata remains parseable if needed.
- Store/root selection points to normal OpenSpec roots, not initiative
  collections.

How the user or agent knows it worked:

- New changes do not get initiative metadata by default.
- Old initiative-linked changes can still be displayed or handled as legacy.

### 2.2 Hide Or Move Initiative Commands Out Of The Main Path

This item was folded into slice 1.4 on 2026-06-11, because teaching guidance
that stores exist and stopping the same guidance surfaces from advertising
initiatives are one regeneration pass, not two. Track progress under 1.4.

Progress:

- [x] Folded into slice 1.4; see the 1.4 progress checklist.

### 2.3 Make Workspace Opening Stop Depending On Initiatives

This item was folded into roadmap item 4.1 on 2026-06-11. Research showed
initiative selection is hardcoded into roughly 5,500 lines of workspace
opening machinery (`WorkspaceContextState` is initiative-shaped at its core),
and 4.1 will rebuild opening around assembled context anyway — refactoring
the old path first would be wasted motion. Track progress under 4.1.

Progress:

- [x] Folded into roadmap item 4.1; see the 4.1 section.

## Phase 3. Say How Roots Relate: References

The user-facing goal of this phase:

```text
This project repo's work draws on these planning repos.
```

One declared relationship between roots:

- A project repo can **reference** the standalone OpenSpec repos its work
  draws on (PMs and architects keep high-level requirements and design in a
  store; devs create lower-level design and tasks in the app repo's own
  OpenSpec root, with the store as cited context).

Root resolution precedence is fixed and stated once: explicit `--store` wins,
then the nearest local `openspec/` root, then (only when no local root
exists) a declared default store, then today's error with a hint. A declared
store never overrides a local root, and references never change where commands
act.

The earlier code-repo relationship direction was removed on 2026-06-19 because
the mental model was unclear and the current workset UX solves the observed
"open planning plus code" need through explicit local composition.

Decisions locked on 2026-06-11:

- **Index, not inline (3.1).** Referenced-store content is never inlined
  into generated instructions; instructions carry an index (what specs
  exist, one-line summaries, the fetch recipe via `--store`) built live from
  the registered checkout at assembly time, and the agent fetches what it
  needs. Inlining would freeze upstream content at generation time — the
  copy-paste failure this effort exists to kill.
- **Declarations live in `openspec/config.yaml` (3.1, 3.2).** Both
  `references:` and the fallback `store:` pointer share one home. The
  fallback case is a config-only `openspec/` directory (no `specs/` or
  `changes/`): root detection keeps today's stat-only walk, two extra stats
  distinguish a real root from a pointer, and doctor warns when a root has
  both planning shape and a pointer (pointer ignored per precedence). A
  top-level marker file was rejected: `.openspec.yaml` is already taken as
  per-change metadata, and a dot-only filename collision is an agent hazard.
- **Relationships are location, declaration, or citation — never managed
  artifact links.** Where work lives is a relationship (`--store` is root
  selection, not a link); roots declare references once at the
  collection level; artifact-to-artifact derivation ("derives from
  team-context/billing") is prose citation that agents follow via the
  reference machinery. No per-change edge objects (see Rules We Should Not
  Forget).

Phase checklist:

- [ ] **3.1** Let a project repo reference the stores its work draws on.
  Spec and plan written and reviewed (`slices/store-references/`);
  implementation is next.
- [ ] **3.2** Fall back to a declared store when no local root exists.
- [ ] **3.3** Record a canonical remote in store identity.
- [x] **3.4 / 3.5 removed.** The code-repo relationship experiment was deleted
  before the beta behavior hardened.
- [ ] **3.6** Report relationship health for roots and references.

### 3.1 Let A Project Repo Reference The Stores Its Work Draws On

Slice: `slices/store-references/spec.md`

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Implementation done (config field, the index assembler with five
  warning codes and the shared 50KB budget, both instruction surfaces
  in both modes, docs subsection; three-mechanism post-implementation
  review and a simplify pass folded).
- [x] Tests pass (full suite green, 88 files / 1641 tests; unit,
  surface, and e2e layered-flow coverage).
- [ ] Merged to `main`.

Plain-English version:

```text
High-level requirements live in the team's planning repo. When I work in my
app repo, my agent reads them from there and cites them — without me naming
the store every session, and without my commands being redirected there.
```

What the user can do:

- Declare in the project repo's `openspec/config.yaml` (for example a
  `references:` list of store ids) which stores this repo's work draws on.
- Prompt an agent with "create a low-level design for billing" and have the
  agent pull the store's billing requirement into context and cite it, while
  writing the design in the app repo's own root.

Why it matters:

- This is the layered PM/architect-to-dev flow: upstream truth in the store,
  downstream work in the repo, connected by reference instead of redirection
  or copy-paste.
- A fresh agent discovers the relationship from config instead of being told
  every session.

What changes in commands or files:

- A reference declaration shape in project config (config parsing is already
  permissive; the existing `context:` injection in artifact instructions is
  the mechanism to reuse for referenced store specs).
- Instructions/context assembly includes relevant referenced-store specs.
- Root resolution is untouched: references are read-only context. Writing to
  a referenced store remains an explicit `--store` action and a separate
  change in that store.
- No per-change link objects (see Rules We Should Not Forget).

How the user or agent knows it worked:

- Artifact instructions generated in the app repo cite referenced store
  specs.
- An unresolvable reference (store not registered locally) is reported with a
  clear next step, not silently ignored.

### 3.2 Fall Back To A Declared Store When No Local Root Exists

Slice: `slices/declared-store-fallback/spec.md`

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Implementation done (the resolver pointer branch with source
  `declared`, the store-selected predicate across all eight consumers,
  the init pointer guard with ancestor walk, the both-shapes warning;
  three-mechanism post-implementation review and a simplify pass
  folded).
- [x] Tests pass (full suite green, 89 files / 1656 tests; resolver
  unit matrix plus the externalized-planning e2e journey).
- [ ] Merged to `main`.

What the user can do:

- In a repo whose planning is fully externalized (no local `openspec/`),
  declare the store once and run normal commands without `--store` on every
  invocation.

Why it matters:

- Slice 1.2 made `--store` the way to reach a root you are not standing in;
  for people who are never standing in one, repeating it on every command is
  a tax. The declaration records intent that agents otherwise rediscover each
  session.

What changes in commands or files:

- A default-store declaration honored only when no local root exists
  (fallback, never override), per the precedence rule above.
- The no-root error/hint from slice 1.2 remains for repos with no declaration.

How the user or agent knows it worked:

- With a local root present, behavior is byte-identical with or without the
  declaration.
- Without a local root, commands resolve to the declared store and report it
  through the existing root banner and JSON root block.

### 3.3 Record A Canonical Remote In Store Identity

Slice: `slices/store-canonical-remote/spec.md`

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Implementation done (the optional `remote` in store.yaml via
  `setup --remote`; observed origins recorded machine-locally at
  setup/register with rerun-safe refresh reporting; doctor and sharing
  surfaces; `{id, remote}` reference declarations with shell-safe
  verbatim clone fixes; three-mechanism review and a simplify pass
  folded).
- [x] Tests pass (full suite green, 90 files / 1678 tests; the e2e
  onboarding journey executes the printed fix verbatim).
- [ ] Merged to `main`.

What the user can do:

- Clone an app repo that references a store they do not have yet, and be told
  where to clone the store from.

Why it matters:

- References and teammate onboarding both dead-end today at "register the
  store" — nothing records where a store can be cloned from. The registry
  already supports an optional remote but nothing populates it, and the
  shared `store.yaml` identity has no remote field at all.

What changes in commands or files:

- Optional canonical remote in `.openspec-store/store.yaml` (the shared,
  committed home), populated at setup/register when known.
- Doctor surfaces it; unresolved-reference and register guidance use it
  ("clone from <remote>, then register").
- Recording a remote is not sync: no clone, pull, push, or branch behavior.

How the user or agent knows it worked:

- A registered store's remote is visible in doctor output.
- Guidance for an unregistered referenced store names the clone source.

### 3.4 / 3.5 Removed: Code-Repo Relationship Experiment

The dedicated experiment slices were deleted on 2026-06-19.

Progress:

- [x] Original experiments implemented.
- [x] Removed on 2026-06-19 before they became expected user behavior.

Why it matters:

- The abstraction asked users to maintain a committed declaration plus a
  machine-local map before the product had a crisp scenario for it.
- Real dogfood opened the planning store plus code repo with manual workset
  members, which solves the current user need without a second relationship
  model.

What changes in commands or files:

- Remove the old command group, registry section, config/metadata parsing,
  instruction/doctor/context output, and related diagnostics/tests.
- Keep a small note that multi-repo coordination may need a future design once
  the user model is clearer.

How the user or agent knows it worked:

- `openspec --help`, instructions, doctor, context, docs, and the agent
  contract no longer teach or emit code-repo declaration/map fields.

### 3.6 Report Relationship Health

Slice: `slices/relationship-health/spec.md`

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Implementation done (the root-scoped `openspec doctor` — pure
  composition over the Phase 3 assemblers; every recorded deferral
  landed; health-mode assembler options; the torn-snapshot
  readRegistrySnapshot invariant; three-mechanism review and a
  simplify pass folded).
- [x] Tests pass (full suite green, 96 files / 1739 tests).
- [ ] Merged to `main`.

What the user can do:

- Ask OpenSpec whether the roots this work relates to — referenced stores and
  the resolved OpenSpec root — are available on the current machine.

Why it matters:

- Agents need to know whether they can read the referenced context and
  trust the resolved OpenSpec root.
- This should be diagnostic only; it should not clone or sync anything.

What changes in commands or files:

- Doctor output reports root, store, and reference health.
- The report clearly separates OpenSpec root health, store metadata health,
  reference health, and top-level relationship warnings.

How the user or agent knows it worked:

- Unresolvable references are easy to see.
- The output does not attempt clone, pull, push, sync, branch, or worktree
  behavior.

## Phase 4. Assemble The Working Context

The user-facing goal of this phase:

```text
Give me — or my agent — everything this work relates to in one working set:
the OpenSpec root and the stores it references.
```

Phase checklist:

- [x] **4.1** Assemble the working context from declared relationships.
  (Merge to `main` pending.)

### 4.1 Assemble The Working Context From Declared Relationships

This item absorbed roadmap item 2.3 on 2026-06-11: the old workspace opening
machinery has initiative selection hardcoded into its state model across
roughly 5,500 lines, and this slice rebuilds opening around assembled
context, so de-initiative-ing the old path first would be wasted motion.

Slice: `slices/assemble-working-context/spec.md`

Progress:

- [x] Spec written.
- [x] Plan written.
- [x] Implementation done (CP1 deleted the workspace machinery —
  27 files, −2,196 lines; CP2 added `openspec context` with the JSON
  agent brief, human listing, and `--code-workspace` emitter;
  three-mechanism review and a simplify pass folded).
- [x] Tests pass (checkpoint suite green; current PR head is green at
  97 files / 1,761 tests).
- [ ] Merged to `main`.

What the user can do:

- From any root, get the full working set its declarations describe: the
  OpenSpec root itself and its referenced stores.
- Consume that set as an editor view (for example a code-workspace file) or
  as an agent session brief — opening in an editor is one consumer of
  assembly, not the feature itself.

Why it matters:

- Users need the plan and its upstream context together; code folders are added
  explicitly through personal worksets.
- Assembly is a local convenience computed from Phase 3's declared
  relationships, not a new planning system; the primary interface is an agent
  session, so the assembled set must be agent-consumable, not only
  editor-shaped.

What changes in commands or files:

- Replace or rebuild workspace opening around assembled context (this is
  where old item 2.3's initiative decoupling actually happens).
- Use the selected OpenSpec root as the durable planning source of truth and
  reference declarations for upstream stores.
- Do not create workspace-owned planning state.

How the user or agent knows it worked:

- The assembled set contains the OpenSpec root and resolvable referenced
  stores, with unresolvable references reported, not guessed.
- Assembly does not create or require initiative planning state.
- The durable files remain normal OpenSpec artifacts.
- The result does not imply clone, pull, push, sync, branch, worktree,
  dashboard, or edit-boundary enforcement.

## Phase 5. Remove Old Surfaces Only When They Confuse The Simple Path

The user-facing goal of this phase:

```text
Remove or hide old beta surfaces only when they make the simple path harder to
use or understand.
```

Phase checklist:

- [x] **5.1** Remove or hide old workspace and initiative paths when they block or
  confuse the simple path. (Merge to `main` pending.)

### 5.1 Remove Or Hide Old Workspace And Initiative Paths

Progress:

- [x] Criteria agreed (2026-06-11): **delete, don't hide — sequenced.**
  With zero users, hiding keeps every cost (rot, grep noise, refactors
  routing around dead code) and adds a hidden/visible distinction to
  protect nobody. Sequence: guidance surfaces die in slice 1.4 (planned),
  the `workspace` and `initiative` command groups become their own small
  deletion slice soon after 1.4, and the workspace **state model** plus
  the `workspace-planning` mode die when 4.1 replaces opening
  (zero-consumer opening helpers go with the command groups — keeping
  unreachable files would be hiding, which these criteria reject; wording
  narrowed 2026-06-11 during the deletion-slice spec, recorded as a
  reviewable autonomous decision). The inviolable carve-out stays: never
  auto-delete user data files. "Hide now, delete later" is rejected
  because later never comes.
- [x] Cleanup plan written (first tranche: the command-group deletion
  slice, `slices/delete-legacy-command-groups/`; spec and plan both
  through two adversarial review rounds).
- [x] Cleanup done. First tranche complete 2026-06-11: the `workspace`
  and `initiative` command groups and everything only they consumed are
  deleted (−12,903 net lines), with the deletion ledger committed. The
  remainder executed 2026-06-11 after 4.1
  (`slices/delete-legacy-command-groups/remainder.md`):
  `schemas/workspace-planning/` deleted (it was still advertised by
  `openspec schemas`); the four `workspace-*` beta change folders
  deleted (unimplemented relics — archiving would assert completion);
  L2 decided — the four wholly-workspace accepted specs deleted
  (capability gone = spec gone), the workspace requirements excised
  from `cli-config` and `cli-artifact-workflow` (bounded, not a
  rewrite), incidental mentions elsewhere recorded for the capstone
  vocabulary audit.
- [x] Tests or review checks pass. First tranche green (85 files, 1,616
  tests; three-mechanism review, no open P1/P2). Remainder green at its
  checkpoint; current PR head is green at 97 files / 1,761 tests and all
  36 accepted specs validate.
- [ ] Merged to `main`.

What the user can do:

- Follow the simple OpenSpec root path without being distracted by obsolete beta
  workflows.

Why it matters:

- Cleanup is useful only when it reduces confusion or removes a blocker.
- It should not become a broad compatibility project or docs rewrite.

What changes in commands or files:

- Obsolete no-delta workspace changes can be deleted, archived, or moved out of
  the active queue.
- Workspace-planning and initiative-collection code, docs, specs, and generated
  guidance can be removed or moved out of the main path where they mislead
  users or agents.
- Existing user data is not deleted automatically.

How the user or agent knows it worked:

- The active roadmap and generated guidance point to the simple path.
- Old surfaces no longer look like required workflow.

## Phase 6. Prove The Whole, Ready For First Users

The user-facing goal of this phase:

```text
A person with zero context can start using this today: every persona
journey works cold, every error leads somewhere, and the codebase ended
leaner than it started.
```

Phase checklist:

- [ ] **6.1** Final acceptance capstone.

### 6.1 Final Acceptance Capstone

The slices prove themselves; this proves the product — the sum of all
phases, reviewed and exercised as one thing. Full checklist in
`runbook.md` ("Final acceptance capstone").

Progress:

- [x] Persona journeys pass (fresh team, layered PM-to-dev, externalized
  planning, cold-start agent with no insider knowledge). Results:
  `capstone/journeys.md` — journeys 1–3 as standing e2e
  (store-lifecycle + capstone-journeys test files), journey 4 as a
  live headless codex dogfood that assembled the store/pointer flow from
  `--help` alone.
- [x] Usability audits done (error catalog, vocabulary sweep including
  `docs/cli.md`, time-to-first-success documented). Results:
  `capstone/usability-audits.md` — 55 wrong turns walked (46 pass; the
  9 failures are queued for the capstone fix round before the report);
  vocabulary clean except one legacy initiative JSON passthrough
  (queued); TTFS measured live at 2 commands / 2 concepts with every
  step printing the next command.
- [x] Technical audits done (single-resolver invariant, dependency
  direction, dead code, module sizes, agent-contract inventory, net LOC
  delta reported). Results: `capstone/technical-audits.md` — both
  invariants HOLD with zero violations; dead code yields five P3s
  (queued) and no P2s; module sizes bounded (largest 1,196 lines); the
  agent contract is documented in `docs/agent-contract.md` (every JSON
  shape + 100+ diagnostic codes verified against emitting code, 14
  consistency findings recorded, one gauntlet-grade); current PR-head
  src net LOC is **−3,189** vs origin/main.
- [x] Whole-delta review gauntlet over `origin/main...HEAD` passed with no
  open P1/P2 findings. Four mechanisms (`capstone/gauntlet.md`); the 2
  P1 + 13 P2 findings all fixed (37ad867) and live re-verified; full
  suite green (97 files, 1,761 tests); all 36 accepted specs validate.
- [x] Release-readiness report committed
  (`capstone/release-readiness.md`) — the five-minute story, all audit
  results, the autonomous-decision ledger, known gaps mapped to Later
  Ideas. No open P1/P2 findings.
- [ ] Merged to `main`.

Why it matters:

- Each slice was reviewed against its own base; nobody has reviewed or
  exercised the sum. Cross-slice inconsistencies, vocabulary drift, and
  cold-start failures live exactly there.
- "Could start using it straight away with no issues" is a product claim
  that checkboxes cannot make; only journeys and audits can.

How the user or agent knows it worked:

- All four journeys run green as tests or headless dogfoods.
- The release-readiness report reads as a credible first-user story, with
  known gaps mapped to Later Ideas rather than discovered by users.

## Phase 7. Keep And Open Personal Worksets

The user-facing goal of this phase:

```text
Let me keep my own named view of the folders I work on together, and
open them all with one command in the tool I choose.
```

Phase checklist:

- [ ] **7.1** Personal worksets: compose, keep, and open a local working
  view.

### 7.1 Personal Worksets: Compose, Keep, And Open A Local Working View

User-directed follow-up (owner design review, 2026-06-12; supersedes the
change-anchored direction in `workset-direction.md` where they differ). A
workset is a purely local, personal, named working view: the user composes
it manually (a planning root plus whatever folders they choose), keeps it
on their machine, reopens it by name, and launches it into their tool of
choice. It is not committed, not shared, not derived from declarations,
and never a membership truth — it makes no claims about the work, only
about what this user likes open together. A future multi-repo
coordination design may suggest members during composition, but there is
no code-repo relationship machinery in the current product path. `openspec
context` remains focused on OpenSpec roots and references.

Progress:

- [x] Research done and spec written.
- [x] Plan written.
- [x] Implementation done.
- [x] Tests pass.
- [x] Capstone dogfood passes (end-to-end UX run; transcript in the
  slice folder).
- [x] Branch pushed; code-review comments addressed.
- [ ] Merged to `main`.

What the user can do:

- Group the folders they work on together — a store checkout plus some
  repos — under a name, in one short guided flow, with nothing to set
  up beforehand.
- Reopen that grouping any time, by name, in their preferred tool, or
  a different tool for a single open.
- List and remove their saved views; nothing they do here touches any
  member folder or any shared state.

Why it matters:

- Multi-root work has a daily "get everything open again" cost; this
  removes it without reintroducing managed workspace state.
- Agent sessions launched from a workset get real access to every
  member (attach flags / sandbox roots), which a printed brief alone
  cannot grant.

What changes in commands or files:

- A new `workset` command group (compose/list/open/remove shapes to be
  settled in spec) and a machine-local saved-views file in the global
  data dir, following the registry's lock/atomic-write idiom.
- An opener table (built-ins: `code`, `cursor`, `claude`, `codex`)
  with user-extensible local config per the two-style pattern in FR2.
- No changes to `openspec context`, project config parsing, or any committed
  file format.

How the user or agent knows it worked:

- A first-time user composes and opens a view in under a minute, and
  the same name reopens it tomorrow.
- An agent opened from a workset can read and edit every member folder
  without asking where things are.
- Deleting all workset state loses nothing the user cannot recompose
  in a minute; no member folder ever contains workset residue.

Decisions locked (2026-06-12, owner-directed):

- Local-only, manual composition; never committed, shared, or derived.
- **No starter prompt on agent opens** — reusing a grouping implies
  nothing about intent; sessions open clean with directories attached.
- Tools-as-config via exactly two launch styles (`workspace-file`,
  `attach-dirs`); no per-tool code paths.
- No `--print`/dry-run mode; fallback info lives in the failure path.
- Desktop apps unsupported until they expose a real launch interface.
- The retired noun "workspace" stays retired; the feature noun is
  "workset".

Research needed before the spec (the slice's first checkpoint):

- Saved-views file shape and exact location; name validation rules.
- Opener config: file location, schema, override/merge semantics with
  built-ins; verify the `cursor` CLI shim's `.code-workspace` handling.
- Terminal-handoff details for agent opens (signal handling, exit-code
  propagation, `--json` interplay) — crib from `f858c19^` mechanics:
  cross-spawn, stdio inherit, shell false, PATH/PATHEXT availability.
- Compose-flow prompt design against the house `@inquirer` idiom.

Functional requirements (user perspective):

**FR1 — Compose and keep a personal working view.**

1. When a user regularly works across a planning repo and some code
   repos together, they can compose that grouping by pointing at
   folders, name it, and have it kept — one short guided flow, nothing
   to set up beforehand.
2. The composition is entirely the user's choice: any folders, any
   number, no requirement that they relate to declarations, teammates,
   or anything else.
3. The saved view is private to the user's machine — never committed,
   never shared, never written into any member folder.
4. Listing views shows each name with its members at a glance.
5. Removing a view deletes only the saved view, never a member folder.

```gherkin
Scenario: First working view in under a minute
  Given a user works on a store plus web-app and api-server together
  When they create a workset, point at the three folders, and name it
  Then it is saved on their machine and offered to open immediately
  And nothing was created or changed inside any member folder

Scenario: Composition is personal
  Given a teammate works on the same store with different repos
  When each composes their own workset
  Then neither sees, affects, or needs the other's

Scenario: Removing a view is safe
  When a user deletes a workset
  Then only the saved view is gone; member folders are untouched
```

**FR2 — Open the view in your tool.**

1. Opening a workset launches the chosen tool with every member
   attached and accessible. The open kind is stated plainly: editors
   (VS Code, Cursor) open a window and return; CLI agents (Claude
   Code, codex) take over this terminal as a session that ends when
   they exit.
2. Only tools actually installed are offered; the preference saved at
   composition is overridable per open without changing it.
3. Supporting a new tool is configuration, not code. Every tool is an
   instance of one of two launch styles — `workspace-file` (invoke
   with the generated `.code-workspace`) or `attach-dirs` (executable
   + optional pre-args + one attach flag per member; no prompt is
   passed — agent sessions open clean) — and users can add tools or
   adjust parameters (command, attach flag) in local config, so a tool
   renaming its flag is a one-line local fix. (The git
   difftool/mergetool pattern.)
4. When a tool cannot be driven (desktop apps, for now) or a launch
   fails, the user is shown the generated workspace file and the
   member folders so they can open manually — never a bare error.
   (Considered and dropped: a `--print` dry-run flag; the fallback
   information lives in the failure path instead.)
5. A member folder missing at open time is skipped with a one-line
   note; the rest of the view opens.

Built-in opener table at v1: `code`, `cursor` (workspace-file style);
`claude`, `codex` (attach-dirs style; codex carries
`--sandbox workspace-write` pre-args). Availability via PATH scan.

```gherkin
Scenario: Editor open returns, agent open takes over
  When the user opens "platform" in VS Code
  Then a window opens with all members and the prompt returns
  When the user opens "platform" in Claude Code
  Then a Claude session starts in this terminal with every member
       granted as a working directory, no prompt pre-filled, and ends
       when they exit it

Scenario: Adding a new editor without a release
  Given the user adds `zed: { style: workspace-file }` to local config
  When they open a workset in zed
  Then it launches with the generated workspace file

Scenario: Flag drift is a local fix
  Given a CLI agent renamed its attach flag
  When the user overrides that tool's attach_flag in local config
  Then opens work again immediately

Scenario: Launch failure never strands
  When a launch fails or the tool has no launch interface
  Then the user sees the workspace file path and member folders to
       open manually
```

Evidence base: the deleted `workspace` feature's guided setup, opener
availability sorting, graceful missing-path skips, and per-tool launch
recipes were its good bones (recoverable at `f858c19^`; launch
mechanics: cross-spawn, stdio inherit for agent handoff, shell false,
PATH/PATHEXT availability scan); its registry indirection, managed
directories, initiative binding, skills state, and repair subcommands
are explicitly not inherited. Current code provides the
`.code-workspace` builder (pure), the XDG storage idiom, and the
prompt library.

## Later Ideas

Keep these out of the main queue until the simpler standalone OpenSpec repo path
is working:

- **L1** Rewrite public concept docs after behavior is solid.
- **L2** Decide how accepted workspace-planning specs should change once behavior has
  changed.
- **L3** Revisit richer multi-repo coordination only after real usage shows a
  clear user model.
- **L4** Consider first-class `work/` only after the baseline and standalone repo flow
  are solid.
- **L5** Revisit whether `changes/` should evolve into change-shaped work under
  `work/`.
- **L6** Add machine-readable `/work` metadata only after the manual shape proves
  useful.
- **L7** The keep-or-rename *decision* for `context-store` terminology moved
  into slice 1.4 on 2026-06-11 (guidance prose should not bake in a name we
  have not chosen, and renaming is free while there are no users). Only the
  execution of a rename, if chosen, may land here as its own slice.
- **L8** Review local `use-openspec` skill guidance and decide whether it should be an
  ignored local skill, generated artifact, checked-in source, or productized
  default.
- **L9** Fix small baseline quirks, such as JSON support for `openspec list --specs`,
  only if they matter to the simple standalone repo flow.
- **L10** Reintroduce initiative-like behavior only as a Git-native work type if it
  still proves useful later.
- **L11** Make archived changes browsable through commands (for example
  `list --archived`) if filesystem and Git history prove insufficient. The
  archive command's own confirmation line is the lifecycle's verification
  signal for now.

## Roadmap Change Log

- 2026-06-07: Started the active reorientation experiment under
  `openspec/work/` instead of continuing the context-store initiative roadmap.
- 2026-06-07: Renamed the active work from the abstract Git-native principle to
  the concrete context/workspace model simplification.
- 2026-06-08: Removed the experimental `/work` folder shape from the roadmap;
  it is the dogfood structure for this thinking, not a product slice.
- 2026-06-08: Preserved the old initiative reorientation item and expanded the
  framing cleanup into separate roadmap slices.
- 2026-06-08: Completed the old initiative reorientation pass by rewriting the
  opening sections of old initiative files as transition evidence and beta
  history.
- 2026-06-09: Marked old workspace reimplementation artifacts obsolete or
  pending deletion review.
- 2026-06-09: Reframed checked-in `use-openspec` guidance around OpenSpec roots
  and artifact placement instead of beta shared-context framing.
- 2026-06-09: Deferred public concept docs until the simplified model is more
  solid.
- 2026-06-09: Reordered the roadmap around standalone OpenSpec repos and local
  views.
- 2026-06-09: Added the store-root-parity slice spec.
- 2026-06-10: Rewrote this roadmap in user-facing language so each slice says
  what the user can do, why it matters, what changes, and how success is
  visible.
- 2026-06-10: Numbered phases, phase subitems, and later parking-lot ideas so
  progress can be tracked unambiguously.
- 2026-06-10: Settled the model question behind 1.2: the OpenSpec root is the
  planning home, a context store is registration/identity only, and workspace
  "planning home" is legacy beta language.
- 2026-06-10: Locked the 1.2 decisions and added the store-root-selection
  slice spec: repurpose `--store` as root selection and pull 2.1 forward,
  defer `--store-path`, demote leftover workspace state during the resolver
  rework, and replace the silent implicit-root scaffold with an error and
  hint when registered stores exist.
- 2026-06-11: Walked the standalone-store lifecycle by hand against the
  built CLI. The 1.1/1.2 command mechanics held up; the gaps were the
  sharing path (commitless setup repos, empty clones, circular register
  errors), guidance that drops the selected store, and leftover
  workspace-era output language.
- 2026-06-11: Locked the 1.3 decisions and added the store-lifecycle-proof
  slice spec: the proof is a two-checkout journey test; setup defaults to
  Git with an initial commit and an explicit path; doctor reports read-only
  Git facts; register errors become terminal; selected-store hints keep the
  store; `view` stays out until Phase 4.
- 2026-06-11: Added slice 1.4 for agent and help-surface store
  discoverability (the deferred guidance debt from slice 1.2) and parked
  archive browsability as L11.
- 2026-06-11: Folded review findings into the store-lifecycle-proof spec
  after reproducing the empty-clone failure against the built CLI: tracked
  placeholder files so clones keep empty store directories, an up-front Git
  identity check for setup, an explicit interactive location prompt, and an
  enumerated second-checkout journey that reads promoted specs instead of
  browsing the archive.
- 2026-06-11: Wrote the store-lifecycle-proof plan, grounded in a code map
  of the setup/doctor/register internals, the hint and banner sites, and
  the CLI e2e harness.
- 2026-06-11: Adopted a single working branch for the whole roadmap: all
  slices implement on `codex/store-root-parity` (PR #1190), stacked in
  order, with merge to `main` deferred until the work lands as a whole.
- 2026-06-11: Implemented slice 1.3 with the two-checkout journey test, then
  ran two adversarial subagent reviews and folded all findings: hint
  continuity extended to validate/show/archive/status-JSON next steps,
  Windows-safe journey assertions and telemetry isolation, index-preserving
  commit cleanup on failure, reruns no longer git-init registered stores,
  corrupt repos are no longer reported as commitless, and the machine-B
  journey now covers the full enumerated command set. Full suite green
  (93 files, 1729 tests).
- 2026-06-11: Folded a code-quality review round: setup's initial commit is
  now derived from the store shape rather than the rollback ledger, so
  converting an existing non-Git root produces a clonable repo (the commit
  carries config and specs, never unrelated beta files); identity-file
  creation is owned by setup alone, with registration verifying instead of
  writing; Git mechanics moved to `src/core/context-store/git.ts`; and the
  Git lifecycle tests split into `context-store-git.test.ts` with shared
  fixtures.
- 2026-06-11: Restructured the roadmap after a fresh-eyes review. The
  PM/architect-to-dev layering use case (high-level requirements in a store,
  implementation work in the app repo's own root) replaced the rejected
  "project-to-store binding" idea with declared relationships between roots:
  references never change where commands act, and root resolution precedence
  is fixed (explicit `--store`, then nearest local root, then a declared
  default only when no local root exists, then error with hint).
- 2026-06-11: Merged old item 2.2 into slice 1.4 (one guidance pass over the
  ~13 surfaces inventoried by research) and gated 1.4 on the context-store
  terminology decision promoted from L7. Folded old item 2.3 into item 4.1
  (initiative selection is hardcoded into ~5,500 lines of opening machinery
  that 4.1 rebuilds). Phase 2 now carries no independent work.
- 2026-06-11: Rewrote Phase 3 around relationships: references first (3.1 repo
  references stores, 3.2 declared-store fallback, 3.3 canonical remote in store
  identity), then relationship health. Reframed Phase 4 as context assembly, with editor
  opening as one consumer and an agent session brief as another. Added two
  guardrails: references are repo-level config, never per-change lifecycle
  links, and one change lives in one root. Updated goal.md with the layered
  reference experience.
- 2026-06-11: Added Phase 6 (final acceptance capstone) and standing
  quality bars to the runbook: the autonomous run cannot declare completion
  on ticked boxes alone — four persona journeys (including a cold-start
  agent with no insider knowledge), usability audits (error catalog,
  vocabulary sweep, time-to-first-success), technical audits
  (single-resolver invariant, dependency direction, dead code, module
  sizes, agent-contract inventory, net LOC delta), a whole-delta review
  gauntlet over `origin/main...HEAD`, and a committed release-readiness
  report.
- 2026-06-11: Locked the open decisions after parallel product-level and
  staff-engineer analyses. Naming: the noun is "store" with the
  `context-store` → `store` group rename and machine-token rename landing
  first in slice 1.4 (`--store` stays; the repo noun was rejected for code
  checkout ambiguity). Phase 3: index-not-inline injection,
  declarations in `openspec/config.yaml`, one typed id namespace, and the
  relationship altitude rule (location, declaration, or citation — never
  managed per-artifact links, which is what initiative links were). Phase 5
  criteria agreed: delete rather than hide, sequenced across 1.4, a small
  command-group deletion slice, and 4.1. Loop operating rules approved:
  full slice discipline with adversarial subagent reviews plus codex CLI
  reviews, stopping at undecided items, Phase 5 entry, and merges.
- 2026-06-11: Folded plan-review findings into the slice after checking
  them against the code: `store.yaml` must be written before setup's
  initial commit (today it is written during registration, after Git
  init), the commit must be pathspec-limited to preserve the user's
  staged index, the identity preflight uses `git var` so env-var identity
  counts, converted roots get placeholders at first accept while doctor
  warns on clone-fragile empty directories in older stores, and the
  journey's `created_files` assertion runs setup in JSON mode.
- 2026-06-11: Wrote the store-rename-and-guidance slice spec (1.4) and
  folded two parallel adversarial review rounds (subagent:
  approve-with-fixes; codex CLI: reject). Both converged on the same flaw
  — exempting the legacy initiative/workspace groups from the token
  rename contradicted the locked machine-token decision, left
  paste-broken hints, and kept a second live `--store` meaning — so the
  spec now states one rule: the token rename is total and mechanical
  everywhere (codes, JSON keys, dotted diagnostic fields, hints, docs — legacy
  groups included), the prose rewrite is surgical (enumerated guidance
  surfaces only), and behavior changes are exactly the two riders. Also
  folded: the corrected token inventory (45 codes pinned by sweep, plus
  the dotted `context_store.*` target family), the missed guidance
  surfaces (`artifact-placement.md`, `docs/workspaces-beta/`), the three
  out-of-guard workspace-prose mentions in templates, a sweep-as-test
  acceptance criterion, and a concrete delivery mechanism for the dogfood
  proof (`openspec init` in the scratch repo).
- 2026-06-11: Decided autonomously (review me): the `context-store` group
  gets no back-compat alias and the old `context-stores/` data dir is not
  migrated — zero users on the unmerged branch, and 5.1 locked
  delete-don't-hide.
- 2026-06-11: Decided autonomously (review me): internal identifiers
  rename with the product noun (`src/core/context-store/` →
  `src/core/store/`, `ContextStore*` → `Store*`, command/test/helper
  files follow) — one concept, one token in the codebase; compiler-checked
  and free with no users.
- 2026-06-11: Decided autonomously (review me): the legacy `initiative`
  and `workspace` groups get token substitution and legacy-labeled
  one-liners only, never restructuring; initiative's `--store`/
  `--store-path` selectors keep behavior under reworded descriptions as a
  named, expiring inconsistency that the next slice deletes with the
  group.
- 2026-06-11: Decided autonomously (review me): workflow-template
  workspace guards stay (they quote the live `actionContext.mode:
  "workspace-planning"` contract, reachable until 4.1, and refuse rather
  than advertise); the three out-of-guard workspace-prose mentions
  reword. Ground truth correction: five templates carry guards, zero
  reference initiatives (roadmap had said seven with initiative refs).
- 2026-06-11: Decided autonomously (review me): docs get a mechanical
  accuracy pass in 1.4 (`docs/cli.md` store section, removed
  `workspace open` selector rows, stale default-XDG-path fix, token
  renames in `docs/workspaces-beta/`) so no doc instructs a dead command;
  deleting the beta docs belongs to the Phase 5 remainder and the L1
  rewrite stays deferred.
- 2026-06-11: Decided autonomously (review me): checked-in beta guidance
  is cut, not updated — `shared-context-beta.md` deleted, `SKILL.md`
  rewritten around store discovery, `artifact-placement.md` loses its
  beta-flow routing — per the locked 5.1 sequencing that guidance
  surfaces die in 1.4.
- 2026-06-11: Decided autonomously (review me): the dead
  `getDefaultContextStoreRoot` export (orphaned when 1.3 made `--path`
  required) is deleted in the rename pass, not renamed; and the
  over-600-line modules the rename touches (`operations.ts`,
  `commands/context-store.ts`) are not split in this slice because the
  Phase 5 deletions and 4.1 rebuild are about to shrink them (recorded
  module-size reason per the runbook bar).
- 2026-06-11: Decided autonomously (review me): discovered during 1.4
  implementation that `.codex/` is git-ignored (`.gitignore:158`) — the
  use-openspec guidance the roadmap called "checked-in" is actually the
  L8 ignored-local-skill. Its store-discovery rewrite (beta reference
  deleted, SKILL.md and artifact-placement reworked) lands on disk for
  local agents but cannot appear in commits; L8 keeps ownership of the
  final disposition (ignored local skill vs generated vs checked-in).
- 2026-06-11: Wrote the delete-legacy-command-groups slice spec (the
  Phase 5 command-group deletion) and folded two parallel adversarial
  reviews (subagent: reject, three P1s; codex CLI: reject, one P1) —
  every finding verified against code and folded: the `config` command's
  workspace-profile integration (which even executes `npx openspec
  workspace update`) is now in scope as the second included behavior
  change; `src/core/store/binding.ts` is kept (the planning-home
  carve-out depends on it through `workspace/foundation.ts`), with a
  recorded dead-export carve-out ledger owned by 4.1; partial test edits
  are named (`registry.test.ts`, `config-profile.test.ts`,
  `foundation.test.ts`); `docs/concepts.md` loses its whole Coordination
  Workspaces section; the "Use initiatives…" status constraint rewords
  to read-only compatibility language; 39 diagnostic codes pinned for
  the deletion ledger.
- 2026-06-11: Decided autonomously (review me): narrowed the locked 5.1
  sequencing wording — "opening machinery dies in 4.1" now reads "the
  workspace state model and workspace-planning mode die in 4.1". The
  zero-consumer opening helpers (`openers.ts`, `open-surface.ts`) are
  deleted with the command groups, because once `workspace open` is gone
  nothing can reach them and keeping them would be exactly the
  hidden-not-deleted state the locked criteria reject. 4.1 builds new
  assembly; it does not need the dead launchers.
- 2026-06-11: Decided autonomously (review me): orphan deletion is
  transitive in the command-group deletion slice — the five
  command-consumed core workspace modules, the whole
  `src/core/collections/` tree, the `config` command's
  workspace-profile integration, and the orphaned `path-env` test
  helper go with the groups; `docs/workspaces-beta/` and the cli.md /
  concepts.md legacy sections are deleted rather than updated
  (superseding the 1.4 decision that parked the beta docs for the
  Phase 5 remainder).
- 2026-06-11: Wrote the delete-legacy-command-groups plan (five
  deletion waves, one commit, grep-before-delete discipline) and folded
  two parallel plan reviews (subagent: approve-with-fixes; codex:
  reject) — all verified and folded: two acceptance scenarios had no
  implementing test (the planning-home mode pin — nothing in the suite
  asserts `actionContext.mode` today — and the docs pointer grep gate),
  `docs/cli.md` had dead-command references outside every cited range
  (agent-table rows 51-56, the Stores summary cell, config-section
  lines 1178/1180), the config map gained the interface and core-preset
  call sites (49-52, 523-524) with the full test ranges (134-172,
  422-516), the parity test's initiative carve-out removal is named as
  a deliberate fourth partial edit, and the spec's byte-stable clause
  now allows the new removal-coverage tests. The reworded constraint
  string gets its first-ever pin in the new test.
- 2026-06-11: Capstone (6.1) COMPLETE. The whole-delta gauntlet ran
  four mechanisms (/code-review at max effort with all 12 verified
  candidates confirmed, a 32-agent adversarial Workflow with six
  lenses and refute-style verification, a codex whole-delta review,
  and a completeness critic); the consolidated 2 P1 + 13 P2 findings
  were all fixed in one round (37ad867) and re-verified live - the
  highest-impact being the ~/openspec layout turning $HOME into a
  phantom nearest root (the walk now requires a qualifying openspec/),
  the --json failure contract (every failure path now emits exactly
  one status document), prompt-render sanitization of cloned content,
  and three store-lifecycle TOCTOU/ordering hazards. Decided
  autonomously (review me): planningHome was RESTORED to status JSON
  rather than rewriting eleven generated-skill references - it is a
  published agent contract, which reverses the planned
  PlanningHomeSummary dead-code collapse; store remove now commits the
  registry removal before deleting files. The release-readiness report
  is committed (capstone/release-readiness.md) with zero open P1/P2
  findings; every queue item's boxes are ticked except Merged to main,
  per the run's standing instruction.
- 2026-06-11: Capstone (6.1) technical audits done
  (`capstone/technical-audits.md`). Single-resolver invariant HOLDS
  (one precedence implementation; nine entry points through it; one
  latent unreachable fallback queued for deletion). Dependency
  direction HOLDS (zero core→commands/cli imports). Dead-code sweep:
  no P2s; five P3s queued (the unreachable apply fallback +
  resolveCurrentPlanningHomeSync, test-only resolveRegisteredStore
  with its stale --store-path fix text, the zero-consumer references
  barrel line, the PlanningHomeSummary identity wrapper, the parseJson
  test-helper x11); notes recorded (mkdir copies, the checkout-path
  prose convention, ext:: threat-model comment, sanctioned test-only
  exports). Module sizes bounded. docs/agent-contract.md committed:
  the full agent contract verified against emitting code with 14
  consistency findings — one gauntlet-grade P2 (several --json
  failure paths in validate/show/status/instructions print stderr
  only, no JSON document) queued for the gauntlet fix round; key-casing
  and envelope-unification findings recorded as known gaps (published
  JSON renames are product decisions). Current PR-head net LOC vs
  origin/main: src −3,189 (deletions outweigh the rebuild), test +956;
  gross insertions dominated by openspec/work planning artifacts.
- 2026-06-11: Capstone (6.1) usability audits done
  (`capstone/usability-audits.md`). The error-catalog walk covered 55
  wrong turns live (human + JSON): 46 pass against the
  actionable/store-carrying/honest bar; 9 fail (1 P1 - a raw
  YAMLParseError stack trace for unparseable configs on real roots;
  4 P2 - the corrupt-registry fix never names the file, instructions
  drops its Fix line, validate summaries offer no drill-down, and
  implicit-root scaffolding creates roots doctor calls unhealthy;
  4 P3). All queued for the capstone fix round - the report cannot
  commit with open P1/P2s. Vocabulary sweep: docs and src clean except
  ChangeStatus.initiative re-emitting stored legacy links on status
  JSON (queued; schema parse tolerance stays - user data). TTFS: 2
  commands, 2 concepts, measured live; every step prints the next
  command.
- 2026-06-11: Capstone (6.1) persona journeys all pass
  (`capstone/journeys.md`). Journeys 2 and 3 added as standing e2e
  (`test/cli-e2e/capstone-journeys.test.ts`): the layered flow
  (config-driven discovery, fetch-recipe citation, design in the app
  repo's own root, store read-only) and externalized planning (full
  lifecycle from a pointer repo, zero --store flags, no planning state
  growth). Journey 4 ran as a live cold-start dogfood: a fresh codex
  session with no insider knowledge built the store setup and pointer flow
  from --help output and generated guidance alone; later review removed the
  code-repo declaration/map portion of that experiment.
- 2026-06-11: Executed the Phase 5 remainder, closing out 5.1
  (decision record: `slices/delete-legacy-command-groups/
  remainder.md`). Deleted `schemas/workspace-planning/` (no src code
  named it after 4.1, but `openspec schemas` still ADVERTISED it — a
  shipped invitation into a dead workflow); deleted the four
  `workspace-*` beta change folders (unimplemented planning relics —
  archiving would have asserted completion); decided L2: the four
  wholly-workspace accepted specs (workspace-open,
  workspace-foundation, workspace-change-planning, workspace-links)
  deleted — an accepted-spec library that REQUIRES the impossible is
  worse than one with a gap — and the workspace requirements excised
  from cli-config (the profile-apply prompt flow) and
  cli-artifact-workflow (the setup-commands and schema-instructions
  requirements plus eight workspace-scoped scenarios), bounded
  deliberately short of the broad docs rewrite the roadmap forbids.
  Incidental workspace mentions in five other specs recorded as
  capstone vocabulary-audit input. All 36 remaining accepted specs
  validate; the current PR-head full suite is green at 1,761 tests.
- 2026-06-11: Implemented slice 4.1 in two checkpoints plus a
  review-fix round and a simplify pass, completing Phase 4. CP1
  executed the deletion ledger's carve-outs widened to whole-module
  deaths (src/core/workspace, store/binding.ts, getRepoPath, the
  policy cascade, the ten template guards with the parity test flipped
  to a no-residue assertion): 27 files, −2,196 lines. CP2 added
  `openspec context` — the JSON agent brief, the human working-set
  listing, and the --code-workspace emitter (available members only,
  typed context_file_exists refusal) — as presentation over the 3.6
  composition through a new shared command gather (doctor refactored
  onto it, behavior-identical). The review round (spec-compliance +
  /code-review + codex, no P1s) fixed the --json write-failure
  stdout contamination (the write now precedes the brief; exactly one
  JSON document), the self-reference honesty gap, the
  position-fragile registry-diagnostic coupling (now selected by
  code), dead policy params, leftover binding imports, and added the
  working-set unit matrix. Simplify extracted the shared stale-path
  sweep into shared-gather, deleted the dead Windows-path machinery
  and a stale workspace-kind test, and recorded the
  context_output_dir_missing plan amendment. Recorded for the
  capstone: the resolver's both-shapes stderr warning fires for every
  command (per-command suppression would fragment the one-resolver
  contract); PlanningHomeSummary is now field-identical to
  PlanningHome (deliberate JSON insulation or collapse — capstone
  judges); the npm export surface shrank (workspace/binding/
  getRepoPath gone from dist) — fine pre-release.
- 2026-06-11: Wrote the assemble-working-context plan (4.1, two
  checkpoints: deletions leaves-first, then assembly) and folded two
  plan reviews (both approve-with-fixes). The catch that mattered: the
  spec's own `code_workspace_exists` diagnostic name collides with the
  vocabulary sweep's `workspace_*` token ban — amended to
  `context_file_exists` (the `--code-workspace` flag is hyphen-safe).
  Also folded: the parity test's workspace-planning guard assertion
  flips to an absence assertion (it currently pins the guards EXIST);
  the change-status-policy tranche names `ChangeStatus.affectedAreas`
  and the artifact-graph barrel re-export; the doctor-extraction claim
  weakened to behavior-identical (the e2e asserts fields, not bytes);
  the unresolved-members-on-stderr e2e mapped; the sweep guardrail
  reworded to manual-grep honesty; stale hedges resolved (the
  workspace test files named; the binding tests are two its, not a
  block). Both reviewers verified the deletion order dependency-safe
  (planning-home drops its workspace import before workspace/ dies;
  binding dies after workspace/foundation) and every anchor accurate.
- 2026-06-11: Wrote the assemble-working-context slice spec (4.1) and
  folded two adversarial reviews (both approve-with-fixes, converging,
  one P1 pair). The deletion-grounding P1s: `binding.ts` dies WHOLE —
  5.1 kept it only because workspace/foundation imported it, so with
  workspace/ gone the entire ~300-line module (plus its registry.test
  binding tests and barrel line) would be exactly the hidden-not-
  deleted state the 5.1 criteria reject; and the five workflow-template
  workspace-planning guards that 5.1 explicitly deeded to 4.1 ("they
  quote the library contract that 4.1 deletes") are now in the
  deletion list with their parity-hash and .codex churn named. Also
  folded: the change-status-policy cascade enumerated
  (summarizeAffectedAreas et al.); the doctor/context shared data
  gather made mandatory with doctor-only inputs staying doctor-side
  (context recorded as deliberately silent on wrong turns); the
  member-mapping table pinned (available = path AND empty status;
  stale paths and invalid ids are not-available; registry-unreadable
  bare members); code-workspace write semantics pinned
  (code_workspace_exists + --force, no implicit mkdir, stderr
  confirmation under --json); `getRepoPath` deleted rather than
  re-hidden (its recorded consumers evaporated); fetchRecipe exported
  for one recipe source; the naming paragraph recorded (context vs
  view vs open; project-context disambiguation).
- 2026-06-11: Decided autonomously (review me): 4.1's surface is a new
  top-level `openspec context` (JSON agent brief / human listing /
  --code-workspace file emitter with --force); assembly is
  presentation over inspectRelationships through a shared command-layer
  gather; opening is REPLACED by emitted artifacts — no open verb, no
  editor launching; the deletions follow the ledger carve-outs widened
  to whole-module deaths where the keep-rationale collapsed.
- 2026-06-11: Implemented slice 3.6 (relationship health) in two
  checkpoints plus a review-fix round, completing the reference-health shape:
  health-mode reference indexing, pure `inspectRelationships` composition, and
  root-scoped `openspec doctor`. Later review removed the code-repo
  declaration/map health branch.
- 2026-06-11: Wrote and implemented the 3.4/3.5 code-repo
  declaration/map experiments. On 2026-06-19 product review concluded the
  model was premature; the command group, registry section, instruction
  output, doctor/context surfaces, tests, and dedicated slice files were
  deleted. Legacy registry data is tolerated only so old beta machines do not
  break on read.
- 2026-06-11: Implemented slice 3.3 (store canonical remote) in two
  checkpoints plus a review-fix round: the optional `remote` in
  `store.yaml` (strict schema retained; `setup --remote` writes it
  before the initial commit, refuses empty values and existing
  identity files); observed origins probed read-only into the
  machine-local registry at setup (both backend-resolution sites) and
  register, with rerun-safe reporting (a same-checkout origin backfill
  refreshes the entry but reports `already_registered`); doctor's
  `metadata.remote` + `git.origin_url`; the sharing chain canonical →
  observed → today's wording; `{id, remote}` reference declarations
  normalized with fill-if-absent dedup; and the unresolved-reference
  fix as a verbatim-pasteable absolute-path clone command. The review
  round caught and fixed: the nested-repo origin leak (git -C walks
  up — probes now guard with an at-root check), shell-quoting and
  flag/metacharacter injection in the rendered clone fix (shell-inert
  allowlist with teammate-wording fallback), the execute-phase TOCTOU
  on --remote, and the rerun-reporting break. Simplify extracted the
  duplicated hand-edit thrower and restructured registration around a
  normalized `sameCheckout` predicate (fixing a symlinked-path
  reporting edge). Capstone notes recorded: the `~/openspec/<id>`
  convention lives in one computed + five prose sites; the remote
  allowlist admits git's `ext::` transport (team-committed configs
  only — harden to recognized URL shapes if remotes ever arrive from
  less-trusted sources). Full suite green (90 files, 1678 tests).
- 2026-06-11: Wrote the store-canonical-remote plan (3.3, two
  checkpoints) and folded two plan reviews (both approve-with-fixes):
  the clone fix renders ABSOLUTE home paths (`~` never expands outside
  a shell and agent JSON consumers execute argv directly — the spec's
  `~/openspec/<id>` form is amended); setup's origin probe must reach
  BOTH backend-resolution sites (`prepareSetupPlan` and
  `setupPreparedStore`) or the rerun path re-introduces the erasure
  P1, and it stays at call sites rather than inside
  `resolveGitStoreBackendConfig` (hot read paths); the
  sharing-guidance mechanism is concrete (`StoreMutationResult` gains
  canonical/observed remotes, dropped from JSON, rendered by
  `printMutationHuman` canonical → observed → today's wording); the
  spec's setup-JSON contradiction resolved in favor of the unchanged
  `StoreOutput` shape; `getOriginUrl` trims probe output; the
  `--remote`-vs-existing refusal moves into `prepareStoreSetup` before
  any prompt or write; dedup pins the fill-if-absent duplicate case;
  registry persistence anchors corrected; TEST-NET fixtures use
  `git remote add`, never clone.
- 2026-06-11: Wrote the store-canonical-remote slice spec (3.3) and
  folded two adversarial reviews (subagent: approve-with-fixes with a
  P1; codex: reject — converging). The P1: a setup rerun would have
  silently erased the registry's observed remote because only register
  probed the origin while `storeBackendsMatch` compares remotes; the
  fix probes in both flows, preserving the 1.3 rerun-no-op contract.
  Also folded: register's contract restated precisely (never commits,
  never modifies an EXISTING store.yaml — the confirmed-conversion
  path still creates `{version, id}` identity, without a remote); the
  strict-schema compatibility claim corrected to its real one-way form
  (old CLIs reject remote-bearing store.yaml; recorded as a standing
  constraint that 3.4 must not add store.yaml fields without a version
  bump or strictness revisit); mixed-shape references dedup defined
  (normalize to `{id, remote?}[]`, dedup by id, first remote wins);
  the clone fix made pasteable verbatim via the `~/openspec/<id>`
  convention; `setup --remote` against an existing store.yaml fails
  with the hand-edit fix instead of silently ignoring the flag; the
  doctor UX example redrawn from the real layout; the no-network
  clause made testable (TEST-NET URL pin).
- 2026-06-11: Decided autonomously (review me): 3.3 keeps two remotes
  in two homes — team-authored canonical in committed `store.yaml`
  (written only by `setup --remote` or hand-editing), observed origin
  machine-local in the registry (probed read-only at setup/register,
  refreshed by re-register, live-probed for display; the persisted
  copy is 3.6 groundwork). The unresolved-reference clone source rides
  the reference declaration (`{id, remote}` map entries) because no
  local store state exists for an unregistered store. Resolved index
  entries gain no remote field; `StoreOutput` stays unchanged (doctor
  is the inspection surface); no new diagnostic codes.
- 2026-06-11: Implemented slice 3.2 (declared-store fallback) in two
  checkpoints plus a review-fix round: the `store:` pointer in
  `openspec/config.yaml`, the resolver classification (directory-typed
  shape stats; warning-silent pointer read; `invalid_store_pointer`
  with unparseable/non-string reasons; the declaration-origin rewrap;
  `source: "declared"`), the `isStoreSelectedRoot` predicate across
  all eight consumers, the both-shapes stderr warning, and the init
  pointer guard (refuses malformed pointers and pointer-repo
  subdirectories, anchored before any mutation). Three review
  mechanisms found one real regression — empty/comments-only configs
  briefly classified malformed, which would have stranded the
  documented comment-out conversion path — fixed with regression tests
  alongside the shared `classifyOpenSpecDir` (resolver and init can
  never disagree), the shared config probe, and the consolidated
  snapshot test helper. A simplify pass made the predicate a type
  guard and single-sourced the malformed-reason strings. Full suite
  green (89 files, 1656 tests); the e2e journey proves the full
  lifecycle in a pointer repo with no `--store` anywhere, composing
  with 3.1's references through the declared root. Process note: one
  review-fix commit landed on a detached HEAD (an agent moved HEAD
  during the fan-out) and was fast-forwarded back onto the branch.
- 2026-06-11: Wrote the declared-store-fallback plan (3.2, two
  checkpoints) and folded two plan reviews (both approve-with-fixes):
  an EIGHTH `source === 'store'` check surfaced
  (`show.ts:160` `printNonInteractiveHint`) — the spec's seven-site
  inventory is amended; the init guard moves to immediately after
  `validate()` (legacy cleanup and the global-config migration write
  run before `createDirectoryStructure`, so the original anchor would
  have violated "creates nothing"); the declaration-origin prefix is a
  call-site rewrap preserving codes and an unprefixed fix field (the
  template-prefix idea missed the `fromStoreError` pass-throughs); the
  targeted config read is a shared exported helper so init does not
  duplicate it; the test matrix gained all five prefixed taxonomy
  codes, the no-write malformed-pointer assertion, deterministic
  byte-identity commands, and positive assertions for the config-only
  no-pointer case.
- 2026-06-11: Wrote the declared-store-fallback slice spec (3.2) and
  folded two adversarial reviews (subagent: approve-with-fixes with a
  P1; codex: reject with two P1s — converging). The biggest catch: the
  spec's own UX example used a relative path while its core decision
  requires declared roots to behave exactly like `--store` roots; the
  fix is one store-selected predicate (`storeId` set) adopted by all
  seven `source === 'store'` consumers (banner, hints, new-change
  display, status threading, validate/show suggestion suppression,
  archive's absolute cross-root paths). Also folded: `openspec init`
  refuses to scaffold a pointer directory (conversion requires
  removing the `store:` line first); malformed pointers fail with
  `invalid_store_pointer` instead of silently flipping the write
  target; pointer resolution is one hop; the resolver's config read is
  warning-silent; the two shape stats require directories; the
  declaration-origin error is a true prefix via a `declaredOrigin`
  parameter on the shared pipeline (no fork).
- 2026-06-11: Decided autonomously (review me): amended the locked 3.2
  wording "doctor warns when a root has both planning shape and a
  pointer" — no project-level doctor command exists, so the warning
  lives in resolution stderr (once per invocation, both modes), and
  3.6 owns the structured health surface. Also decided: a config-only
  directory with no `store:` key keeps today's root behavior (freshly
  initialized minimal roots keep working); hint continuity appends
  `--store <id>` for declared roots so pasted hints work from any cwd.
- 2026-06-11: Implemented slice 3.1 (store references) in two
  checkpoints plus a review-fix round: `references:` in
  `openspec/config.yaml` (raw-string parsing), the
  `src/core/references.ts` assembler (one registry read, the narrow
  `inspectRegisteredStore` extraction shared with `resolveStoreRoot`,
  fence-aware first-Purpose-line summaries, five warning codes, the
  50KB budget shared with the context cap and measured against the
  real rendering in UTF-8 bytes), and the index wired into both
  instruction surfaces in both modes with an omitted-not-empty JSON
  contract. Three post-implementation review mechanisms found no P1s;
  the six converged findings (fence-poisoned summaries, the
  empty-vs-omitted contract, the orphan truncation fix line, budget
  under-counting, corrupt-registry branch ordering, a throwing
  inspection path) were fixed with regression tests, and a simplify
  pass consolidated the new test fixtures into
  `test/helpers/openspec-fixtures.ts`, deleted a dead defensive
  wrapper, and single-sourced the 50KB cap. Full suite green
  (88 files, 1641 tests); the e2e layered-flow test proves the
  PM-to-dev journey against the built binary including the verbatim
  fetch.
- 2026-06-11: Wrote the store-references plan (3.1, two checkpoints)
  and folded two parallel plan reviews (both approve-with-fixes): pure
  renderers live in core beside the assembler so the 50KB budget
  measures the real output (truncation stops before the cap with the
  warning line exempt); the `inspectRegisteredStore` extraction cut is
  pinned narrow (metadata/health stages only — registry lookup stays in
  `resolveStoreRoot`, whose seven error codes stay byte-identical);
  config is read once in the command layer and suppresses the
  generator's internal read; the Purpose-line scanner is self-contained
  (the markdown parser's section methods are protected); and the test
  matrix gained the symmetric `--store`, boundary byte-identity,
  no-recursion, nothing-frozen, and not-inlined assertions.
- 2026-06-11: Wrote the store-references slice spec (3.1) and folded
  two adversarial review rounds (subagent: approve-with-fixes with two
  grounding P1s — `parseSpec()` throws on imperfect specs so summaries
  extract tolerantly, and the apply human surface exists so the index
  lives in both surfaces and both modes; codex: approve-with-fixes —
  the assembler is async at the command boundary and passed into the
  sync generators, the rendered index shares the 50KB context budget
  with order-preserving truncation, and registry corruption degrades
  to `reference_registry_unreadable`). Decided autonomously (review
  me): five warning diagnostic codes (unresolved/invalid-id/
  root-unhealthy/registry-unreadable/index-truncated) that degrade
  instructions instead of failing them; the parse-raw/
  validate-in-assembler split; the one-level no-recursion rule;
  symmetric declarations (the resolved root's config, store or repo);
  self-references silently omitted; summaries from the first Purpose
  line with bare-id rendering when absent; zero-spec stores index as
  empty entries; no workflow-template changes; the docs home is a new
  "Referencing stores from a project" subsection in docs/cli.md.
- 2026-06-11: Implemented the delete-legacy-command-groups slice (the
  Phase 5 first tranche) in one commit: the `workspace` and `initiative`
  command groups, the five orphaned core workspace modules, the whole
  collections tree, the completions entries, the config command's
  workspace-profile integration, the update command's workspace
  detection, and every doc that documented only them — net **−12,903
  lines** (+324/−13,227), with seven new removal-coverage tests, a
  sweep pin on the surviving token allowlist, and `deletion-ledger.md`
  (41 removed diagnostic codes; dead-export carve-outs owned by 4.1).
  Side benefit: every CLI invocation loads ~25 fewer modules. Three
  post-implementation review mechanisms found no P1s; all P2/P3 fixes
  and a simplify pass landed (dead helper deleted, redundant fixtures
  removed, byte-identity test hardened with directory markers and an
  asserted update spawn, project-apply accept path regained coverage).
  Full suite green (85 files, 1616 tests).
- 2026-06-11: Decided autonomously (review me): ground truth uncovered
  during the deletion — `actionContext.mode: "workspace-planning"` has
  been **unreachable from the CLI since slice 1.2**, whose resolver
  rework routes every supported command through `toPlanningHome`
  (hardcoded `kind: 'repo'`). The deletion spec's planning-home scenario
  was corrected to pin the byte-stable `repo-local` CLI behavior plus
  the library contract (`buildActionContext` unit pin); the template
  guards stay as text quoting a contract that only the library can
  still produce, and 4.1 deletes both. Also recorded: the accepted spec
  library (`openspec/specs/cli-config`, `workspace-*`,
  `cli-artifact-workflow`) still REQUIREs deleted behavior — that is
  parked Later Idea L2, surfaced in the deletion ledger as a capstone
  known-gap.
- 2026-06-11: Implemented slice 1.4 in four green checkpoints on
  `codex/store-root-parity`: (1) the total mechanical rename — command
  group `context-store` → `store`, 45 diagnostic codes, dotted diagnostic
  fields,
  JSON keys, data dir `stores/`, internal modules and symbols, every
  help/error/hint string; (2) the two riders — `workspace open` lost its
  legacy store selectors (persisted path-bound views still reopen), and
  the store group gained an unknown-subcommand hint that owns the
  Commander error path; (3) guidance regeneration via a three-stream
  fan-out — store-selection teaching in all workflow templates, docs
  accuracy pass (cli.md, concepts.md, workspaces-beta with `--path`
  correctness fixes, all invocations smoke-run), legacy-beta labels;
  (4) guards and proof — vocabulary sweep-as-test, committed-format
  pins, old-data-dir negative fixtures, `--store` description equality,
  telemetry path, and the headless dogfood (one plain prompt → agent
  discovered the store via `--help` + `store list` and created the
  change with `--store`; transcript committed). Post-implementation
  review ran three parallel mechanisms (spec-compliance: compliant, all
  16 scenarios pass; /code-review high: 10 verified findings; codex CLI:
  approve-with-fixes); both P2s fixed (the hint builder's invalid
  suggestions; guidance over-claiming the flag surface and reaching the
  storeless feedback workflow) plus the cheap P3s, then a simplify pass
  made the presence guards registry-driven and tied the guidance's
  taught command list to the live flag surface. Full suite green
  (95 files, 1745 tests).
- 2026-06-11: Wrote the store-rename-and-guidance plan (four green
  checkpoints: mechanical rename, riders, guidance regeneration with a
  three-stream fan-out, sweep/guards/dogfood) and folded two parallel
  plan reviews (subagent and codex CLI, both approve-with-fixes): the
  rider-1 deletion list now names the unreachable guard branch and
  preserves persisted path-bound view state; rider 2 owns the whole
  Commander `command:*` error path; the docs pass gained
  `docs/concepts.md` and runtime-correctness fixes for beta-doc examples
  (`--path` since 1.3) plus a built-binary invocation smoke; the sweep's
  roots exclude the `openspec/` planning history by design; old-data-dir
  negative fixtures (valid and corrupt) and exact-equality
  `--store`-description tests were added; the dogfood pins
  `openspec init --tools claude --profile core`. Spec updated in the
  same round for docs scope and sweep-root consistency.
- 2026-06-12: User-directed (owner review of the 4.1 autonomous
  decisions; full direction in `workset-direction.md`): the 4.1 surface
  renames `openspec context` → `openspec workset`, anchored on the work
  item (`workset <change>`; bare form keeps the root union) with
  change-named `.code-workspace` files as the durable, reopenable views;
  a launch consumer joins scope because emitted paths do not cross agent
  sandbox boundaries (the working set must shape the session boundary —
  workspace file for IDE agents, boundary flags for CLI launch); the
  3.5 `repo` command group dissolves into a single plumbing command
  (`openspec map`), with point-of-need prompts and diagnostic fix
  strings as the primary fill paths and machine tokens kept as shipped;
  no workspace-style grouping registry returns. Grammar guardrails
  recorded: noun groups only for closed-set product objects, generic
  verbs for collections (no per-collection groups, ever), "workspace"
  permanently retired, lifecycle stays in skills/schemas. To be
  implemented as a follow-up slice under the standard discipline.
- 2026-06-12: Ran the 7.1 research checkpoint and committed
  `slices/personal-worksets/research.md`: the `f858c19^` opener
  archaeology (the implicit two-style split, the PATH/PATHEXT scan,
  cross-spawn handoff mechanics, the not-to-inherit ledger), the
  current-tree idioms (registry lock/atomic-write, the pure
  `.code-workspace` builder, `@inquirer` house rules, JSON contracts,
  the recoverable fake-executable test helpers), and live verification
  of all four built-in tools' flag spellings and hazards (the cursor
  shim's `agent` first-arg hijack; both agent CLIs read a positional
  as a starter prompt).
- 2026-06-12: Wrote the personal-worksets slice spec (7.1) and folded
  two adversarial reviews (subagent: approve-with-fixes, every
  citation verified; codex: reject — converging). The P1: the draft's
  attach-dirs argv skipped the primary member and leaned on `cwd`,
  contradicting the locked "one attach flag per member" — argv now
  carries an attach pair for every member (primary included,
  single-member shapes pinned). Also folded: the no-tool open path
  (interactive prompt / typed `workset_tool_required`), the
  stale-saved-tool rule (`tool` parses as a plain string; unknown ids
  surface at open with the manual fallback), the signal exit contract
  (`128 + n`, no banner), the hand-edit parse contract (absolute
  paths, non-empty members, label rules, duplicates), pinned JSON
  envelopes for all four subcommands including the `open --json`
  typed rejection and the `command:*` handler, derived-file lock
  semantics with ENOENT-tolerant remove, the teammate/arbitrary-
  composition scenario, the win32 availability matrix, and the
  opener-config touchpoints (hand-edit-only at v1; `config set`
  rejects unknown keys; malformed-config degradation recorded).
- 2026-06-12: Decided autonomously (review me): the 7.1 spec's open
  shapes — the group is `workset create/list/open/remove` (no edit at
  v1; recompose or hand-edit); saved views live in one machine-local
  `<dataDir>/worksets/worksets.yaml` on the store-registry idiom with
  the generated `<name>.code-workspace` files beside it, regenerated
  on every open (deleting `worksets/` removes every trace); workset
  names use the one kebab grammar in their own namespace; opener
  config is an `openers` key in global `config.json` (hand-edit-only
  at v1) merged over built-ins per-field; `open` carries no `--json`
  mode (typed one-document rejection instead — stdio-inherit handoff
  cannot compose with the JSON contract); child exit codes and
  signals propagate honestly (`code` / `128+n`, no banner);
  `writeFileAtomically` and the lock loop extract to a shared
  `src/core/file-state.ts` now that they have two call sites; agent
  guidance does not teach worksets at v1 (human convenience; template
  parity pins stay untouched).
- 2026-06-12: Ran the 7.1 capstone dogfood
  (`slices/personal-worksets/capstone-dogfood.md`). Scripted walk in a
  scratch env (isolated XDG, fake code/cursor/claude/codex on a
  controlled PATH, built CLI): compose→list→open for both styles with
  exact argv verified from the launch log — code got exactly the
  generated workspace file, claude/codex got one --add-dir pair per
  member with the primary included and codex's sandbox pre-args, no
  positional anywhere; the unknown-tool strand test printed the
  manual fallback; the missing-member skip, safe remove, and
  byte-untouched member folders all held. The interactive wizard ran
  from a real pty via expect (name → `.` default member → tool
  select → open-now declined → reopen line; a stdin-EOF run
  exercised Cancelled./130 live). Cold start: a fresh headless codex
  session with no insider knowledge — told only that "the openspec
  CLI can keep a named view of folders" — reached an opened workset
  from `--help` alone (group discovery, subcommand help, repeatable
  --member compose, open; launch log and saved yaml verified). No
  product findings; the one defect surfaced was in the dogfood's own
  first fake-tool shim. Full suite re-run green (101 files, 1799
  tests); capstone box ticked.
- 2026-06-12: Ran the 7.1 /simplify pass (four parallel cleanup
  agents: reuse, simplification, efficiency, altitude) and applied
  the converged fixes: the two textually-parallel lock-error
  factories collapsed into a data-parameterized
  `makeLockErrorFactory` in file-state (the altitude verdict — the
  fix strings document the lock's own stale-steal/creation behavior,
  so the templates belong with the mechanism; store shapes stay
  byte-identical under their pins); the hand-rolled group-option
  merge replaced by Commander's built-in `optsWithGlobals()`; the
  prompt module's preview-helper ladder flattened with one
  `assertKnownTool` spelling; `asErrorMessage` hoisted to
  shared-output (store's private copy deleted, `asStatus` reuses it);
  the member-row renderer deduped across list/fallback/remove-confirm
  (`formatMemberRows`); open's `availabilityVerified` flag replaced
  by per-branch opener resolution (deleting an unreachable branch and
  the prompt path's redundant PATH re-scan); `serializeWorksetsState`
  emits the schema-validated entries directly; a `toWorkset` helper
  deduped the entry conversion; remove's `--yes` path skips the
  duplicate pre-read; `KEBAB_ID_FIX` adopted at the two remaining
  literal sites; dead exports unexported; the pathIsDirectory-vs-
  FileSystemUtils choice documented in place. Skipped with notes:
  converging the store group's `command:*` fallback onto the
  group-action pattern (cross-slice; queued for the next store
  touch), threading the create→open table/scan hints (low value,
  adds coupling), and the predating change-metadata kebab literal.
  Full suite green (101 files, 1799 tests).
- 2026-06-12: Ran the 7.1 post-implementation review — three parallel
  mechanisms (spec-compliance agent: compliant-with-fixes, all locked
  decisions hold; /code-review at high effort via a seven-angle
  finder fan-out; codex 5.5 high: approve-with-fixes) — and fixed
  every converged P2 plus the cheap P3s in one round. No P1s
  anywhere. Behavioral fixes: the open fallback rule is structural
  (every post-regeneration failure except prompt cancellation carries
  "Open manually:" with the surviving members — the curated code set
  had already drifted past invalid_opener_config and
  workset_tool_required); the primary-reassignment note is printed;
  zero-installed-tools interactive opens say so instead of
  misreporting the table's first row; launch failures get a pasteable
  --tool alternative; Ctrl-C at the post-save open-now offer declines
  the offer instead of reporting a saved create as cancelled; the
  parent ignores SIGINT/SIGTERM while a launched tool runs (the 128+n
  contract was unreachable for tty Ctrl-C — the parent died first);
  synchronous spawn throws map to workset_launch_failed; the
  tool.cmd PATHEXT double-append is gone (the scan agrees with
  spawn-time resolution); the bare `workset --json` probe keeps the
  one-JSON-document contract via a group-level option + action
  handler; the shared lock's stat-failure path is deadline-bounded
  (was a pre-existing store busy-spin hazard); remove's derived-file
  cleanup now follows the durable write; flag members validate
  before the wizard spends the user's time; cross-spawn loads lazily
  (~6ms off every CLI invocation, measured). Structure: the command
  layer split into workset.ts / workset-prompts.ts / workset-input.ts
  (the 838-line module had crossed the lean bar); formatZodIssues,
  folderStyleNameProblem, KEBAB_ID_FIX, pathIsFile/pathIsDirectory/
  isNodeErrorCode each have one shared home; the prompt-cancellation
  branch lifted into emitFailure with store's private copy collapsed.
  Tests: the guided-flow success path, post-save-cancel, bare-group
  probes, the launch-failure (ENOEXEC garbage executable), corrupt
  open leg, and the win32 as-is matrix added; the in-process
  interactive tests pin a controlled PATH (they silently depended on
  the host's installed tools), and withPrependedPathEnv prefers the
  base env's PATH key (a win32 duplicate-key hazard). Spec amended in
  the same round (d2, d6, d8, d10-d14: the shipped contracts).
  Recorded for /simplify: the two lock-error factories are
  textually parallel (data-parameterizable); StoreError as the
  envelope class for non-store domains is an accepted altitude
  tradeoff (asStatus duck-types the envelope; a neutral
  DiagnosticError rename is capstone-scale, not slice-scale). Full
  suite green (101 files, 1799 tests).
- 2026-06-12: Implemented slice 7.1 in two checkpoints. CP1 (e8bf29b):
  `src/core/file-state.ts` extracts the lock/atomic-write mechanics
  from store foundation with caller-owned error factories (the store
  shapes pinned byte-identical by new tests — the suite had never
  covered the lock); `src/core/worksets.ts` (the saved-views file on
  the registry idiom, hand-edit parse contract, `withWorksetsLock`,
  the `.code-workspace` builder); `src/core/openers.ts` (the locked
  built-in table, per-field config merge, the PATH/PATHEXT scan with
  an injectable stat seam, the pure two-style argv builder). CP2
  (d6fb613): the `workset` command group (guided create, list, open
  with regenerate-before-tool-resolution and honest exit/signal
  propagation and the every-failure manual fallback, remove with
  lock-scoped ENOENT-tolerant derived cleanup), registration +
  completions, the docs/cli.md section, the resurrected fake-tool
  test machinery, 34 command tests, and the two e2e journeys
  (no-footprint with context/doctor byte-identity; two-machine
  teammate isolation). Full suite green (101 files, 1795 tests).
  Decided autonomously (review me): `workset_name_required` was added
  for non-interactive create without a name (the spec family had no
  missing-name code; mirrors `store_setup_id_required`); the
  `--no-interactive` flag is not declared (parity with the store
  group: the gate is `--json`/env/TTY); fake-tool tests pin a fully
  controlled PATH after a first run launched the machine's real
  cursor.
- 2026-06-12: Wrote the personal-worksets plan (7.1, two checkpoints:
  core storage/openers with the file-state extraction, then the
  command group with fakes-on-PATH tests) and folded two plan reviews
  (subagent: approve-with-fixes — "one of the cleanest code maps
  audited", three anchors drifted 2-3 lines; codex: reject —
  converging). The shared P1: the open flow checked tool availability
  BEFORE regenerating the `.code-workspace`, so the
  unknown/unavailable-tool fallback could name a nonexistent file —
  reordered to regenerate under the lock first, with the fallback
  test now asserting file existence and currency. Also folded: the
  false "foundation tests pin the extraction" claim corrected
  (nothing in the suite covers the lock/atomic mechanics — CP1 adds
  the two store busy-error byte-shape pins itself), the
  `withWorksetsLock` read-without-write primitive open needs, the
  real error-factory sites (`create-failed`/`timeout`; stale-steal is
  silent), the cross-spawn `createRequire` import shape (ESM package,
  no types), the Commander `--member` collector (repeated options
  keep only the last value by default), launch mechanics fake
  executables cannot reach moved to injectable-spawn units
  (SIGINT-130, spawn-error → `workset_launch_failed`), interactive
  cancellation covered in-process via a stubbed gate + mocked
  prompts with the remaining interactive-only lines enumerated to
  the capstone, the win32 fixture trap (injectable stat seam), the
  lock-release→spawn TOCTOU recorded as accepted, and the spec's
  d12 amended in the same round (`workset_create_cancelled` dropped —
  create has no abort-confirm, so the code had no firing site).
- 2026-06-12: Continued owner design review replaced the change-anchored
  workset direction with roadmap item 7.1 (briefly numbered 4.2 the
  same day; moved to its own Phase 7), personal worksets: a purely
  local, manually composed, named working view, opened via a two-style
  extensible opener table (`workspace-file` / `attach-dirs`); FR1
  (compose and keep) and FR2 (open in your tool) recorded with locked
  decisions — no starter prompt on agent opens, no `--print` mode,
  desktop apps deferred, "workspace" stays retired. The 7.1 section
  carries the research checklist; the runbook gained the 7.1 follow-up
  run invocation. `openspec context` is explicitly independent of 7.1.
- 2026-06-12: Closed the 7.1 pushed-branch box. The branch is pushed
  through the capstone commit. PR #1190 review-comment disposition:
  the two slice-touching comments that arrived mid-run were fixed and
  pushed by the run itself (the Windows-compatibility pass and the
  platform-aware clone-fix pin); the three remaining open inline
  comments predate the run and touch nothing in the slice (spinner
  early-return quick-wins in `workflow/instructions.ts` and
  `workflow/status.ts`, and a keyboard-accessibility note on the
  slice-1.2 decision-review HTML artifact) — parked for a cleanup
  pass rather than expanded into 7.1 scope. 7.1 is complete through
  every pre-merge box.
