## Context

Multi-repository architectures are increasingly common:
- Separate frontend/backend repositories
- Monorepos with independent packages
- Microservices with shared specifications

These teams need coordinated specification management across codebases. Currently, OpenSpec assumes single-repo context, forcing teams to invent ad-hoc conventions for cross-repo coordination.

**Stakeholders**: Teams with multi-repo architectures, AI coding assistants working across repos.

## Goals / Non-Goals

### Goals
- Enable workspace-level coordination for multi-repo projects
- Provide validation for cross-repo change conventions
- Keep each repo independently functional (federated, not centralized)
- Extend existing commands (`init`, `validate`) rather than creating parallel workflows

### Non-Goals
- Replacing single-repo workflow (workspace is opt-in)
- Forcing specific repo organization patterns
- Cross-repo spec deduplication or inheritance (future consideration)
- Real-time sync between repos (out of scope)

## Decisions

### Decision: Federated Workspace Model
Workspaces coordinate independent repos rather than centralizing all specs.

**Rationale**: Each repo remains fully functional with its own `openspec/` directory. The workspace layer provides optional coordination without forcing migration.

**Alternatives considered**:
- Centralized model (all specs in parent) - rejected: forces specific structure, breaks independent repo workflows
- Submodule approach - rejected: adds git complexity, sync friction

### Decision: workspace.yaml Configuration
New configuration file defines repo mappings and conventions.

**Schema (MVP)**:
```yaml
name: string                    # Workspace display name
repos:                          # Child repository list
  - name: string                # Identifier (used in validation messages)
    path: string                # Relative path from workspace root
    role?: string               # Optional hint: api, client, shared, lib
conventions?:                   # Optional enforcement settings
  crossRepoChanges?:
    requireImpactSection?: boolean    # Require ## Impact in cross-repo proposals
    requireImplementationOrder?: boolean  # Warn if no order specified
```

**Location**: `openspec/workspace.yaml` in workspace root.

### Decision: Extend Existing Commands
Add `--workspace` flag to `init` and `validate` rather than new commands.

**Rationale**: Follows Unix philosophy of composable commands. Reduces learning curve for existing users.

### Decision: Impact Section Validation
Cross-repo changes must document affected repos in proposal.md.

**Required format**:
```markdown
## Impact
- Affected repos:
  - backend: api/endpoints/, models/
  - mobile: services/api.ts
- Implementation order: backend first, then mobile
```

**Validation rules**:
1. Changes referencing multiple repos MUST have `## Impact` section
2. Repo names in Impact MUST exist in workspace.yaml
3. Implementation order is recommended (warning, not error)

## Architecture

### New Components

```
src/
├── core/
│   ├── workspace.ts              # WorkspaceManager class
│   ├── schemas/
│   │   └── workspace.ts          # Zod schema for workspace.yaml
│   ├── validation/
│   │   └── workspace-rules.ts    # Cross-repo validation rules
│   └── templates/
│       └── workspace.ts          # workspace.yaml template
```

### WorkspaceManager Class

```typescript
class WorkspaceManager {
  static async load(root: string): Promise<Workspace | null>
  static async discover(root: string): Promise<string[]>  // Find all repo openspec dirs
  static async validateWorkspace(workspace: Workspace): Promise<ValidationReport>
  static async validateCrossRepoChange(change: Change, workspace: Workspace): Promise<ValidationReport>
}

interface Workspace {
  name: string
  root: string
  repos: WorkspaceRepo[]
  conventions: WorkspaceConventions
}

interface WorkspaceRepo {
  name: string
  path: string
  role?: string
  openspecDir?: string  // Resolved path to repo's openspec/
}
```

### Command Flow: `openspec init --workspace`

```
1. Validate current directory is appropriate (has child dirs)
2. Prompt for workspace name
3. Auto-discover child directories with .git or package.json
4. Present multi-select for repo inclusion
5. Prompt for repo roles (optional)
6. Create openspec/ structure
7. Generate workspace.yaml with selected repos
8. Generate workspace-aware AGENTS.md
9. Optionally initialize child repos that lack openspec/
```

### Command Flow: `openspec validate --workspace`

```
1. Load workspace.yaml
2. Validate workspace.yaml schema
3. For each repo in workspace:
   a. Validate repo's openspec/ exists
   b. Run standard validation on repo
   c. Collect results
4. For changes in workspace root:
   a. Detect cross-repo changes (Impact section references multiple repos)
   b. Validate Impact section format
   c. Validate repo references exist in workspace.yaml
5. Aggregate and display results
```

## Risks / Trade-offs

### Risk: Workspace Drift
Repos may add/remove openspec/ independently, causing workspace.yaml to become stale.

**Mitigation**: `validate --workspace` warns about missing repo openspec directories. Future: `openspec workspace sync` command.

### Risk: Complexity Creep
Workspace features could complicate the simple single-repo experience.

**Mitigation**: Workspace is strictly opt-in. Single-repo workflow unchanged. `--workspace` flag required for all workspace operations.

### Risk: Cross-Repo Ordering Enforcement
Enforcing implementation order across repos is complex and may not fit all workflows.

**Mitigation**: MVP only warns about missing implementation order. Future versions could integrate with CI/CD for actual enforcement.

## Migration Plan

No migration required - workspace is additive. Existing single-repo projects continue to work unchanged.

**Adoption path for multi-repo teams**:
1. Run `openspec init --workspace` in parent directory
2. Select which child repos to include
3. Existing repos with openspec/ are linked, others can be initialized

## Future Enhancements (Post-MVP)

### Phase 2: Aggregate Commands
```bash
openspec list --workspace      # List changes across all repos
openspec show --workspace      # Dashboard with workspace tabs
openspec archive --workspace   # Coordinate archiving
```

### Phase 3: Advanced Validation
- Validate implementation order is followed (backend merged before mobile)
- Cross-reference specs between repos (detect conflicts)
- Shared capability definitions (specs that apply to multiple repos)

### Phase 4: CI/CD Integration
- GitHub Action for workspace validation
- PR checks that enforce cross-repo coordination
- Auto-labeling for cross-repo changes

## Open Questions

1. Should workspace.yaml support glob patterns for repo discovery? (e.g., `packages/*`)
2. Should there be a `openspec workspace add <repo>` command for incremental adoption?
3. How should workspace handle repos with different OpenSpec versions?