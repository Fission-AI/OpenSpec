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
4. Work can say which project repos it targets.
5. The local machine can map those target repos to local checkout paths.
6. An optional view can open the OpenSpec repo and target repos together.

The product should not require users or agents to understand initiatives,
workspace-owned planning, or collection state as the main model.

## Vocabulary For This Roadmap

- **OpenSpec root**: the `openspec/` folder with `config.yaml`, `specs/`, and
  `changes/`.
- **OpenSpec inside a project repo**: the `openspec/` folder lives inside the
  code repo.
- **Standalone OpenSpec repo**: the `openspec/` folder lives in its own Git
  repo.
- **Context store**: the current bridge name for a registered standalone
  OpenSpec repo. It has a thin `.openspec-store/store.yaml` identity file, but
  the real planning work still lives under `openspec/`.
- **Target project repo**: a code repo that the OpenSpec work is about.
- **Local repo map**: local machine settings that say where target project repos
  are checked out.
- **View**: a local convenience for opening the OpenSpec repo and project repos
  together. It is not the source of truth.

## Rules We Should Not Forget

- Keep the normal `openspec/specs/` and `openspec/changes/` lifecycle working.
- When context stores are used, treat them as standalone OpenSpec repos, not as
  a separate planning system.
- Do not create new initiative links in the simpler product path.
- Do not create workspace-owned planning state in the simpler product path.
- Do not promise clone, pull, push, sync, branch, worktree, dashboard, apply,
  verify, or archive orchestration in these slices.
- Treat old beta files as history unless they block the simpler path.
- Do not rewrite public docs before the behavior is solid.

## Progress At A Glance

Use this as the quick "where are we?" view.

Numbered labels are roadmap work item ids. Smaller `Progress` checkboxes inside
an item are status steps for that numbered work item.

- [x] **Phase 0. Make the active direction easy to find.**
  Old beta plans were marked as history, and this `/work` roadmap became the
  active direction.
- [ ] **Phase 1. Make a standalone OpenSpec repo useful.**
  One slice is implemented in draft PR #1190, but the full phase still needs
  normal commands to work against a named standalone repo.
- [ ] **Phase 2. Stop putting new work through initiatives.**
  Not started.
- [ ] **Phase 3. Say which project repos the work is about.**
  Not started.
- [ ] **Phase 4. Open the right files together.**
  Not started.
- [ ] **Phase 5. Remove old surfaces only when they confuse the simple path.**
  Later cleanup; not started.

Next incomplete item:

- [ ] **1.2 Let normal commands use a named standalone OpenSpec repo.**
  In plain English: when a user is in an app repo, they can tell OpenSpec to
  create or read work in a registered standalone OpenSpec repo.

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

- Local guidance was reframed around OpenSpec roots, artifact placement, target
  project repos, and local repo mapping.
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
  This is the next slice.
- [ ] **1.3** Prove the standalone repo lifecycle end to end.
  Do this after normal commands can use the selected repo.

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

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

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

- Add a clear way to choose the OpenSpec root for normal commands, likely
  `--store <id>` and/or `--store-path <path>`.
- Start with a small command set instead of every command at once.
- Suggested first commands:
  `new change`, `status`, `instructions`, `list`, `show`, `validate`, and
  `archive`.
- The selected command writes normal `openspec/changes/` and reads normal
  `openspec/specs/`.
- The command does not create initiative metadata.
- The command does not create workspace planning files.

Questions to answer before implementation:

- Should `--store-path` require `.openspec-store/store.yaml`, or can it point at
  any healthy standalone OpenSpec root?
- Which commands get support first?
- How should existing `--store` and `--store-path` meanings from initiative
  flows be handled?
- How should this behave when the current directory is already inside a
  workspace planning home?

How the user or agent knows it worked:

- Without `--store`, commands keep using the nearest/current OpenSpec root.
- With `--store team-context`, `openspec/changes/<id>` is created in the
  registered store root.
- JSON output shows which OpenSpec root was used.
- No new initiative link is created.

### 1.3 Prove The Standalone Repo Lifecycle End To End

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Smoke flow implemented.
- [ ] Tests pass.
- [ ] Merged to `main`.

Plain-English version:

```text
Show that a registered standalone OpenSpec repo can do the same basic lifecycle
as an OpenSpec root inside a project repo.
```

What the user can do:

- Set up or register a standalone OpenSpec repo.
- Create a change there.
- Inspect the change.
- Get instructions.
- Validate it.
- Archive it when done.

Why it matters:

- This proves standalone OpenSpec repos are not just setup plumbing.
- It catches missing command support before more features are built on top.

What changes in commands or files:

- Add a clean fixture or smoke flow for a registered standalone OpenSpec repo.
- Cover setup/register, list, doctor, root selection, change creation, status,
  instructions, list/show, validate, archive, and view where relevant.

How the user or agent knows it worked:

- The smoke passes without using old initiative collections or workspace-owned
  planning state.
- The final files are normal `openspec/specs/`, `openspec/changes/`, and
  `openspec/changes/archive/` files in the standalone repo.

## Phase 2. Stop Putting New Work Through Initiatives

The user-facing goal of this phase:

```text
Normal OpenSpec work should not require an initiative.
```

Old initiative data can remain readable as legacy history, but the simpler path
should stop attaching new work to initiatives.

Phase checklist:

- [ ] **2.1** Stop creating new initiative links in normal change flows.
- [ ] **2.2** Hide or move initiative commands out of the main path.
- [ ] **2.3** Make workspace opening stop depending on initiatives.

### 2.1 Stop Creating New Initiative Links In Normal Change Flows

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Create normal changes without attaching them to an initiative.
- Still read old initiative metadata if it already exists.

Why it matters:

- Initiative links make the simple model harder to understand.
- They make users think the initiative system is required when it should not be
  the normal path.

What changes in commands or files:

- `new change` and `set change` stop creating new initiative links as part of
  the main product path.
- Existing `.openspec.yaml` initiative metadata remains parseable if needed.
- Store/root selection points to normal OpenSpec roots, not initiative
  collections.

How the user or agent knows it worked:

- New changes do not get initiative metadata by default.
- Old initiative-linked changes can still be displayed or handled as legacy.

### 2.2 Hide Or Move Initiative Commands Out Of The Main Path

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Follow normal OpenSpec commands without being pointed toward
  `openspec initiative`.

Why it matters:

- If generated guidance and completions keep advertising initiatives, users and
  agents will keep treating them as the product model.

What changes in commands or files:

- Completion metadata, generated guidance, and command docs stop presenting
  initiative flows as normal workflow steps.
- Existing initiative folders are not deleted automatically.
- Any cleanup is explicit and separate.

How the user or agent knows it worked:

- A fresh user is guided toward specs and changes, not initiatives.
- Existing initiative data remains untouched unless an explicit cleanup slice
  says otherwise.

### 2.3 Make Workspace Opening Stop Depending On Initiatives

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Open useful local views without needing to choose an initiative first.

Why it matters:

- Opening files is a local convenience. It should not define where planning
  state lives.

What changes in commands or files:

- `workspace open --initiative` and initiative picker behavior no longer define
  the main opening model.
- Old workspace view files can be read as legacy or fail clearly.
- Opening prepares to use a selected OpenSpec root plus target repos instead.

How the user or agent knows it worked:

- Opening a view does not create or require initiative planning state.
- Errors explain local view problems separately from OpenSpec-root problems.

## Phase 3. Say Which Project Repos The Work Is About

The user-facing goal of this phase:

```text
This OpenSpec work lives here, and it targets these project repos.
```

Phase checklist:

- [ ] **3.1** Let work declare its target project repos.
- [ ] **3.2** Map target repo names to local checkout paths.
- [ ] **3.3** Report whether target repos are available locally.

### 3.1 Let Work Declare Its Target Project Repos

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Mark a change or work item as applying to one or more project repos.

Why it matters:

- A standalone OpenSpec repo is separate from the code repos.
- Users and agents need a simple way to know which code repos the work is about.

What changes in commands or files:

- Add a simple target repo declaration shape.
- Keep target repo declarations separate from the OpenSpec artifact root.
- Do not imply automatic clone, sync, branch, worktree, or edit-boundary
  enforcement.

How the user or agent knows it worked:

- A change can clearly say which project repo ids it targets.
- The declaration is visible in normal OpenSpec files or metadata.

### 3.2 Map Target Repo Names To Local Checkout Paths

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Tell OpenSpec where each target project repo lives on this machine.

Why it matters:

- Shared OpenSpec work can name a target repo, but each developer may have that
  repo checked out in a different local path.

What changes in commands or files:

- Add local machine settings that map target repo ids to local checkout paths.
- Keep the map local; it is not shared planning state.
- Missing, duplicate, or invalid mappings fail clearly.

How the user or agent knows it worked:

- Given a target repo id, OpenSpec can resolve the local checkout path.
- If the path is missing or ambiguous, the error tells the user what to fix.

### 3.3 Report Whether Target Repos Are Available Locally

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Ask OpenSpec whether the target project repos for this work are available on
  the current machine.

Why it matters:

- Agents need to know whether they can inspect or edit the relevant code repo.
- This should be diagnostic only; it should not clone or sync anything.

What changes in commands or files:

- Doctor or status output reports target repo mapping health.
- The report clearly separates OpenSpec root health, context-store metadata
  health, and target project checkout health.

How the user or agent knows it worked:

- Missing target repo mappings are easy to see.
- The output does not attempt clone, pull, push, sync, branch, or worktree
  behavior.

## Phase 4. Open The Right Files Together

The user-facing goal of this phase:

```text
Open my standalone OpenSpec repo and the project repos it targets in one useful
local view.
```

Phase checklist:

- [ ] **4.1** Open the OpenSpec repo and target repos together.

### 4.1 Open The OpenSpec Repo And Target Repos Together

Progress:

- [ ] Spec written.
- [ ] Plan written.
- [ ] Implementation done.
- [ ] Tests pass.
- [ ] Merged to `main`.

What the user can do:

- Open a selected standalone OpenSpec repo plus its mapped project repos in the
  editor or agent surface they use.

Why it matters:

- Users usually need both the plan and the code.
- Opening them together should be a local convenience, not a new planning
  system.

What changes in commands or files:

- Reuse or replace workspace opening machinery.
- Use the selected OpenSpec root as the durable planning source of truth.
- Use the local repo map to find project repo checkouts.
- Do not create workspace-owned planning state.

How the user or agent knows it worked:

- The opened view contains the OpenSpec repo and relevant target repos.
- The durable files remain normal OpenSpec artifacts.
- The view does not imply clone, pull, push, sync, branch, worktree, dashboard,
  or edit-boundary enforcement.

## Phase 5. Remove Old Surfaces Only When They Confuse The Simple Path

The user-facing goal of this phase:

```text
Remove or hide old beta surfaces only when they make the simple path harder to
use or understand.
```

Phase checklist:

- [ ] **5.1** Remove or hide old workspace and initiative paths when they block or
  confuse the simple path.

### 5.1 Remove Or Hide Old Workspace And Initiative Paths

Progress:

- [ ] Criteria agreed.
- [ ] Cleanup plan written.
- [ ] Cleanup done.
- [ ] Tests or review checks pass.
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

## Later Ideas

Keep these out of the main queue until the simpler standalone OpenSpec repo path
is working:

- **L1** Rewrite public concept docs after behavior is solid.
- **L2** Decide how accepted workspace-planning specs should change once behavior has
  changed.
- **L3** Add richer cross-repo context and doctoring after target repo mapping works.
- **L4** Consider first-class `work/` only after the baseline and standalone repo flow
  are solid.
- **L5** Revisit whether `changes/` should evolve into change-shaped work under
  `work/`.
- **L6** Add machine-readable `/work` metadata only after the manual shape proves
  useful.
- **L7** Decide whether to keep, rename, or replace `context-store` terminology after
  the bridge behavior proves useful.
- **L8** Review local `use-openspec` skill guidance and decide whether it should be an
  ignored local skill, generated artifact, checked-in source, or productized
  default.
- **L9** Fix small baseline quirks, such as JSON support for `openspec list --specs`,
  only if they matter to the simple standalone repo flow.
- **L10** Reintroduce initiative-like behavior only as a Git-native work type if it
  still proves useful later.

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
- 2026-06-09: Reframed checked-in `use-openspec` guidance around OpenSpec roots,
  artifact placement, and target project repos instead of beta shared-context
  framing.
- 2026-06-09: Deferred public concept docs until the simplified model is more
  solid.
- 2026-06-09: Reordered the roadmap around standalone OpenSpec repos, target
  repo mapping, and local views.
- 2026-06-09: Added the store-root-parity slice spec.
- 2026-06-10: Rewrote this roadmap in user-facing language so each slice says
  what the user can do, why it matters, what changes, and how success is
  visible.
- 2026-06-10: Numbered phases, phase subitems, and later parking-lot ideas so
  progress can be tracked unambiguously.
