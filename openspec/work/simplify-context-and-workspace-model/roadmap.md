# Simplify Context And Workspace Model Roadmap

This roadmap is a living internal path toward `goal.md`. It is expected to
change as slices reveal better sequencing, missing constraints, or simpler
product shape.

This is not public product framing yet. Keep it lightweight, avoid promising
future behavior before it exists, and prefer concrete implementation slices over
large documentation rewrites.

The core move is simple: take the old clean OpenSpec root model and let that
root live in a standalone Git repo. Views or workspaces may open that OpenSpec
repo together with target code repos, but they are not the source of truth.

## Current Focus

Use this lightweight `/work` experiment as a place to coordinate the
reorientation captured in `goal.md`. The old
`openspec/initiatives/context-store-and-initiatives/direction-git-native-work.md`
note is transition evidence that was distilled into this work's goal. The
folder shape itself is not a product roadmap item.

The roadmap order is now:

1. Make context-store setup/register produce a normal standalone OpenSpec root.
2. Make store selectors route core commands to the selected OpenSpec root.
3. Remove initiative coupling from the product path.
4. Add target repo mapping.
5. Turn workspace/opening behavior into a local view over the OpenSpec root and
   target repos.
6. Delete or demote detour residue only when it blocks the simple path.
7. Revisit public concepts only after the behavior is solid.

## Working Vocabulary

- OpenSpec root: the `openspec/` directory containing config, `specs/`, and
  `changes/`.
- In-project OpenSpec: the OpenSpec root lives inside the code repo.
- Standalone OpenSpec repo: the same OpenSpec root lives in its own Git repo.
- Context store: a named/registered standalone OpenSpec repo shell. It may use
  `.openspec-store` for identity or registry metadata, but `openspec/` is the
  planning source of truth.
- Target project repo: a code repo the work applies to.
- Local repo map: machine-local mapping from target repo ids to checkout paths.
- View/workspace: optional local way to open the OpenSpec repo plus target repos
  together. It is not durable planning state.

## Operating Guardrails

- Keep the old simple `openspec/specs/` and `openspec/changes/` lifecycle as
  the foundation.
- Treat a context store, when used, as a named/registered standalone OpenSpec
  repo, not as a separate planning state.
- Treat planning state as normal OpenSpec artifacts:
  `openspec/specs/` and `openspec/changes/`.
- Treat initiative collections and separate workspace planning state as
  wrong-direction residue, not compatibility requirements for the simplified
  model.
- Treat future initiative-like behavior as a possible type of work, not as a
  separate context-store collection for now.
- Treat `/work` as internal dogfooding, not a product requirement.
- Defer broad public docs and vocabulary cleanup until behavior exists; do not
  spend roadmap time making obsolete beta framing nicer.
- Do not imply clone, pull, push, sync, branch, worktree, dashboard, workspace
  apply, workspace verify, or workspace archive behavior.
- Change accepted specs alongside real behavior, not ahead of it.

## Phase 0: Authority Cleanup

### Reorient The Old Context-Store Initiative

Status: done

Outcome: Make it clear that
`openspec/initiatives/context-store-and-initiatives/` is beta history and
transition evidence, while this `/work` directory tracks the active
reorientation work.

Done when:

- The old initiative points readers to this work's `goal.md` and `roadmap.md`
  as the active direction.
- `direction-git-native-work.md` is described as the transition note that led
  to this goal, not as the current authority if the two conflict.
- The old `README.md`, `roadmap.md`, `tasks.md`, and `direction.md` make it
  clear that they preserve beta history and transition evidence.
- The old roadmap and task files are not treated as the next implementation
  queue.
- Useful decisions, work item notes, and beta evidence remain discoverable.

### Disposition Deferred Workspace Artifacts

Status: done

Outcome: Make active no-task workspace changes and historical workspace roadmap
artifacts impossible to mistake for the next implementation queue.

Done when:

- `workspace-reimplementation-roadmap`, `workspace-agent-guidance`,
  `workspace-apply-repo-slice`, and `workspace-verify-and-archive` are marked
  obsolete / pending deletion review.
- Deferred workspace apply, verify, archive, branch/worktree orchestration,
  strong cross-repo validation, and progress dashboards are not revived by
  accident.
- Any useful research remains available temporarily until unique evidence is
  promoted, linked, or deliberately discarded before deletion.

### Reframe Agent Operating Guidance

Status: done

Outcome: Make local agent guidance start from OpenSpec roots, artifact
placement, target project repos, and local repo mapping instead of a
context-store/workspace-first model.

Done when:

- Local `.codex/skills/use-openspec/SKILL.md` guidance routes agents through
  the current simplified model before beta shared-context flows.
- Local `artifact-placement.md` distinguishes in-project OpenSpec from
  standalone OpenSpec repos, then separately asks which target project repo owns
  implementation.
- Local `shared-context-beta.md` is framed as non-default beta/detour guidance,
  not the product model.
- Agent guidance still tells agents to inspect current CLI state and avoids
  promising clone, sync, branch, worktree, dashboard, or edit-boundary behavior.
- The final disposition of this ignored local guidance is reviewed later.

## Phase 1: Context Store As Standalone OpenSpec Repo

### Store Root Parity

Status: next, spec ready; plan pending

Slice: `slices/store-root-parity/spec.md`

Outcome: Make `context-store setup` and `context-store register` create or
validate the same OpenSpec root shape a user would get by creating a fresh Git
repo and running `openspec init`, while keeping context-store metadata as a
thin identity shell.

Research before implementation:

- Decide how to share the root-only `openspec init` behavior without also
  forcing agent/tool installation into context stores.
- Confirm the intended config behavior for non-interactive setup, because
  current `openspec init` has config-generation quirks in non-interactive mode.
- Decide whether `context-store register` should require an existing OpenSpec
  root, repair/ensure one, or support both modes explicitly.
- Decide how setup should treat non-empty folders such as a freshly initialized
  Git repo that only contains `.git/`.

Research decisions captured on 2026-06-09:

- `context-store setup` should reuse an extracted root-only init helper, not
  call full `InitCommand.execute()`. The helper should ensure `openspec/`,
  `openspec/specs/`, `openspec/changes/`, and
  `openspec/changes/archive/` without running tool detection, prompts, legacy
  cleanup, migration, skill generation, or command generation.
- `context-store setup` should always ensure `openspec/config.yaml` with the
  default schema when no config exists, including non-interactive and JSON
  flows. Do not inherit the current `openspec init --tools none`
  non-interactive config skip.
- `context-store register` should require an existing normal OpenSpec root by
  default. It may create or repair thin `.openspec-store/store.yaml` identity
  metadata, but it should not silently initialize arbitrary folders as OpenSpec
  roots. Add an explicit repair or ensure mode later if that behavior is needed.
- `context-store setup` should accept missing directories, empty directories,
  already initialized standalone OpenSpec roots, and fresh Git-only directories
  that contain only `.git/`. Existing beta context-store metadata may be
  normalized to the thin identity shape, but previous beta file shapes and
  command semantics are not a compatibility contract. Setup should keep
  rejecting arbitrary non-empty unmarked folders.
- `context-store doctor` should report OpenSpec-root health separately from
  context-store metadata and Git health. Root health should cover the
  `openspec/` directory, `openspec/config.yaml` or `openspec/config.yml`,
  `openspec/specs/`, `openspec/changes/`, and
  `openspec/changes/archive/`.
- Store setup/register/help output should point users toward normal OpenSpec
  specs and changes. Do not create initiative links, mount initiative
  collections, install generated agent files, or revive workspace-owned
  planning behavior in this slice.
- 2026-06-09 review note: Store Root Parity should protect user-authored files
  and idempotency, not preserve unstable beta context-store behavior.

Implementation notes captured on 2026-06-09:

- Add a shared core helper module for OpenSpec-root behavior, likely
  `src/core/openspec-root.ts`, instead of putting root creation in
  context-store code. It should own path helpers, root ensuring, root
  inspection, and healthy-root checks.
- Extract the directory/config scaffold from `InitCommand` into that helper.
  `InitCommand` should delegate root creation to the helper while keeping its
  existing onboarding responsibilities: prompts, legacy cleanup, migration,
  tool selection, skills, commands, profile handling, and success output.
- The helper should create a ledger of paths it created, including
  `openspec/config.yaml` and any directories needed for the root shape. Callers
  can use that ledger for `created_files` output and rollback.
- Use `planning-home.ts` for nearest-root discovery only. It already treats any
  ancestor with `openspec/` as a repo planning home, but it should not become the
  scaffolding or doctor module.
- `context-store setup` should call the helper after the store directory exists
  and before backend resolution or registry commit. If registration fails in a
  pre-existing folder, rollback should remove only ledger-created files and empty
  directories, never arbitrary user content.
- `context-store register` should validate the existing OpenSpec root with the
  helper's inspector before writing missing `.openspec-store/store.yaml` or
  committing registry state. Keep the lower-level `registerContextStore()`
  facade loose unless this slice intentionally makes root parity a global core
  invariant.
- `context-store doctor` should map the helper's inspector result into a
  separate `openspec_root` JSON/human section rather than calling cwd-oriented
  command classes such as list, show, or validate.
- Test the helper directly, then test context-store operations directly, then
  keep CLI tests focused on command output and JSON shape. Existing config
  parsing and `cli-init` specs should not change unless their user-facing
  behavior changes.

Done when:

- Existing context-store setup, register, list, doctor, path/Git, registry, and
  safe-delete behavior is reused or narrowed intentionally.
- `context-store setup` can produce `.openspec-store/store.yaml`, optional
  `.git/`, `openspec/config.yaml`, `openspec/specs/`,
  `openspec/changes/`, and `openspec/changes/archive/`.
- `context-store register` can handle an already initialized standalone
  OpenSpec repo without treating it as an initiative store.
- `.openspec-store/store.yaml` remains identity or registry metadata only, not
  the planning model.
- Context-store help and guidance point users toward normal OpenSpec specs and
  changes, not initiatives.
- `context-store doctor` reports OpenSpec root health separately from
  metadata/Git health.

### Store Selectors For Core Commands

Status: candidate, research first

Outcome: Let normal OpenSpec lifecycle commands operate on a selected OpenSpec
root, so a user in an app repo can create or inspect work in a standalone
context store without creating initiative links.

Research before implementation:

- Decide how to migrate `--store` and `--store-path`, since they currently mean
  "context store for `--initiative`" rather than "OpenSpec root selector."
- Decide the first command set for selector support instead of trying to touch
  every lifecycle command at once.
- Decide whether `--store-path` should require `.openspec-store/store.yaml` or
  also accept any normal standalone OpenSpec root.
- Decide how this interacts with current workspace planning homes before
  workspace/open is reworked into a view-only surface.

Done when:

- The default remains the nearest/current OpenSpec root when no selector is
  provided.
- `openspec new change <id> --store <store>` creates
  `openspec/changes/<id>` in the selected store/root, not in the current app
  repo and not as an initiative-linked change.
- Store selectors such as `--store` or `--store-path` reuse existing registry,
  binding, and path-canonicalization machinery where it is already useful.
- Multiple registered stores have clear list, doctor, and ambiguity behavior.
- The implementation still writes normal `openspec/changes/` and
  `openspec/specs/` artifacts.
- Existing initiative metadata remains readable as legacy, but this flow does
  not create new initiative metadata.

### Prove Store-Backed Lifecycle Smoke

Status: candidate

Outcome: Prove that a registered standalone store can run the same simple
OpenSpec lifecycle as an in-project root.

Done when:

- A clean store-backed standalone fixture or smoke flow exists.
- The smoke covers init, new change, status, instructions, list, show,
  validate, archive, and view where applicable.
- The smoke also covers context-store setup/register, list, doctor, and store
  selection.
- Known live-repo detour artifacts are not part of the pass/fail gate.

## Phase 2: Remove Initiative Coupling

### Freeze New Initiative Links

Status: candidate

Outcome: Stop adding new initiative coupling to normal change flows while
keeping old metadata readable as legacy when needed.

Done when:

- `new change` and `set change` no longer create new initiative links as part
  of the product path.
- Existing `.openspec.yaml` initiative metadata remains parseable if needed, but
  is treated as legacy/display-only.
- Context-store selectors route to OpenSpec roots instead of initiative
  collections.

### Remove Public Initiative Surfaces

Status: candidate

Outcome: Remove, hide, or clearly demote public initiative command surfaces so
they no longer look like the model.

Done when:

- `openspec initiative` is not presented as the product path.
- Completion metadata, generated guidance, and command docs stop advertising
  initiative flows as normal workflow steps.
- Existing initiative folders or metadata are not deleted automatically unless
  they are explicitly part of a cleanup slice.

### Decouple Workspace Open From Initiatives

Status: candidate

Outcome: Remove initiative attachment from workspace opening so opening becomes
a local view concern.

Done when:

- `workspace open --initiative` and related initiative picker behavior no longer
  define the opening model.
- Old workspace view files can fail gracefully or be read as legacy without
  resolving active initiative context.
- Workspace opening is ready to be replaced by opening a selected store/root
  plus target repos.

## Phase 3: Target Project Repo Resolution

### Define Target Project Repo Contract

Status: candidate

Outcome: Define how work or changes declare which project repos own
implementation.

Done when:

- Target repo ids have a simple, explicit shape.
- A target repo declaration is separate from the OpenSpec artifact root.
- The contract does not imply automatic cloning, syncing, branch management, or
  edit-boundary enforcement.

### Map Target Repos To Local Checkouts

Status: candidate

Outcome: Let local config map target repo ids to checkout paths.

Done when:

- A local repo map can resolve a declared target repo to a local checkout.
- Missing, duplicate, or invalid mappings fail clearly.
- The map is local configuration, not a shared state system.

### Report Target Repo Mapping Health

Status: candidate

Outcome: Surface whether declared target repos are available locally.

Done when:

- Doctor or status output reports missing target mappings clearly.
- The report distinguishes OpenSpec root health from target project checkout
  health.
- The output stays diagnostic and does not attempt clone, pull, push, branch,
  worktree, or sync behavior.

## Phase 4: Open View

### Open OpenSpec Root With Target Repos

Status: candidate

Outcome: Reuse or replace workspace opening machinery so a user can open a
selected context store or standalone OpenSpec repo together with its mapped
target code repos.

Done when:

- The selected context store/root remains the durable planning source of truth
  through normal `openspec/` artifacts.
- Target repos are opened from the local repo map.
- The view can generate editor/agent opening surfaces without creating a
  workspace planning home.
- The view does not imply clone, pull, push, sync, branch, worktree, dashboard,
  or edit-boundary enforcement.

## Phase 5: Residue Removal When It Blocks

### Delete Or Demote Detour Surfaces

Status: later

Outcome: Remove, hide, or demote workspace-planning and initiative-collection
surfaces when they confuse the simple path or block store-backed standalone
OpenSpec repos. This is not a compatibility preservation pass.

Done when:

- Obsolete no-delta workspace changes are deleted, archived, or otherwise kept
  out of the active implementation queue when they are no longer useful.
- Workspace-planning and initiative-collection code, docs, specs, and generated
  guidance are removed or demoted only where they mislead users/agents or
  constrain the new architecture.
- The cleanup does not become a broad docs rewrite or a compatibility support
  project.

## Later Candidates

- Revisit public concept docs only after the model and behavior are solid
  enough for public consumption. Until then, do not rewrite `docs/concepts.md`
  or expose detailed standalone OpenSpec repo, target repo, local repo map, or
  `/work` language as public product framing.
- Decide how and when accepted workspace-planning specs change once behavior
  changes; do not rewrite specs just to match future framing.
- Add richer cross-repo context and doctoring after standalone OpenSpec repos
  can target project repos.
- Evolve toward first-class `work/` only after the baseline and standalone repo
  flow are solid.
- Revisit whether existing `changes/` become change-shaped work under `work/`.
- Add machine-readable `/work` metadata only after the manual shape proves
  useful.
- Decide whether to keep, rename, or replace `context-store` terminology only
  after the bridge behavior proves useful; do not block Phase 1 on naming.
- Re-review the local `use-openspec` skill changes and decide how this guidance
  should really work: ignored local skill, generated artifact, checked-in source,
  or productized default guidance.
- Fix small baseline quirks, such as JSON support for `openspec list --specs`,
  only if they matter to the simple smoke path or standalone repo flow.
- Reintroduce initiative-like behavior only as a Git-native work type, if it
  still proves useful later.

## Roadmap Changes

- 2026-06-07: Started the active reorientation experiment under
  `openspec/work/` instead of continuing the context-store initiative roadmap.
- 2026-06-07: Renamed the active work from the abstract Git-native principle to
  the concrete context/workspace model simplification.
- 2026-06-08: Removed the experimental `/work` folder shape from the roadmap;
  it is the dogfood structure for this thinking, not a product slice.
- 2026-06-08: Preserved the old initiative reorientation item and expanded the
  full framing cleanup into separate roadmap slices for old authority,
  deferred artifacts, agent guidance, public docs, beta docs, CLI reference,
  and generated guidance.
- 2026-06-08: Completed the old initiative reorientation pass by rewriting the
  opening sections of the old README, roadmap, tasks, and direction files as
  transition evidence / beta history.
- 2026-06-09: Marked the workspace reimplementation roadmap,
  workspace-agent-guidance, workspace-apply-repo-slice, and
  workspace-verify-and-archive artifacts obsolete / pending deletion review.
- 2026-06-09: Reframed checked-in `use-openspec` guidance around OpenSpec
  roots, artifact placement, and target project repos instead of beta
  shared-context framing.
- 2026-06-09: Added a later review item for the `use-openspec` skill framing
  after noticing the edited `.codex/` skill is ignored local guidance.
- 2026-06-09: Deferred the public concepts reframe until the simplified model
  is more solid and implemented enough for public documentation.
- 2026-06-09: Reordered the roadmap around baseline, placement, standalone
  OpenSpec repos, and target repo mapping; moved docs and public framing cleanup
  to later phases.
- 2026-06-09: Reframed Phase 1 from preserving all current behavior to
  recovering the simple OpenSpec baseline, and replaced compatibility-docs work
  with as-needed residue removal.
- 2026-06-09: Collapsed baseline recovery and standalone placement into the
  first implementation phase: make a standalone OpenSpec root path work, then
  remove initiative coupling, add target repo mapping, and build open views as
  local convenience.
- 2026-06-09: Reframed Phase 1 around context store as the named/registered
  standalone OpenSpec repo bridge: reuse setup/register/list/doctor and store
  selectors, keep planning state in normal `openspec/`, and move initiative
  removal into its own product-path cleanup.
- 2026-06-09: Split Phase 1 into two research-gated slices: Store Root Parity
  for setup/register creating or validating a normal standalone OpenSpec root,
  and Store Selectors For Core Commands for routing lifecycle commands to a
  selected store/root without initiative links.
- 2026-06-09: Added the Store Root Parity slice spec and linked it from the
  roadmap.
