## Why
Multi-repository projects (monorepos with independent packages, or separate frontend/backend repos) lack a coordinated way to manage specifications across codebases. Teams must manually track cross-repo impacts, leading to missed dependencies and inconsistent implementation ordering. OpenSpec currently assumes single-repo context, leaving multi-repo teams without tooling support.

## What Changes
- Add `openspec init --workspace` command that creates a parent orchestrator structure with `workspace.yaml` configuration linking multiple repositories.
- Introduce `workspace.yaml` schema defining repo mappings, roles, and cross-repo conventions (e.g., requiring Impact sections for cross-repo changes).
- Add `openspec validate --workspace` command that aggregates validation across all repos and enforces cross-repo change conventions.
- Extend AGENTS.md template with workspace-aware instructions guiding AI assistants on multi-repo coordination.
- Add validation rules for cross-repo changes: require Impact section, validate referenced repos exist in workspace.yaml, warn on missing implementation order.

## Impact
- Affected specs: `specs/cli-workspace` (new), `specs/cli-init` (modified), `specs/cli-validate` (modified)
- Affected code: `src/core/workspace.ts` (new), `src/core/schemas/workspace.ts` (new), `src/core/validation/workspace-rules.ts` (new), `src/core/init.ts`, `src/commands/validate.ts`, `src/core/templates/index.ts`, `src/cli/index.ts`