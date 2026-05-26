# Context Store And Initiatives Tasks

This tracks roadmap execution for the initiative. Roadmap items live in
`roadmap.md`; detailed working notes live under `work-items/`.

## 1. Lock The Direction

Work item: `work-items/01-lock-the-direction/`

- [x] Record the workspace-to-initiative product boundary in initiative docs.
- [x] Mark the old workspace reimplementation roadmap as historical reference.
- [x] Defer workspace apply, verify, and archive until initiative-linked repo
  changes exist.
- [x] Complete a non-spec direction pass so roadmap, work items, docs, and
  active change artifacts point to the initiative as product intent.
- [x] Decide whether user-facing workspace docs need any change now; default to
  no unless they misrepresent current behavior.
- [x] Decide how to handle active no-task workspace changes after the
  disposition pass.
- [x] Record final evidence and remaining risks for Item 1.

## 2. Stabilize Workspace As Local View

Work item: `work-items/02-stabilize-workspace-as-local-view/`

- [x] Re-anchor generated workspace guidance in the initiative direction.
- [x] Decide that generated guidance should stop recommending workspace-level
  `changes/` as the planning home for coordinated work.
- [x] Decide that `workspace update` should refresh generated workspace
  guidance for existing workspaces.
- [x] Decide that workspace-planning action context should treat beta workspace
  artifacts as local compatibility context.
- [x] Decide to defer doctor installed-skill summaries and only update stale
  `workspace update` wording for now.
- [x] Define exact local-view behavior to preserve.
- [x] Review current workspace setup, link, relink, list, open, update, and
  doctor behavior against that definition.
- [x] Identify any product wording or guidance gaps left after Item 1.

## 3. Add Context Store Foundation

Work item: `work-items/03-add-context-store-foundation/`

- [x] Define the initial store/backend data model.
- [x] Decide that the first slice is core API only, with no CLI surface yet.
- [x] Decide that the first backend is Git/local checkout config only.
- [x] Decide where context store roots, local registry YAML, and portable store
  metadata YAML live.
- [x] Implement context-store foundation helpers and tests.

## 4. Add Collection Foundation

Work item: `work-items/04-add-collection-foundation/`

- [x] Define collection mount rules.
- [x] Decide validation/template hooks stay inert extension fields for this
  slice.
- [x] Prove `initiatives/` can mount without store-specific logic.

## 5. Ship Initiative MVP

Work item: `work-items/05-ship-initiative-mvp/`

- [x] Define initiative file shape and validation.
- [x] Add templates for requirements, design, decisions, questions, and tasks.
- [x] Implement create/list mounted collection operations and CLI adapter.
- [x] Decide full read/show, update, and delete policy should move to later
  agent-first discovery and lifecycle work.

## 6. Add Minimal Context Store UX

Work item: `work-items/06-add-minimal-context-store-ux/`

- [x] Create Item 6 work-item tracking notes.
- [x] Define high-level `context-store setup`, `register`, `list`, and `doctor`
  UX direction.
- [x] Decide exact checked-in store metadata and machine-local registry
  behavior.
- [x] Decide setup/register/list/doctor human behavior and responsibility split.
- [x] Decide `initiative list` partial-success behavior across registered
  stores.
- [x] Decide final Item 6 edge cases: id inference, non-empty setup folders,
  registry conflicts, empty states, JSON exit behavior, and static completions.
- [x] Update `initiative list` to default across registered stores, with
  `--store` as a filter and `--store-path` as an escape hatch.
- [x] Add focused tests and verification for context-store CLI behavior.

## 7. Add Agent-First Initiative Discovery

- [x] Define `initiative show <id>` human and JSON output.
- [x] Search registered stores by default and handle ambiguous initiative ids.
- [x] Return canonical initiative metadata, store identity, root path, and
  metadata path for agent reads.
- [x] Keep work-progress status out of this command.

## 8. Connect Repo-Local Changes To Initiatives

Work item: `work-items/08-connect-repo-local-changes-to-initiatives/`

- [x] Decide that the initiative link lives in repo-local `.openspec.yaml`.
- [x] Add repo-local initiative metadata.
- [x] Add an agent-friendly create or link flow for repo-local changes.
- [x] Decide command naming for `--initiative` linking on new change creation.
- [x] Confirm whether create/link output should report where the change lives,
  which initiative it references, and the next suggested command.
- [x] Confirm whether `--initiative <id>` searches registered stores by default
  or requires explicit store selection in multi-store setups.
- [x] Keep canonical initiative context in the context store; do not add a
  checked-in `initiative.md` snapshot by default.

## 9. Reject Initiative Resolve

Work item: `work-items/09-add-initiative-resolve/`

- [x] Pressure-test whether a standalone `initiative resolve` command is needed.
- [x] Decide not to add `openspec initiative resolve`, now or later.
- [x] Keep canonical initiative discovery in `initiative show`.
- [x] Keep local path mapping in workspace behavior.
- [x] Keep implementation progress in repo-local status.
- [x] Reject all-repo scans, all-workspace scans, explicit path scanning as an
  initiative command, Git remote matching, cloning, worktree creation, and
  initiative backlinks.

## Proposed Discussion: Initiative Next / Agent Handoff UX

Work item draft:
`work-items/proposed-initiative-next-agent-handoff-ux/`

- [ ] Decide whether to add this as a numbered roadmap item between Item 9 and
  Item 10.
- [ ] Decide whether the surface is `initiative next`, workspace initiative
  opening, or repo-local status guidance.
- [ ] Decide whether it suggests one next action or multiple ranked options.
- [ ] Decide that progress/status stays out of scope, unless we explicitly want
  this command to grow into a broader status surface.

## 10. Let Workspaces Open Initiatives

- [x] Create Item 10 work-item tracking notes.
- [x] Lock the command UX for opening an initiative as a local workspace view.
- [x] Define the private local view record for selected context store,
  initiative, local links, opener, and selected tools.
- [x] Decide the private local view record storage namespace and keying.
- [x] Decide the default open target: initiative directory versus full context
  store.
- [x] Decide where generated runtime files live and how they are regenerated.
- [x] Define runtime identity rules for macOS, Codespaces, WSL, SSH, and
  containers without path translation.
- [x] Decide the prepare/JSON surface for agents and desktop integrations.
- [x] Decide the Codex Desktop behavior for generated workspace roots and attached
  paths.
- [x] Define advisory edit-boundary output for Item 10.
- [x] Confirm this slice opens known local paths only and does not create
  clones, branches, worktrees, or submodules.

## 11. Add Escalation UX

- [ ] Define local-to-initiative recommendation triggers.
- [ ] Carry current planning context into a new initiative.
- [ ] Keep prompts grounded in affected areas.

## 12. Harden Team-Shared Coordination

- [ ] Document recommended Git-backed store setup.
- [ ] Define teammate onboarding and repair flows.
- [ ] Add sync status and conflict guidance.

## 13. Explore Configurable Change Homes

Work item: `work-items/13-explore-configurable-change-homes/`

- [ ] Confirm "change home" stays internal language and user-facing wording is
  closer to "where should this plan live?"
- [ ] Explore when changes should live in a context store versus a local
  OpenSpec repo.
- [ ] Decide the configuration surface for selecting a default change home.
- [ ] Define how `new change`, initiative linking, and workspace guidance
  discover the configured change home.
- [ ] Decide how context-store-hosted changes bind to target repo specs,
  implementation roots, validation, archive, and sync behavior.
- [ ] Record compatibility behavior for existing repo-local and
  workspace-local changes.
- [ ] Identify follow-on implementation slices and risks.
