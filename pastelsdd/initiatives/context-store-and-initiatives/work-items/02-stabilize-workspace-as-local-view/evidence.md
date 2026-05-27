# Stabilize Workspace As Local View Evidence

## Direction Evidence

`direction.md` says the durable shared object is a synced context store, with
initiatives as the first major collection. It defines workspaces as local
working views over context stores and repos, and repo changes as repo/team-owned
implementation plans.

The locked product boundary supersedes the older model where a workspace-level
`changes/` tree owned the canonical shared cross-repo plan. Existing
workspace-planning behavior can remain as beta or legacy infrastructure, but it
should not steer new lifecycle design.

## Subagent Research

Implementation research found that workspace setup, link, relink, list, open,
update, and doctor already mostly behave like local-view infrastructure:

- shared link names live in workspace state
- machine-local paths and opener/skill state live in local state
- `workspace open` launches linked folders as a local working set
- linked repos are treated as context for workspace-planning commands
- `workspace update` refreshes workspace-local skills and leaves linked repos
  untouched

Guidance research found that the generated `AGENTS.md` block is the most
important mismatch because it still frames the workspace as planning across
linked repos and says to use `changes/` for workspace-level planning.

Test research found strong current coverage for setup/list/doctor, link/relink,
open, update, artifact placement, and workspace-planning guards. The targeted
workspace/artifact test slice passed, as did the skill-template parity test.

## Main Risk

If generated workspace guidance continues to recommend workspace-level
`changes/`, agents may treat the workspace as the durable shared planning
object even though the initiative direction assigns durable coordination to
initiatives and implementation planning to repo-local changes.

## Implementation Evidence

The first implementation slice updates the generated workspace `AGENTS.md`
guidance and makes `workspace update` refresh the workspace-local open surface.
It also updates workspace-planning action context so beta workspace artifacts are
reported as `workspace-local` compatibility context instead of the source of
truth.

Doctor/status review found that local path mappings, unresolved links, repair
steps, malformed local state, missing local state, repo specs paths, and skill
drift warnings are already covered. Normal installed-skill summaries are
deferred for now; the current slice only updates stale `workspace update`
wording so it matches the guidance refresh behavior.

Verification:

- `pnpm run build`
- `pnpm exec vitest run test/commands/workspace.test.ts test/commands/artifact-workflow.test.ts test/core/workspace/foundation.test.ts`
- `pnpm run lint`
- `git diff --check`

## Closeout Evidence

Live docs no longer describe workspaces as durable planning homes or as the
canonical place for cross-repo planning. Historical and deferred workspace
artifacts remain as reference material, with active deferred proposals labeled
so they do not steer the next implementation slice.
