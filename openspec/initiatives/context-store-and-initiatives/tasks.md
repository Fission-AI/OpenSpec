# Context Store And Initiatives Tasks

Status: historical beta progress snapshot.

This file preserves the task state from the old context-store and workspace
initiative. It is not the active implementation queue for current
simplification work.

For current direction, start with:

1. `openspec/work/simplify-context-and-workspace-model/goal.md`
2. `openspec/work/simplify-context-and-workspace-model/roadmap.md`

Historical roadmap items live in `roadmap.md`; detailed working notes live
under `work-items/`.

## Historical Beta Priority Snapshot

At the time, the manual beta pass prioritized the things a fresh user hit while
getting started before deeper model work:

1. Finish Item 11 observations enough to keep implementation grounded.
2. Item 12: no-argument context-store setup, path safety, and
   cleanup.
3. Skip Item 13 as an implementation item for now. Preserve the findings, but
   do not hardcode linear "next step" guidance until the agent handoff shape is
   better understood.
4. Item 14: update the beta guide so it matches the improved first-run flow.
5. Item 15: context-store project roots and sparse schema-led
   initiatives.
6. Items 16-18: leave escalation, team hardening, and initiative-hosted
   target-bound changes until after the onboarding path feels sane.
7. Item 19: review beta workspace compatibility near the end, before workspace
   behavior becomes public/stable.

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

## 11. Manual Beta Reality Pass

Work item: `work-items/11-manual-beta-reality-pass/`

- [ ] Manually run the current context-store, initiative, workspace, and
  repo-local change flows from a fresh user's point of view.
- [ ] Capture notes on confusing commands, missing prompts, unclear output, and
  places where the docs over-explain or under-explain.
- [ ] Update initiative notes as observations come in.
- [ ] Decide which findings should become implementation slices versus docs-only
  fixes.

## 12. Context Store First-Run And Cleanup UX

Work item: `work-items/12-context-store-first-run-and-cleanup-ux/`

- [x] Decide and implement interactive no-argument `context-store setup`.
- [x] Define target-path safety behavior for managed defaults, explicit paths,
  Git repos, and non-empty directories.
- [x] Add local cleanup support for unregistering or removing a context store.
- [x] Make setup and cleanup output report the agreed human-facing summary and
  exact JSON state without workflow `next_commands`.
- [x] Update docs and tests for first-run setup and cleanup behavior.

## 13. Agent Handoff Output And Delivery Polish

Work item: `work-items/13-agent-handoff-output-and-delivery-polish/`

Status: deferred. Do not implement fixed "Next for your agent" output from this
item yet.

- [ ] Revisit the handoff model after Item 14/15 clarify the beta guide and
  sparse initiative flow.
- [ ] If needed, split deterministic receipt improvements such as direct
  `created_paths` into a smaller future implementation slice.
- [ ] Avoid prescribing one linear workflow path; future handoff output should
  report state, paths, and possible affordances that agents can compose.

## 14. Workspaces Beta Guide Split

Work item: `work-items/14-workspaces-beta-guide-split/`

- [ ] Update the user-facing guide to prefer interactive terminal setup for
  local choices.
- [ ] Move initiative creation, initiative editing, and repo-local change
  creation into "ask your coding agent" guidance.
- [ ] Keep explicit flags, JSON output, cwd rules, and caveats in the
  agent-facing CLI playbook.
- [ ] Decide which flags remain useful in user docs as escape hatches for
  ambiguity.
- [ ] Record any interactive prompt gaps found while writing the guide.

## 15. Context Store Project Roots And Schema-Led Initiatives

Work item:
`work-items/15-context-store-project-roots-and-schema-led-initiatives/`

- [x] Create Item 15 work-item tracking notes.
- [ ] Update initiative direction language so context stores are OpenSpec-aware
  shared project roots, not only cross-team/cross-repo coordination folders.
- [ ] Decide the minimal context-store OpenSpec structure:
  `.openspec-store/store.yaml`, `openspec/config.yaml`,
  `openspec/schemas/`, and collection mounts.
- [ ] Decide the store-local config shape for initiative collection defaults,
  including whether to use `collections.initiatives.schema`.
- [ ] Decide how context-store setup creates, preserves, or repairs
  store-local `openspec/config.yaml`.
- [ ] Define the built-in high-level initiative schema and its initial
  artifacts.
- [ ] Decide whether `initiative create` creates only `initiative.yaml`, or
  `initiative.yaml` plus one schema-selected seed artifact such as `brief.md`.
- [ ] Replace eager six-file initiative scaffolding with sparse iterative
  creation.
- [ ] Add initiative artifact status/instructions behavior rooted at the
  initiative directory.
- [ ] Reuse project-local schema resolution with the context-store root as the
  project root for initiative commands.
- [ ] Decide whether schema CLI commands need `--store` or `--store-path`
  selectors.
- [ ] Guard planning-home resolution so context stores with `openspec/config.yaml`
  do not accidentally make the store an implementation repo.
- [ ] Preserve existing six-file beta initiatives as readable valid
  initiatives.
- [ ] Update docs, generated agent guidance, and tests for the project-like
  context-store model.

## 16. Add Escalation UX

Work item: `work-items/16-add-escalation-ux/`

- [ ] Define local-to-initiative recommendation triggers.
- [ ] Carry current planning context into a new initiative.
- [ ] Keep prompts grounded in affected areas.

## 17. Harden Team-Shared Coordination

Work item: `work-items/17-harden-team-shared-coordination/`

- [ ] Document recommended Git-backed store setup.
- [ ] Define teammate onboarding and repair flows.
- [ ] Add sync status and conflict guidance.

## 18. Explore Initiative-Hosted Target-Bound Change Artifacts

Work item: `work-items/18-explore-initiative-hosted-target-bound-change-artifacts/`

- [ ] Confirm "change home" stays internal language and user-facing wording is
  closer to "where should this plan live?"
- [ ] Define user-facing naming for initiative work items, briefs,
  target-bound changes, artifact homes, and editable targets.
- [ ] Decide whether initiative-hosted artifacts can graduate into executable
  changes, and which target metadata is required first.
- [ ] Decide the configuration or opt-in surface for repo-local versus
  initiative-hosted artifacts.
- [ ] Define how `openspec new change` selects and reports the artifact home,
  implementation target, initiative link, and action context.
- [ ] Decide how initiative-hosted target-bound changes bind to repo specs,
  implementation roots, validation, archive, and sync behavior.
- [ ] Record compatibility behavior for existing repo-local and
  workspace-local changes.
- [ ] Identify follow-on implementation slices and risks.

## 19. Review Workspace Beta Compatibility Before Public Release

Work item:
`work-items/19-review-workspace-beta-compatibility-before-public-release/`

- [ ] Inventory workspace beta compatibility code and tests.
- [ ] Decide which beta-only compatibility paths should be removed before
  public release.
- [ ] Decide which compatibility paths need explicit migration behavior or
  release notes.
- [ ] Remove low-value shims that only support unpublished beta workspace
  shapes.
- [ ] Update docs, tests, and agent guidance to match the chosen public
  workspace compatibility contract.
