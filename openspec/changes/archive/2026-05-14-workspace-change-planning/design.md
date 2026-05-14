## Context

Workspace setup already creates a planning home, records linked repos or folders, stores a preferred opener, and maintains the root open surface. For workspace change planning to work in practice, the opened agent also needs OpenSpec workflow skills available from that workspace root.

Repo-local `openspec init` and `openspec update` already provide the user model for choosing agent surfaces and generating skills. Workspace setup should feel similar, but the installation target is the workspace root rather than any linked repo or folder.

The existing artifact workflow assumes a change lives under a repo-local `openspec/changes/<id>` path. Workspace planning needs the same workflow vocabulary, but the planning home may be a workspace root and the implementation homes may be linked repos or folders.

## Goals / Non-Goals

**Goals:**
- Install OpenSpec agent skills into the workspace root during workspace setup.
- Use the active global profile to select which workflow skills are installed in the workspace.
- Let users choose which agents receive skills with familiar `--tools` semantics.
- Persist workspace-local agent skill selection so update can refresh the same agents later.
- Let users refresh, add, or remove workspace-local skills later through `workspace update`.
- Detect and report workspace-local skill drift from the active global profile.
- Let `openspec config profile` offer to apply changed profile settings to the current workspace when run from inside a workspace.
- Redirect workspace users from repo-local `openspec update` to `openspec workspace update`.
- Add a built-in workspace planning schema for workspace-scoped changes.
- Create workspace changes under the workspace planning path.
- Represent affected areas without forcing implementation artifacts into linked repos.
- Give agents machine-readable planning context through status/instructions output.
- Preserve the workspace boundary: linked repos and folders remain untouched during setup/update.

**Non-Goals:**
- Generating slash commands as part of workspace setup.
- Honoring global `delivery: commands` by generating workspace command files.
- Installing skills into linked repos or folders.
- Adding workspace-local workflow profiles separate from global config.
- Solving workspace-scoped artifact path discovery in the first setup-skill step.
- Adding a separate artifact-context CLI command in the first version.
- Implementing workspace apply, verify, or archive semantics end to end.
- Changing repo-local `openspec init` or `openspec update` behavior.

## Decisions

### Use agent-skill language in workspace UX

Workspace setup should ask, "Which agents should get OpenSpec skills in this workspace?" rather than using the broader "AI tools" wording. The user-visible action is installing skills for coding agents, and the target is the workspace planning home.

Alternative considered: reuse the exact `init` wording. That would be familiar, but it hides the important distinction between opening a workspace and installing skills into it.

### Reuse the existing tool id model

The CLI should use the existing `--tools all|none|<ids>` grammar for non-interactive setup and update. Reusing the existing tool IDs avoids inventing a second naming system for the same configured agents.

Alternative considered: add `--agents`. That reads better in isolation, but it creates unnecessary parallel vocabulary next to `openspec init --tools`.

### Let profile choose workflows and tools choose agents

Workspace setup/update should use the active global profile to decide which OpenSpec workflow skills are installed. The profile answers "which actions are available?" while `--tools` answers "which agents get those actions?" Keeping those concerns separate preserves the existing profile model and avoids adding workspace-local workflow selection in this slice.

If global profile is `core`, workspace skills should include the core workflow set. If global profile is `custom`, workspace skills should include only the configured custom workflows. `--tools none` should still mean no agent skills are installed, regardless of profile.

Alternative considered: add a workspace-local profile file. That might be useful later for team-shared workspace defaults, but this slice already stores machine-local agent paths and should avoid introducing another config authority before the global profile behavior works.

### Preselect the preferred opener when possible

Interactive setup should preselect the preferred opener when that opener maps to a skill-capable agent. The user can accept the default, add more agents, or deselect it.

Alternative considered: install skills only for the preferred opener. That is simpler, but opener choice means "how should I open this workspace" while skill selection means "which agents should understand OpenSpec here."

### Persist selected workspace skill agents locally

Workspace setup should store the selected skill-capable agents in `.openspec-workspace/local.yaml` because agent paths and installed tool surfaces are machine-local. Workspace update should use that stored selection when the user does not pass `--tools` or make a new interactive selection.

Explicit `--tools` on workspace setup/update should replace the stored selection. `--tools none` should store an empty selection and remove only known OpenSpec-managed workspace skill directories.

The local state should also record enough last-applied information to support drift detection, such as the workflow IDs installed for each selected agent and the effective global profile/delivery at the time of the last successful sync. This is diagnostic state, not a second source of truth.

Alternative considered: infer selected agents by scanning `.codex/skills/`, `.claude/skills/`, and similar directories. Scanning is useful as a fallback, but persisted selection gives predictable update behavior and avoids treating unrelated user-authored files as OpenSpec-managed state.

### Keep non-interactive setup backward-compatible

`openspec workspace setup --no-interactive` should not require `--tools`. If `--tools` is omitted, setup should create the workspace and skip skill installation, preserving existing scripted workspace setup behavior. Human and JSON output should say that no workspace skills were installed and that `openspec workspace update --tools <ids>` can add them later.

`openspec workspace update --no-interactive` without `--tools` should refresh the stored workspace skill agent selection. If no selection is stored, it should complete without installing skills and report a clear no-op with guidance to pass `--tools`.

Alternative considered: require `--tools` whenever workspace setup/update is non-interactive. That mirrors repo-local init, but it would break existing workspace setup scripts that predate workspace-local skill installation.

### Generate workspace-local skills only

Workspace setup/update should generate skills under the workspace root, such as `.codex/skills/` or `.claude/skills/`. It should not generate slash commands in this slice because some command adapters resolve to global locations, and workspace setup should remain local and predictable.

When global delivery is `commands` or `both`, workspace setup/update should still generate only skills and report that workspace command generation is not part of this slice. This keeps profile workflow selection useful without making workspace setup perform global or repo-local command writes.

Alternative considered: mirror `init` exactly and generate both skills and commands. That risks surprising global writes and makes the setup boundary harder to explain.

### Add `workspace update` for skill refresh

`openspec workspace update` should refresh, add, or remove workspace-local OpenSpec skills after setup. It should resolve the current workspace when run from inside a workspace, and also support named and non-interactive forms.

Workspace update should compare the active global profile's workflow selection with the last applied workspace skill state. If they differ, update should add/remove only OpenSpec-managed workflow skill directories for the selected agents. Workspace doctor/list/status surfaces may report the drift as a warning, and `openspec config profile` no-op inside a workspace should use the same drift check for guidance.

Alternative considered: reuse `openspec update` from inside the workspace. That command currently means repo/project update, while workspace update needs workspace selection, workspace JSON/status behavior, and linked-repo safety rules.

### Make `config profile` workspace-aware

`openspec config profile` should remain a global configuration command. When it runs inside a repo-local OpenSpec project and the user chooses to apply changes, it should continue to run `openspec update`.

When it runs inside an OpenSpec workspace and the profile or delivery settings actually change, it should prompt to apply changes to the current workspace. If confirmed, it should run `openspec workspace update` for that workspace. If declined, it should explain that the global config changed and the user can run `openspec workspace update` later.

The preset shortcut `openspec config profile core` should keep its non-interactive character and not launch an apply prompt. When run from inside a workspace, it should save global config and print workspace-specific follow-up guidance to run `openspec workspace update`. When run inside a repo-local project, it should keep the existing repo-local guidance.

For this slice, automatic workspace context should come from the workspace planning home and its own subdirectories. Running a command from inside a linked repo or folder should keep that location's repo-local behavior unless the user explicitly selects the workspace with a workspace command option. This avoids surprising repo-local commands merely because the repo is registered as a workspace link.

If a directory is both inside a workspace planning home and inside a repo-local OpenSpec project, the nearest planning home should determine the apply prompt. This avoids applying a workspace profile change to a linked repo when the user is intentionally operating from the workspace planning home.

Alternative considered: make `openspec config profile` update all known workspaces. That would be convenient in small setups, but global config changes should not fan out into multiple planning homes without an explicit per-workspace action.

### Resolve a planning home before acting

Workflow commands should resolve whether the current change belongs to a repo-local planning home or a workspace planning home before computing paths. The resolver should identify the planning root, change root, linked areas when present, and whether implementation edits are allowed. Linked repos are not implicitly treated as workspace planning homes just because they are registered in a workspace; workspace-scoped behavior is selected from the workspace planning home or through explicit workspace selection.

Alternative considered: add workspace-specific command branches wherever paths are used. That would make the workspace model leak into every workflow and make generated skills more fragile.

### Store workspace changes in the workspace planning path

Workspace changes should live under the workspace planning path, initially `changes/<id>` at the workspace root. Creating the workspace change should capture shared intent once and may record affected areas, but it should not create repo-local `openspec/changes/<id>` directories in linked repos.

Alternative considered: materialize a repo-local change in every affected repo during workspace change creation. That was easy to reason about in the POC, but it commits too early and makes exploration look like implementation.

### Add a workspace planning schema

Workspace-scoped changes should use a built-in `workspace-planning` schema by default. This keeps the workflow verbs familiar while letting workspace changes have a structure that fits cross-area planning.

Initial artifact shape:

```text
changes/<id>/
  .openspec.yaml          # schema: workspace-planning
  proposal.md             # shared goal and scope
  design.md               # cross-area decisions
  tasks.md                # coordination tasks, optionally grouped by affected area
  specs/
    <area-or-repo>/
      <capability>/spec.md
```

The first schema should stay intentionally close to the normal OpenSpec artifact shape: proposal, specs, design, and tasks. Area-specific requirements live under `specs/` and area-specific work can be represented as sections in `tasks.md`. This slice does not introduce another area manifest beside those normal planning artifacts.

Alternative considered: reuse `spec-driven` unchanged and make all workspace differences implicit in status output. That hides the fact that workspace planning needs different instructions for organizing requirements and tasks by affected area.

Alternative considered: create separate workspace workflow skills instead of a schema. That would duplicate workflow guidance and make workspace mode feel like a different product.

### Support nested workspace spec paths in the schema

The `workspace-planning` schema should define its specs artifact so nested workspace paths are first-class, not accidental. The intended output pattern is `specs/**/*.md`, and the schema instructions should explicitly describe `specs/<area-or-repo>/<capability>/spec.md` as the default convention for area-specific requirements.

Status and instructions output should preserve the concrete nested paths it discovers. Repo-local spec sync, archive, and validation paths that assume `specs/<capability>/spec.md` should not treat workspace-scoped specs as repo-local capability specs until a later explicit implementation, sync, or archive workflow selects an affected area and defines the destination.

### Use affected areas, not targets or repo slices

The planning model should call ownership or implementation boundaries "affected areas." Affected areas can start with registered workspace link names, but the language should leave room for folders, packages, services, apps, or docs sites. Delivery breakdown remains a separate concept and should not be called an area.

Alternative considered: keep "targets" because it maps to the old POC flag. That term is implementation-first and encourages users to choose repos before the plan is clear.

### Make status JSON the agent context contract

`openspec status --change <id> --json` should become the primary source of machine-readable action context. It should include the planning home, change root, concrete artifact paths, affected areas, next steps, and constraints such as allowed edit roots when implementation is later in scope.

Alternative considered: create a separate context command immediately. Status is already used by generated workflow skills, so enriching it first gives agents a single place to look.

### Keep generated skills path-agnostic

Generated workflow skills should ask OpenSpec where artifacts live instead of embedding repo-local paths such as `openspec/changes/<name>`. The standard skill pattern should be:

```text
1. Run `openspec status --change "<name>" --json`.
2. Use the returned planning home, artifacts, next steps, and action context.
3. Run `openspec instructions <artifact> --change "<name>" --json` before writing an artifact.
4. Write to the resolved path returned by the CLI.
```

This keeps the same skill usable in repo-local and workspace-scoped changes. If status/instructions output later becomes too crowded, a separate context command can be introduced in a future change without changing the high-level skill rule.

Alternative considered: add a new `openspec context` command now. That may become useful, but it adds a new surface before we have proven that enriched status/instructions are insufficient.

### Guard unsupported workspace workflow actions

The global profile may select workflows whose workspace-scoped behavior is not implemented in this slice, such as full workspace apply, verify, or archive. Generated workspace-local skills for those workflows should be safe: they should inspect status/instructions, explain the unsupported workspace action, and avoid editing linked repos unless a later explicit implementation workflow supplies an allowed edit root.

This keeps the workspace skill set aligned with the user's profile while preventing repo-local fallbacks from pretending to implement workspace semantics.

Alternative considered: filter unsupported workflows out of workspace skill generation. That would avoid unsupported commands, but it would make the workspace skill set silently diverge from the user's profile and make drift harder to explain.

### Redirect repo update from workspace roots

`openspec update` should remain the repo/project update command. When it is run from an OpenSpec workspace planning home, it should not try to treat the workspace as a repo-local project. It should fail or redirect with clear guidance to run `openspec workspace update`.

Alternative considered: make `openspec update` polymorphic and perform workspace update inside workspaces. That would be convenient, but it blurs the repo/project versus workspace boundary this change is trying to make explicit.

### Update docs, help, and completions

The CLI help, command registry/completions, and user docs should include `openspec workspace update`, its `--tools` behavior, the global-profile relationship, and the skills-only workspace delivery rule.

Alternative considered: document this only after implementation. Because profile/update behavior is easy to confuse with repo-local update, the docs and help updates are part of the user-facing feature.

### Treat manual acceptance and UX review as phase gates

Each phase should produce a user-testable increment, even when most of the work is internal. The phase is not done until a user can exercise the named behavior through the CLI, inspect the resulting output or files, and understand what changed.

Each implementation phase should include a manual acceptance pass in addition to automated tests. The manual pass should exercise the real CLI flow, inspect the generated files or output, and confirm linked repos or folders stay untouched where that is part of the contract.

Each phase should also include a lightweight UX review of prompts, command forms, human output, JSON output, artifact paths, and next-step guidance. Any confusing UX found during review should be fixed in the same phase or recorded as an intentional follow-up before the phase is considered done.

Alternative considered: keep manual review only in the final verification phase. That would catch end-to-end issues late, but workspace planning is mostly workflow and agent-facing UX, so each phase needs its own human check while the behavior is still fresh.

### Reduce self-validation bias with evidence-based review

Implementation should define acceptance evidence before marking tasks done. For each phase, the implementer should capture the exact manual commands or interaction path, expected observations, and actual observations. A task is not complete merely because the implementer believes the code matches the design.

When practical, a separate reviewer or fresh agent context should run the manual acceptance checklist and UX review using only the change artifacts, CLI output, and observed filesystem state. If a separate reviewer is not available, the implementer should rerun the checklist from a clean temporary workspace and record the evidence in the change notes or final implementation summary.

Alternative considered: rely on automated tests plus the implementer's final review. Automated tests are necessary, but this change is workflow-heavy and agent-facing, so independent evidence is more useful than confidence alone.

## Deferred Direction

The earlier product notes pointed at a richer workspace model than this slice ships. Keep that direction as follow-up material, not competing current scope.

- Full workspace apply should select or confirm one work focus before implementation. The first work focus should be an affected area with an allowed edit root; later work may add an optional delivery phase when a large change needs sequencing. Until that model exists, workspace apply/verify/archive skills remain guarded.
- Workspace verify and archive should wait for a clear model of partial area completion, final whole-change completion, and how workspace-scoped specs become repo-local canonical specs.
- Scoped plan files may eventually attach at the change, phase, affected-area, or work-focus level. This slice intentionally keeps the first workspace schema close to normal OpenSpec artifacts: proposal, specs, design, and tasks.
- Affected areas can start as registered workspace link names, but future flows may refine or derive them from planning artifacts. That derivation should avoid reintroducing target-first or repo-slice language.
- Workflow skills may later separate generic OpenSpec workflow semantics from agent-specific affordances such as asking questions, tracking todos, or delegating work. This slice only makes generated workflow skills path-agnostic.
- OpenSpec may need a named exploratory-notes convention for preserving unsettled thinking before it is promoted into proposal, design, specs, or tasks. This cleanup keeps the current change folder focused on standard artifacts.

## Risks / Trade-offs

- Skill generation logic may drift from `init/update` → share the same template generation and tool validation helpers where practical.
- Removing unselected skills could remove user-modified files → remove only known OpenSpec-managed workflow skill directories by explicit workflow list.
- `--tools` is less precise than `--agents` in workspace UX → keep `--tools` for CLI consistency, but use "agents" in prompts and human output.
- Global delivery can say `commands` while workspace update remains skills-only → report this explicitly so users know command generation is deferred, not silently broken.
- `config profile` may run from a linked repo inside an opened workspace → resolve the current planning home carefully and apply only to that home.
- Stored workspace skill state can become stale or hand-edited → treat it as diagnostic machine-local state and always reconcile managed files from the active global profile during update.
- Profile-selected workflows may not yet have full workspace semantics → generated skills must guard unsupported actions and avoid repo-local fallbacks.
- Existing generated skills still contain repo-local path assumptions → handle that as a later artifact-context step after workspace-local skills can be installed.
- Status JSON may become too broad → keep fields plain and action-oriented, such as `planningHome`, `artifacts`, `affectedAreas`, `nextSteps`, and `actionContext`.
- Affected area discovery may be ambiguous → start with explicit registered workspace links and allow later refinement instead of parsing free-form Markdown headings as the only source of truth.
- A new schema can drift from repo-local workflow expectations → keep artifact IDs plain and make status/instructions carry the schema-specific paths.
- Skill instructions may lag behind CLI behavior → audit source workflow templates for hardcoded repo-local paths and replace them with the path-agnostic status/instructions pattern.
