# Context Store And Initiatives Roadmap

This roadmap turns the direction in `direction.md` into shippable chunks.

The product decision underneath every step is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## 1. Lock The Direction

Goal: make the workspace-to-initiative pivot explicit so future workspace work
does not keep implementing the older "workspace owns the plan" model.

Ship:

- Record that workspaces are local working views, not durable shared planning
  objects.
- Record that initiatives are the durable coordination object for cross-team or
  cross-repo work.
- Mark the current workspace apply, verify, and archive direction as deferred or
  superseded until initiative-linked repo changes exist.
- Keep the already-built workspace setup, link, open, update, and doctor
  behavior as useful beta infrastructure.

Done when:

- Fresh agents can tell which workspace ideas still apply and which ones should
  not steer implementation.

Locked disposition:

- Keep workspace setup, link, relink, list, open, update, and doctor as beta
  local-view infrastructure.
- Keep "workspace visibility is not change commitment" as a safety rule for
  linked repos and folders.
- Supersede "workspace is the durable planning home" with "initiatives are the
  durable coordination object."
- Supersede workspace-level planning artifacts as the canonical shared
  cross-repo plan.
- Defer workspace apply, verify, and archive as first-class lifecycle commands
  until initiative-linked repo-local changes exist.
- Defer branch/worktree orchestration, strong cross-repo validation, dependency
  graph enforcement, and shared contract governance.

Fresh-agent rule:

- Start from `openspec/initiatives/context-store-and-initiatives/direction.md`
  for product authority.
- Treat `openspec/changes/workspace-reimplementation-roadmap/HISTORICAL_DIRECTION.md` and
  `openspec/changes/workspace-reimplementation-roadmap/` as historical reference
  material for preserved local-view behavior and POC lessons.
- Do not pick up `workspace-apply-repo-slice` or
  `workspace-verify-and-archive` as the next implementation slice unless a later
  initiative-linked repo-change design explicitly reactivates them.

## 2. Stabilize Workspace As Local View

Goal: keep workspaces useful without making them the source of truth.

Ship:

- Workspace guidance that routes durable coordination to initiatives,
  implementation planning to repo-local changes, and linked repos or folders to
  local context until an edit root is selected.
- Workspace-open behavior that launches the local planning view with linked
  folders visible.
- Workspace doctor/status output that explains local path mappings, unresolved
  links, installed agent skills, and repair steps.
- Clear docs that `workspace update` refreshes local agent guidance and does not
  modify linked repos.

Done when:

- A user can set up a workspace, link repos, open an agent, and understand that
  the workspace is a local view over context, not the canonical shared plan.

## 3. Add Context Store Foundation

Goal: create the generic local context-store foundation that can later hold
initiatives and other shared context collections. Sync/watch behavior remains a
future hardening slice.

Ship:

- A context store abstraction with generic local operations: read, write,
  delete, and list.
- A first Git-shaped backend model that can point at a local store root.
- A test/memory backend for fast tests and prototypes.
- A store configuration model that does not contain initiative-specific logic.

Done when:

- OpenSpec can create and manipulate files inside a local context store without
  the core store layer knowing what those files mean. Pull, push, watch,
  remote creation, and conflict handling are tracked as future sync work.

## 4. Add Collection Foundation

Goal: let product-specific content systems live inside a context store without
hardcoding every future concept into the store layer.

Ship:

- A collection interface with a mounted folder namespace.
- Rules that keep a collection's writes inside its mount.
- Basic collection validation and template hooks.
- A way for collections to expose optional agent guidance or UI metadata later.

Done when:

- The context store can host a mounted `initiatives/` collection while staying
  generic enough for future collections like decisions, API catalogs, or
  playbooks.

## 5. Ship Initiative MVP

Goal: give coordinated work a durable, shared, agent-consumable home.

Ship:

- Initiative creation and listing.
- A default initiative file shape:

```text
initiatives/<id>/
  initiative.yaml
  requirements.md
  design.md
  decisions.md
  questions.md
  tasks.md
```

- Templates for product intent, accepted requirements, design decisions, open
  questions, and coordination tasks.
- Validation for required initiative metadata.
- Explicit deferral of full read/show, update, and delete policy until the
  agent-first discovery and lifecycle needs are clearer.

Done when:

- A user or agent can create and list initiatives as shared planning objects
  before any repo has committed to implementation details.

## 6. Add Minimal Context Store UX

Goal: make shared initiative storage usable before repo handoff or workspace
opening depends on it.

Ship:

- `context-store setup <id>` for creating a local Git-backed store folder with
  portable store metadata and local registration.
- `context-store register <path>` for registering an existing clone or folder,
  defaulting the store id from the repo or folder name.
- `context-store list` and `context-store doctor` for local visibility and
  non-mutating diagnostics.
- `initiative list` defaulting to all registered stores, with `--store` as a
  filter and `--store-path` as an escape hatch.
- Minimal human output and JSON output suitable for agents.

Done when:

- A single developer or teammate can create or register a shared context store,
  list initiatives across registered stores, and diagnose missing or broken
  local store setup without learning the internal registry layout.

## 7. Add Agent-First Initiative Discovery

Goal: let an agent resolve the initiative the user named and read canonical
initiative context from the source of truth.

Ship:

- `initiative show <id>` that searches registered stores by default.
- Ambiguity handling when the same initiative id exists in multiple stores.
- JSON output with canonical initiative metadata, store identity, initiative
  root path, and metadata path.
- Human output focused on identity and available files, not work progress.

Done when:

- An agent can answer, "Which initiative did the user mean, where is the
  canonical context, and where is the initiative metadata?"

## 8. Connect Repo-Local Changes To Initiatives

Goal: split shared coordination from repo-owned implementation plans cleanly.

Discussion points to confirm before implementation:

- Should the create/link flow explicitly report where the change lives, which
  initiative it references, and the next suggested command?
- Should `--initiative <id>` search registered stores by default, or should it
  require `--store` when more than one store is registered?
- What should the command do when the initiative exists but the current repo has
  no obvious ownership match?

Ship:

- Repo-local change metadata that can reference an initiative by store id and
  initiative id.
- An agent-friendly create or link flow such as
  `new change <id> --initiative <store>/<initiative>`.
- Guidance that repo-local changes remain responsible for implementation,
  validation, and archive.
- No checked-in `initiative.md` snapshot by default; agents read canonical
  initiative files live from the context store.

Done when:

- One initiative can coordinate several repo-local changes without copying the
  shared plan into every repo, storing machine-local links in the initiative, or
  making the initiative own implementation artifacts.

## 9. Reject Initiative Resolve

Decision: do not add `openspec initiative resolve`, now or later.

Rationale:

- `initiative show` already resolves canonical shared initiative context.
- A workspace is the local view over repos, folders, context stores, and
  initiatives.
- Repo-local changes already carry durable initiative links in checked-in
  `.openspec.yaml` metadata.
- Repo-local status already reports work progress.
- A standalone resolve command would either duplicate workspace local-view state
  or produce weak output when no workspace is present.

Do not ship:

- `openspec initiative resolve <id>`
- all-workspace or all-repo scans for initiative availability
- explicit path scanning as an initiative command
- Git remote matching for initiative participation
- repo ownership inference
- cloning, branch creation, or worktree creation as part of initiative
  resolution
- initiative backlinks
- local availability or progress dashboards under the initiative command

Done when:

- Future agents can see that "initiative resolve" is intentionally rejected and
  should not be revived under another command name.

## Proposed Discussion Point: Add Initiative Next / Agent Handoff UX

Status: candidate work item, not locked into the numbered roadmap yet.

Question to confirm:

- Should this become a roadmap item before "Let Workspaces Open Initiatives"?

Goal: give agents and users a small "what now?" command after initiative
discovery from the current repo or workspace, without turning it into a
dashboard or progress/status surface.

Possible shape:

```bash
openspec initiative next billing-launch --json
```

Possible JSON answer:

```json
{
  "initiative": "billing-launch",
  "next_action": "create_repo_change",
  "reason": "initiative found, no linked local change exists for this repo",
  "suggested_command": "openspec new change add-billing-api --initiative billing-launch"
}
```

Discussion points to confirm before implementation:

- Is `initiative next` the right command name, or should this guidance belong
  inside workspace initiative opening or repo-local status?
- Should it return exactly one suggested next action, or a ranked set of options?
- Should it ever inspect work progress, or stay limited to handoff/readiness?
- How should it behave when no stores are registered, the initiative is
  ambiguous, or the local repo is unrelated?

Done when, if accepted:

- An agent can answer "what should I do next for this initiative from here?"
  without guessing across `show`, workspace state, and repo-local
  change metadata.

## 10. Let Workspaces Open Initiatives

Goal: connect durable initiative context to this runtime's local working view
after initiative show and repo-change linkage exist.

Locked direction:

- A workspace does not contain the work. It remembers how this runtime opens the
  work.
- Persist only tiny private local view choices.
- Generate opener-specific runtime files on open.
- Attach initiative context and selected existing local repos or folders.
- Do not clone, branch, create worktrees, use submodules, or infer local repos in
  this slice.
- Context-only open is valid.

Product decision status:

- No remaining Item 10 product decisions are open. Implementation may still
  uncover mechanical details, but the intended UX shape is locked.

Command UX decision:

- Use `openspec workspace open --initiative <initiative>`.
- Support `<store>/<initiative>` and `<initiative> --store <store>`.
- Support `openspec workspace open <workspace-name> --initiative <initiative>`
  when the user wants to choose the local workspace identity explicitly.
- If only `<initiative>` is provided, proceed when exactly one registered
  context store has that initiative id.
- On ambiguity, list exact matches and require an explicit store selector.
- On no exact match, show likely matches when available and suggest `openspec
  initiative list`; do not silently open a fuzzy match.
- If the user omits a workspace name, derive a friendly default from the
  initiative id when that is unambiguous; otherwise require the user to pick an
  explicit workspace name.

Open target decision:

- Open the initiative directory by default, not the whole context store.
- Generated guidance and JSON output should still report the context store root
  and that broader context is available.
- A later explicit option may open the whole context store, but broad store
  scope is not the Item 10 default.

Local view record decision:

- Use one private local view record for initiative-aware local views.
- Store initiative-view state in the root `workspace.yaml` file.
- The record stores selected context-store binding, initiative, local links,
  opener, and selected tools. The binding may preserve a registry selector or a
  runtime-local path selector.
- The context binding is optional, so a workspace can also be a custom local view
  with linked folders and no initiative.

Workspace storage decision:

- Store each private workspace view under
  `getGlobalDataDir()/workspaces/<workspace-name>/`.
- The workspace name is the local identity. Selected store and initiative, if
  any, are data inside the private record rather than path segments.
- Use one durable `workspace.yaml` at the workspace root.
- Generate `AGENTS.md`, opener workspace files, and tool-specific skills at the
  workspace root.
- Do not introduce a separate generated-output directory for Item 10.

Runtime identity decision:

- Use `getGlobalDataDir()` as the cross-platform runtime-local boundary.
- Local paths are valid only in the runtime that wrote the private
  `workspace.yaml`.
- Do not add path translation or a separate `<runtime-id>` path segment in Item
  10.

Prepare/JSON decision:

- Keep `workspace open --json` as a machine-facing receipt for the same open
  operation.
- Do not add `--prepare-only` for Item 10.
- JSON should return useful generated paths, selected context, opened roots,
  skipped roots, opener, launch status, and warnings rather than a bare success
  response.

Codex Desktop decision:

- Open the generated workspace root as the Codex Desktop project.
- Expose attached initiative and linked repo/folder paths through generated
  guidance and `workspace open --json` output.
- Defer Desktop multi-root automation until there is a clearer Desktop contract.

Edit-boundary decision:

- Emit advisory boundaries only.
- Label initiative/context-store files as shared coordination context and linked
  repos/folders as local implementation context when selected.
- Do not enforce write restrictions in Item 10.

Ship:

- Private local view state that can remember the selected context store,
  selected initiative, selected local links, opener, and selected tools for this
  runtime.
- `workspace open` support for generating opener-specific runtime files and
  opening initiative context plus locally resolved linked repos/folders.
- Agent guidance and machine-readable `workspace open --json` output that
  explain the current initiative, opened roots, skipped roots, local paths, and
  advisory edit boundaries.
- Workspace-name reuse behavior that avoids silently repointing an existing
  workspace to a different initiative.
- Open-time warnings that skip missing linked repos/folders while failing when
  the selected initiative or context store cannot be resolved.
- Continued support for custom non-initiative workspaces as first-class local
  views.
- Doctor guidance for missing context stores, missing linked repos/folders, and
  stale local view records.

Done when:

- A teammate can open the same initiative in their runtime while using their own
  local paths and selected repo subset.
- Generated runtime files are clearly derived and can be regenerated without
  losing the user's local view choices.

## 11. Add Escalation UX

Goal: let users start locally and upgrade only when coordination is actually
needed.

Ship:

- Explore/propose guidance that starts in the current repo by default.
- A recommendation path when work spans multiple owned areas:

```text
This appears to span multiple owned areas.
OpenSpec can upgrade it into a coordinated initiative and carry the current
planning context forward.
```

- Carry-forward behavior for the current change name, product goal, notes,
  inferred areas, and relevant questions.
- Clear prompts that ask about concrete affected areas rather than abstract
  storage models.

Done when:

- Coordinated planning feels like a continuation of local planning, not a
  workflow restart.

## 12. Harden Team-Shared Coordination

Goal: make initiatives practical for teams without turning setup into an admin
ceremony.

Ship:

- A recommended Git-backed shared context store pattern.
- Lightweight teammate onboarding:

```text
Clone the context store.
Run openspec workspace doctor.
Open the initiative with your agent.
```

- Repair flows for local path mappings.
- Sync status and conflict guidance.
- Clear separation between committed initiative state and machine-local
  workspace state.

Done when:

- Several teammates can share the same initiative while each keeps their own
  local checkout layout.

## 13. Explore Initiative-Hosted Target-Bound Change Artifacts

Goal: decide whether shared initiative artifacts can graduate into executable
OpenSpec changes only after they are bound to a target repo or spec root,
without blurring initiative coordination, repo ownership, and workspace
local-view boundaries.

Discussion points to confirm before exploration:

- Should "change home" stay internal resolver language, with user-facing
  phrasing like "where should this plan live?" and "editable target"?
- What is the difference between initiative work items, briefs, target-bound
  changes, and repo-local changes?
- What portable target metadata is required before an initiative-hosted artifact
  can be considered implementation-ready?
- Should shared target-bound changes require explicit opt-in, or can
  initiative/store policy select them?
- What user/team scenario would justify an initiative-hosted target-bound change
  instead of a repo-local linked change?

Ship:

- Audit commands, templates, validation, archive, apply, completion, and docs
  for repo-local `openspec/changes/` assumptions.
- Define the concepts of artifact home, implementation target, allowed edit
  roots, and action context.
- Decide how initiative-hosted target-bound changes bind to repo specs,
  implementation roots, branches, validation, archive, and sync/conflict
  behavior.
- Define agent-readable JSON output for work target, artifact home,
  implementation target, initiative link, edit boundaries, unsupported
  lifecycle commands, and next commands.
- Record compatibility behavior for existing repo-local and workspace-local
  changes.
- Recommend whether this should become an implementation slice, remain deferred,
  start as initiative work items only, or be limited to specific schemas or
  workflows first.

Done when:

- The initiative has a concrete recommendation, opt-in/config examples, affected
  command list, and go/no-go criteria for implementation.

## Later, Not First

These are important, but should wait until the initiative model has real usage:

- Workspace apply, verify, and archive as first-class lifecycle commands.
- Branch or worktree orchestration.
- Strong cross-repo validation.
- Dependency graph enforcement.
- Shared contract ownership workflows.
- Sponsor/driver governance flows.
- Initiative progress/status dashboards.
- Cloud-hosted context stores.

## Suggested Shipping Sequence

1. Lock the direction and defer old workspace lifecycle slices.
2. Stabilize workspace as local view and agent launcher.
3. Add context store foundation.
4. Add collection foundation.
5. Ship initiative MVP.
6. Add minimal context-store UX.
7. Add agent-first initiative discovery.
8. Link repo-local changes to initiatives.
9. Keep initiative resolve rejected; use workspace local-view mapping instead.
10. Pending discussion: optionally add initiative next / agent handoff UX.
11. Let workspaces open initiatives.
12. Add local-to-initiative escalation UX.
13. Harden team-shared coordination.
14. Explore configurable change homes.
