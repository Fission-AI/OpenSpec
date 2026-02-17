# Project-Local Schemas

## Summary

Add project-local schema resolution (`./openspec/schemas/`) as the highest priority in the schema lookup chain. This enables teams to version control custom workflow schemas with their repository.

## Motivation

Currently, schema resolution is 2-level:
1. User override: `~/.local/share/openspec/schemas/<name>/`
2. Package built-in: `<npm-package>/schemas/<name>/`

This creates friction for teams:
- Custom schemas must be set up per-machine via XDG paths
- Cannot share schemas via version control
- No single source of truth for team workflows

## Design Decisions

### 3-Level Resolution Order

```
1. ./openspec/schemas/<name>/                    # Project-local (NEW)
2. ~/.local/share/openspec/schemas/<name>/       # User global (XDG)
3. <npm-package>/schemas/<name>/                 # Package built-in
```

Project-local takes highest priority, enabling:
- Version-controlled custom workflows
- Automatic team sharing via git
- No per-machine setup required

### Fork Model (Not Inheritance)

Custom schemas are complete definitions, not extensions. There is no `extends` keyword.

**Rationale:** Simplicity. Inheritance adds complexity (conflict resolution, partial overrides, debugging "where did this come from?"). Users who need custom workflows can define them fully. This keeps the mental model simple:
- Use a preset → Configure path (see project-config change)
- Need different structure → Fork path (define your own)

### Directory Structure

```
openspec/
├── schemas/                      # Project-local schemas
│   └── my-workflow/
│       ├── schema.yaml           # Full schema definition
│       └── templates/
│           ├── artifact1.md
│           ├── artifact2.md
│           └── ...
└── changes/
```

### Schema Naming

Project-local schemas are referenced by their directory name:
- `openspec/schemas/my-workflow/` → referenced as `my-workflow`
- Works with `--schema my-workflow` flag
- Works with `schema: my-workflow` in config.yaml (see project-config change)

## Scope

### In Scope

- Add `getProjectSchemasDir()` function to resolver
- Update `getSchemaDir()` to check project-local first
- Update `listSchemas()` to include project schemas
- Update `listSchemasWithInfo()` to include `source: 'project'`
- Update `schemasCommand` output to show project schemas

### Out of Scope

- Schema management CLI (`openspec schema copy/which/diff/reset`) - future enhancement
- Schema inheritance/extends - explicitly not supported
- Template-level overrides (partial fork) - explicitly not supported

## User Experience

### Creating a Custom Schema

```bash
# Create schema directory
mkdir -p openspec/schemas/my-workflow/templates

# Define schema
cat > openspec/schemas/my-workflow/schema.yaml << 'EOF'
name: my-workflow
version: 1
description: Our team's planning workflow

artifacts:
  - id: research
    generates: research.md
    template: research.md
    description: Background research
    requires: []

  - id: proposal
    generates: proposal.md
    template: proposal.md
    description: Change proposal
    requires: [research]

  - id: tasks
    generates: tasks.md
    template: tasks.md
    description: Implementation tasks
    requires: [proposal]
EOF

# Create templates
echo "# Research\n\n..." > openspec/schemas/my-workflow/templates/research.md
# ... etc
```

### Using the Custom Schema

```bash
# Via CLI flag
openspec new change add-feature --schema my-workflow
openspec status --change add-feature --schema my-workflow

# Via config.yaml (requires project-config change)
# schema: my-workflow
```

### Team Sharing

```bash
# Commit to repo
git add openspec/schemas/
git commit -m "Add custom workflow schema"
git push

# Team members get it automatically
git pull
openspec status --change add-feature --schema my-workflow  # Just works
```

## Implementation Notes

### Files to Modify

| File | Changes |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | Add `getProjectSchemasDir()`, update resolution order |
| `src/commands/artifact-workflow.ts` | Update `schemasCommand` to show source |

### Project Root Detection

Use existing `findProjectRoot()` pattern or current working directory. The project-local schemas directory is always `./openspec/schemas/` relative to project root.

### Source Indication

`listSchemasWithInfo()` returns `source: 'project' | 'user' | 'package'`. Update type definition and implementation.

## Testing Considerations

- Create temp project with local schema, verify resolution priority
- Verify local schema overrides user override with same name
- Verify `listSchemas()` includes project schemas
- Verify `schemasCommand` shows correct source labels

## Related Changes

- **project-config**: Adds `config.yaml` with `schema` field that can reference project-local schemas
