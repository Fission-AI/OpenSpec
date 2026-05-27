## Why

The recent split of `skill-templates.ts` into workflow modules improved readability, but the generation pipeline is still fragmented across multiple layers:

- Workflow definitions are split from projection logic (`getSkillTemplates`, `getCommandTemplates`, `getCommandContents`)
- Tool capability and compatibility are spread across `AI_TOOLS`, `CommandAdapterRegistry`, and hardcoded lists like `SKILL_NAMES`
- Agent/tool-specific transformations (for example OpenCode command reference rewrites) are applied in different places (`init`, `update`, and adapter code)
- Artifact writing logic is duplicated across `init`, `update`, and legacy-upgrade flow

This fragmentation creates drift risk (missing exports, missing metadata parity, mismatched counts/support) and makes future workflow/tool additions slower and less predictable.

## What Changes

- Introduce a canonical `WorkflowManifest` as the single source of truth for all workflow artifacts
- Introduce a `ToolProfileRegistry` to centralize tool capabilities (skills path, command adapter, transforms)
- Introduce a first-class transform pipeline with explicit phases (`preAdapter`, `postAdapter`) and scopes (`skill`, `command`, `both`)
- Introduce a shared `ArtifactSyncEngine` used by `init`, `update`, and legacy upgrade paths
- Add strict validation and test guardrails to preserve fidelity during migration and future changes

## Capabilities

### New Capabilities

- `template-artifact-pipeline`: Unified workflow manifest, tool profile registry, transform pipeline, and sync engine for skill/command generation

### Modified Capabilities

- `command-generation`: Extended to support ordered transform phases around adapter rendering
- `cli-init`: Uses shared artifact sync orchestration instead of bespoke loops
- `cli-update`: Uses shared artifact sync orchestration instead of bespoke loops

## Impact

- **Primary refactor area**:
  - `src/core/templates/*`
  - `src/core/shared/skill-generation.ts`
  - `src/core/command-generation/*`
  - `src/core/init.ts`
  - `src/core/update.ts`
  - `src/core/shared/tool-detection.ts`
- **Testing additions**:
  - Manifest completeness tests (workflows, required metadata, projection parity)
  - Transform ordering and applicability tests
  - End-to-end parity tests for generated skill/command outputs across tools
- **User-facing behavior**:
  - No new CLI surface area required
  - Existing generated artifacts remain behaviorally equivalent unless explicitly changed in future deltas
