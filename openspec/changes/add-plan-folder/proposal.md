## Why

Big work is bigger than one change, and OpenSpec has no way in above
`propose`. Roadmaps, PRDs, and visions live outside the tool, and the
translation from them into changes is hand-rolled by every serious team.

The plan folder is that way in. OpenSpec owns almost nothing: a folder
convention, one metadata line, one rollup, one skill.

## What Changes

- **A convention, not a format.** A plan is one folder, `openspec/plan/`,
  holding the user's destination — `product.md`, a roadmap, any artifact name
  or convention; one file is a valid plan. Numbered subfolders add ordered
  stages when visible order is wanted; unnumbered entries are context.
- **Changes point up.** One line in a change's `.openspec.yaml` — `plan: local`
  or `plan: <store-id>`. No manifest anywhere. `new change` gains `--plan`.
- **One rollup.** `openspec list --plan [--store <id>]` shows the stages and
  every change on this machine pointing at the plan, with live task status —
  including changes in other registered repos pointing at a store's plan.
- **One skill.** `openspec-plan` (`/opsx:plan`): explore-style stance that
  reads the folder, maps in-flight changes against the destination, translates
  artifact to artifact, bridges into changes, and syncs status back up. It is
  instructed to write less, not more.
- Referenced stores' plan stages appear in `openspec context` and the agent
  instruction block.

## Capabilities

### New Capabilities
- `plan-folder`: the plan convention, the upward `plan:` link, the
  `list --plan` rollup, and plan surfacing in context/instructions.

### Modified Capabilities
None.

## Impact

- Commands: `list` (adds `--plan`), `new change` (adds `--plan`), `context`
  and `instructions` (surface a store's plan stages). All additive.
- Skill set: one new optional workflow, `plan` (not in the core profile).
- No breaking changes.
