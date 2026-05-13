## Context

Workspace setup already creates a planning home, records linked repos or folders, stores a preferred opener, and maintains the root open surface. For workspace change planning to work in practice, the opened agent also needs OpenSpec workflow skills available from that workspace root.

Repo-local `openspec init` and `openspec update` already provide the user model for choosing agent surfaces and generating skills. Workspace setup should feel similar, but the installation target is the workspace root rather than any linked repo or folder.

The existing artifact workflow assumes a change lives under a repo-local `openspec/changes/<id>` path. Workspace planning needs the same workflow vocabulary, but the planning home may be a workspace root and the implementation homes may be linked repos or folders.

## Goals / Non-Goals

**Goals:**
- Install OpenSpec agent skills into the workspace root during workspace setup.
- Let users choose which agents receive skills with familiar `--tools` semantics.
- Let users refresh, add, or remove workspace-local skills later through `workspace update`.
- Add a built-in workspace planning schema for workspace-scoped changes.
- Create workspace changes under the workspace planning path.
- Represent affected areas without forcing implementation artifacts into linked repos.
- Give agents machine-readable planning context through status/instructions output.
- Preserve the workspace boundary: linked repos and folders remain untouched during setup/update.

**Non-Goals:**
- Generating slash commands as part of workspace setup.
- Installing skills into linked repos or folders.
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

### Preselect the preferred opener when possible

Interactive setup should preselect the preferred opener when that opener maps to a skill-capable agent. The user can accept the default, add more agents, or deselect it.

Alternative considered: install skills only for the preferred opener. That is simpler, but opener choice means "how should I open this workspace" while skill selection means "which agents should understand OpenSpec here."

### Generate workspace-local skills only

Workspace setup/update should generate skills under the workspace root, such as `.codex/skills/` or `.claude/skills/`. It should not generate slash commands in this slice because some command adapters resolve to global locations, and workspace setup should remain local and predictable.

Alternative considered: mirror `init` exactly and generate both skills and commands. That risks surprising global writes and makes the setup boundary harder to explain.

### Add `workspace update` for skill refresh

`openspec workspace update` should refresh, add, or remove workspace-local OpenSpec skills after setup. It should resolve the current workspace when run from inside a workspace, and also support named and non-interactive forms.

Alternative considered: reuse `openspec update` from inside the workspace. That command currently means repo/project update, while workspace update needs workspace selection, workspace JSON/status behavior, and linked-repo safety rules.

### Resolve a planning home before acting

Workflow commands should resolve whether the current change belongs to a repo-local planning home or a workspace planning home before computing paths. The resolver should identify the planning root, change root, linked areas when present, and whether implementation edits are allowed.

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
  areas.md                # known, suspected, and unresolved affected areas
  design.md               # cross-area decisions
  tasks.md                # coordination and planning tasks
```

The first schema should stay intentionally small. Area-specific folders can come later once scoped artifact paths and apply semantics are stable.

Alternative considered: reuse `spec-driven` and make all workspace differences implicit in status output. That hides the fact that workspace planning needs an affected-area artifact and different instructions from repo-local spec work.

Alternative considered: create separate workspace workflow skills instead of a schema. That would duplicate workflow guidance and make workspace mode feel like a different product.

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

## Risks / Trade-offs

- Skill generation logic may drift from `init/update` → share the same template generation and tool validation helpers where practical.
- Removing unselected skills could remove user-modified files → remove only known OpenSpec-managed workflow skill directories by explicit workflow list.
- `--tools` is less precise than `--agents` in workspace UX → keep `--tools` for CLI consistency, but use "agents" in prompts and human output.
- Existing generated skills still contain repo-local path assumptions → handle that as a later artifact-context step after workspace-local skills can be installed.
- Status JSON may become too broad → keep fields plain and action-oriented, such as `planningHome`, `artifacts`, `affectedAreas`, `nextSteps`, and `actionContext`.
- Affected area discovery may be ambiguous → start with explicit registered workspace links and allow later refinement instead of parsing free-form Markdown headings as the only source of truth.
- A new schema can drift from repo-local workflow expectations → keep artifact IDs plain and make status/instructions carry the schema-specific paths.
- Skill instructions may lag behind CLI behavior → audit source workflow templates for hardcoded repo-local paths and replace them with the path-agnostic status/instructions pattern.
