## 1. Core Infrastructure
- [ ] 1.1 Create `src/core/schemas/workspace.ts` with Zod schema for workspace.yaml (name, repos array, conventions object).
- [ ] 1.2 Create `src/core/workspace.ts` with WorkspaceManager class implementing load(), discover(), and validateWorkspace() methods.
- [ ] 1.3 Create `src/core/templates/workspace.ts` with default workspace.yaml template content.
- [ ] 1.4 Add workspace constants to `src/core/config.ts` (WORKSPACE_FILE_NAME, default conventions).

## 2. Init Command Extension
- [ ] 2.1 Add `--workspace` flag to init command in `src/cli/index.ts`.
- [ ] 2.2 Extend `src/core/init.ts` with workspace initialization mode that creates workspace.yaml alongside standard openspec/ structure.
- [ ] 2.3 Implement repo discovery logic to auto-detect child directories with .git or package.json.
- [ ] 2.4 Add interactive prompts for workspace name, repo selection, and optional role assignment.
- [ ] 2.5 Generate workspace-aware AGENTS.md section explaining cross-repo coordination workflow.

## 3. Validation Rules
- [ ] 3.1 Create `src/core/validation/workspace-rules.ts` with validation functions for workspace.yaml schema and cross-repo changes.
- [ ] 3.2 Implement Impact section detection: identify changes that reference multiple repos.
- [ ] 3.3 Implement Impact section validation: require `## Impact` with `Affected repos:` for cross-repo changes.
- [ ] 3.4 Implement repo reference validation: ensure repo names in Impact exist in workspace.yaml.
- [ ] 3.5 Implement implementation order warning: warn if cross-repo change lacks `Implementation order:` line.

## 4. Validate Command Extension
- [ ] 4.1 Add `--workspace` flag to validate command in `src/cli/index.ts`.
- [ ] 4.2 Extend `src/commands/validate.ts` to aggregate validation across all workspace repos.
- [ ] 4.3 Integrate workspace-rules.ts validation for cross-repo changes in workspace root.
- [ ] 4.4 Format workspace validation output with per-repo sections and cross-repo summary.

## 5. Template Updates
- [ ] 5.1 Add workspace section to AGENTS.md template in `src/core/templates/index.ts` explaining multi-repo workflow.
- [ ] 5.2 Update project.md template with optional cross-repo conventions section.
- [ ] 5.3 Create workspace-specific proposal.md template guidance mentioning Impact section requirement.

## 6. Testing
- [ ] 6.1 Add unit tests for WorkspaceManager.load() with valid and invalid workspace.yaml files.
- [ ] 6.2 Add unit tests for workspace validation rules (Impact section detection, repo reference validation).
- [ ] 6.3 Add integration test for `openspec init --workspace` creating correct structure.
- [ ] 6.4 Add integration test for `openspec validate --workspace` aggregating results correctly.
- [ ] 6.5 Manual smoke test: initialize workspace, create cross-repo change, validate.

## 7. Documentation
- [ ] 7.1 Update README.md with workspace feature documentation and usage examples.
- [ ] 7.2 Add workspace.yaml schema reference to docs.
- [ ] 7.3 Document cross-repo change workflow with Impact section examples.