# Context Store And Initiatives Decisions

## 2026-05-20: Track Roadmap Execution Inside The Initiative

Decision: Track initiative roadmap implementation inside
`openspec/initiatives/context-store-and-initiatives/` rather than creating an
OpenSpec change for each roadmap item.

Why: The initiative is the durable coordination object for this work. Repo-local
OpenSpec changes should be reserved for implementation slices owned by a repo or
team. Roadmap-item tracking belongs with the initiative until a task needs a
repo-owned implementation plan.

Implications:

- Use `tasks.md` as the initiative-wide progress dashboard.
- Use `work-items/<nn-slug>/` for detailed execution notes on one roadmap item.
- Link repo-local OpenSpec changes back to the initiative later when
  implementation moves into a repo-owned slice.

## 2026-05-20: Lock Workspace-To-Initiative Product Boundary

Decision: Workspaces are local working views, not durable shared planning
objects. Durable coordination belongs to context stores and initiatives. Repo
local changes own implementation.

Implications:

- Preserve workspace setup, link, relink, list, open, update, and doctor as
  beta local-view infrastructure.
- Treat workspace-planning behavior as beta or transitional compatibility.
- Defer workspace apply, verify, and archive until initiative-linked repo-local
  changes exist.

## 2026-05-21: Leave Specs Alone Until Behavior Changes

Decision: Do not use the initial direction lock to rewrite OpenSpec specs.
Specs should describe the current behavioral contract behind the code. The
initiative artifacts should carry product intent, roadmap decisions, and future
direction until a later implementation change deliberately updates behavior and
its specs together.

Implications:

- Initial Item 1 cleanup should focus on initiative docs, historical roadmap
  artifacts, active proposal disposition, and user-facing docs.
- Existing workspace-planning specs and schemas may continue to describe current
  implemented behavior.
- Future changes to specs should happen with the behavior they govern.

## 2026-05-21: Keep Deferred Workspace Changes As Reference Placeholders

Decision: Keep the active workspace changes for agent guidance, repo-slice
apply, verify/archive, and the reimplementation roadmap as deferred reference
placeholders.

Why: These areas are still expected to matter after context stores, initiatives,
and initiative-linked repo-local changes exist. Archiving or deleting them now
would lose useful research and continuity.

Implications:

- Do not pick them up as the immediate next implementation focus.
- Treat their current proposals as historical/deferred direction.
- Revisit and reframe them after initiative-linked repo-local changes define the
  durable handoff model.

## 2026-05-21: Generated Workspace Guidance Routes Work By Ownership

Decision: Generated workspace guidance should describe workspaces as local
working views and route durable work to the owning artifact: initiatives own
cross-team or cross-repo intent, repo-local OpenSpec changes own implementation
plans, and linked repos or folders own their implementation.

Why: The initiative direction supersedes the older model where a workspace-level
`changes/` tree owned the canonical shared cross-repo plan. New agent guidance
should not reinforce that old model.

Implications:

- Remove guidance that tells agents to use workspace-level `changes/` as the
  planning home for coordinated work.
- Keep legacy or beta workspace-planning files readable as compatibility
  context when present.
- Update generated workspace guidance before broad user-facing docs or specs.
- Leave specs untouched until the corresponding behavior intentionally changes.

## 2026-05-21: Workspace Action Context Is Local Compatibility Context

Decision: Workspace-planning action context should no longer describe
workspace-level artifacts as the source of truth. It should report
`sourceOfTruth: "workspace-local"` and describe workspace-local planning
artifacts as compatibility context for the current local view.

Why: Workspace-planning artifacts can still exist in the beta workflow, but the
initiative direction assigns durable coordination to initiatives and
implementation planning to repo-local changes.

Implications:

- Keep `actionContext.mode: "workspace-planning"` for compatibility.
- Keep `allowedEditRoots: []` until an explicit edit root is selected.
- Keep linked repos and folders as context, not implicit edit roots.
- Route durable coordination to initiatives when initiative context exists.

## 2026-05-21: Reorder Roadmap Around Agent-First Initiative Handoff

Decision: Treat initiatives as an agent-first workflow. Users should be able to
prompt an agent with intent like "using initiative X, explore Y and create a
proposal"; OpenSpec should provide small CLI primitives the agent can compose.

Why: The practical UX is not a human manually typing every coordination command.
Agents need reliable structured answers about where canonical initiative context
lives and how repo-local changes reference it. Local paths come from workspace
state, not from an initiative command.

Implications:

- Promote minimal context-store setup, registration, listing, and doctoring
  before workspace initiative opening.
- Add `initiative show --json` before broader progress/status concepts.
- Connect repo-local changes with checked-in initiative metadata, not checked-in
  snapshots of initiative prose.
- Do not add `initiative resolve`; workspace local-view state owns local path
  mapping.
- Teach workspace opening about initiatives after show and repo-change linkage
  semantics exist.

## 2026-05-26: Workspace Initiative Opening Uses Generated Runtime Files

Decision: Treat workspace initiative opening as a private local view record plus
generated runtime files. The workspace does not contain the work. It remembers
how this runtime opens the work.

Why: Initiative context is shared truth in the context store, repo-local changes
own implementation, and agent/editor affordances need to exist in the runtime
where the agent actually runs. Persisting generated files as workspace truth
would blur local view state with shared coordination and create stale or
privacy-sensitive artifacts.

Implications:

- Persist only tiny private local view choices: selected store, selected
  initiative, selected local links, opener, and selected tools.
- Preserve the selected context-store selector inside the private workspace
  record, so a runtime-local `--store-path` open can be reopened without writing
  machine-local paths into checked-in repo metadata.
- Generate agent guidance, skills, launch prompts, and editor workspace files as
  runtime support when opening or preparing a view.
- Open existing local paths only; do not clone, branch, create worktrees, use
  submodules, or infer local repos in Item 10.
- Treat generated runtime files as disposable and regenerable.
- Allow context-only initiative open; linked repos are optional local view
  choices.
- Keep edit boundaries advisory in Item 10 until enforcement is designed.

## 2026-05-26: Workspace Storage Is Keyed By Workspace Name

Decision: Store private workspace views under
`getGlobalDataDir()/workspaces/<workspace-name>/`. The workspace name is the
local identity. The selected context store and initiative, if any, live inside
one durable private `workspace.yaml` record.

Why: Workspaces are generic local views, not initiative-owned directories. A
user may want a custom workspace with linked repos and folders but no initiative,
or multiple personal workspaces over the same initiative. Keying storage by
store and initiative would overfit the filesystem layout to one workflow.

Implications:

- Keep initiative references optional inside `workspace.yaml`.
- Store initiative context with an explicit context-store binding rather than a
  flat store id, because workspace state may need to remember a registry selector
  or a runtime-local path selector.
- Generate `AGENTS.md`, opener workspace files, and tool-specific skills at the
  managed workspace root.
- Keep `workspace.yaml` as the only view file for Item 10; do not add a separate
  machine-readable view file.
- Do not introduce a separate generated-output directory for Item 10.
- If the user opens an initiative without a workspace name, derive a friendly
  default workspace name from the initiative id when that is unambiguous.
- On workspace-name collisions or multiple workspaces pointing at the same
  initiative, ask the human to choose or require an explicit workspace name in
  non-interactive mode.

## 2026-05-26: Item 10 Workspace Open UX Decisions

Decision: Close the remaining Item 10 product decisions around runtime identity,
JSON output, Codex Desktop, edit boundaries, and implementation scope.

Implications:

- Use `getGlobalDataDir()` as the cross-platform runtime-local boundary. Do not
  add path translation or a separate runtime id in Item 10.
- Keep `workspace open --json` as a machine-facing receipt for the same open
  operation. It should return useful generated paths, selected context, opened
  roots, skipped roots, opener, launch status, and warnings.
- Do not add `--prepare-only` for Item 10.
- For Codex Desktop, open the generated workspace root as the project and expose
  attached initiative and repo/folder paths through generated guidance and
  `workspace open --json` output.
- Emit advisory edit boundaries only; do not enforce write restrictions.
- Continue to open known existing local paths only. Do not clone, branch, create
  worktrees, use submodules, or infer local repos in Item 10.

## 2026-05-30: Defer Hardcoded Agent Handoff Guidance

Decision: Skip Item 13, agent handoff output and delivery polish, as an
implementation item for now.

Why: The underlying beta pain is real: users and agents need better receipts
after setup, initiative creation, workspace opening, and repo-local change
creation. However, fixed "Next for your agent" guidance assumes a linear
workflow path and may not fit dynamic agentic work, where the agent should
inspect current state and choose the next move.

Implications:

- Do not implement hardcoded next-step blocks yet.
- Preserve Item 13 as research context for a future receipt or affordance model.
- Prefer future output that reports what exists, where it lives, and what
  actions are available, rather than prescribing one next command.
- Deterministic receipt improvements such as direct `created_paths` fields may
  be split into a smaller implementation slice if they remain clearly useful.
- Delivery terminology concerns may be handled separately from handoff output.
