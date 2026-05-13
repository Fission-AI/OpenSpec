# Manual Acceptance Evidence

Change: `workspace-change-planning`
Date: 2026-05-14

## Automated Verification

Expected: targeted coverage exercises workspace setup, update, config profile apply, workspace change creation, workspace planning context, guarded workflow skills, cross-platform path helpers, docs/completion coverage, and strict OpenSpec validation.

Actual:

```bash
pnpm run build
pnpm vitest run test/commands/workspace.test.ts test/commands/artifact-workflow.test.ts test/core/workspace/skills.test.ts test/core/planning-home.test.ts test/core/templates/skill-templates-parity.test.ts
node dist/cli/index.js validate workspace-change-planning --strict
git diff --check
```

Observed:
- Build completed successfully.
- Targeted tests passed: workspace command, artifact workflow, workspace skill helpers, planning-home paths, and workflow skill template parity.
- Strict validation reported `Change 'workspace-change-planning' is valid`.
- `git diff --check` reported no whitespace errors.

## Clean Workspace Rerun

Expected: from a clean temporary workspace, setup records links, installs skills only in the workspace root, profile changes can be applied to workspace-local skills, workspace change creation stays in the coordination root, status/instructions expose workspace planning context, linked repos remain untouched, and unsupported workflows stop rather than falling back to repo-local edits.

Actual commands:

```bash
tmp=$(mktemp -d)
mkdir -p "$tmp/config/openspec" "$tmp/data" "$tmp/api" "$tmp/web"
# write global config: custom profile, commands delivery, workflows ["apply"]
XDG_CONFIG_HOME="$tmp/config" XDG_DATA_HOME="$tmp/data" node dist/cli/index.js workspace setup --no-interactive --json --name final-manual --link api="$tmp/api" --link web="$tmp/web" --tools codex
cd "$workspace" && node dist/cli/index.js workspace doctor --json
cd "$workspace" && node dist/cli/index.js config profile core
cd "$workspace/changes" && node dist/cli/index.js update
cd "$workspace" && node dist/cli/index.js new change cross-workspace-login --goal "Unify login across API and web" --areas api,web
mkdir -p "$workspace/changes/cross-workspace-login/specs/api/login"
# write specs/api/login/spec.md
cd "$workspace" && node dist/cli/index.js status --change cross-workspace-login --json
cd "$workspace" && node dist/cli/index.js instructions specs --change cross-workspace-login --json
find "$tmp/api" "$tmp/web" -maxdepth 3 -print | sort
rg -n 'actionContext.mode: "workspace-planning"|resolvedOutputPath|Do not fall back to repo-local paths|openspec/changes/<name>' "$workspace/.codex/skills"
```

Observed:
- Setup JSON reported `profile: custom`, `delivery: commands`, `workflow_ids: ["apply"]`, `selected_agents: ["codex"]`, `skills_only: true`, and the skills-only delivery notice.
- `workspace doctor --json` showed registered links `api` and `web` before any change was created.
- `config profile core` from the workspace printed `Config updated. Run \`openspec workspace update\` to apply it to workspace-local skills.`
- Running `openspec update` from the workspace `changes/` directory redirected to workspace update and refreshed Codex to the core workflows without a false registry warning.
- `new change cross-workspace-login --goal ... --areas api,web` created a workspace change at `changes/cross-workspace-login/` with schema `workspace-planning`.
- Status JSON reported:
  - `schemaName: workspace-planning`
  - `planningHome.kind: workspace`
  - `affectedAreas.known: ["api", "web"]`
  - `actionContext.mode: workspace-planning`
  - `actionContext.allowedEditRoots: []`
  - `artifactPaths.specs.existingOutputPaths` preserved `specs/api/login/spec.md`.
- Instructions JSON for `specs` reported `resolvedOutputPath` as `changes/cross-workspace-login/specs/**/*.md` and preserved the nested existing spec path.
- `find "$tmp/api" "$tmp/web"` showed only the linked folder roots, with no repo-local OpenSpec artifacts created.
- Generated workflow skills contained `actionContext.mode: "workspace-planning"`, `resolvedOutputPath`, and explicit "do not fall back to repo-local paths" guardrails where relevant; no generated skill contained `openspec/changes/<name>`.

## UX Review

Expected: command wording should make the project/workspace distinction clear, tell users which command applies profile changes, and avoid implying linked repos are edited during workspace planning.

Actual:
- Setup/update output says workspace setup installs skills only and workspace command generation is not part of this slice.
- Workspace change creation says "workspace change", prints affected areas, and points to `status` for planning artifacts.
- Status/instructions JSON now provide enough path and action context that a separate artifact-context command is not needed.
- Unsupported workspace apply, sync, archive, bulk archive, and verify workflows are intentionally guarded. They stop and ask for an explicit affected-area implementation workflow instead of editing linked repos.
- Fresh-agent rerun was not available in this session; as fallback, the clean temporary workspace rerun above was performed after the final path and registry fixes.
