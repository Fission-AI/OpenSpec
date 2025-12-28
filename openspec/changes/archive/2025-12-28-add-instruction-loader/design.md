## Context

This is Slice 3 of the artifact-graph POC. We have:
- `ArtifactGraph` class with graph operations (Slice 1)
- `detectCompleted()` for filesystem-based state detection (Slice 1)
- `resolveSchema()` for XDG schema resolution (Slice 1)
- `createChange()` and `validateChangeName()` utilities (Slice 2)

After `restructure-schema-directories` is implemented, schemas will be self-contained directories:
```
schemas/<name>/
├── schema.yaml
└── templates/
    └── *.md
```

This proposal adds template loading and instruction enrichment on top of that structure.

## Goals / Non-Goals

**Goals:**
- Load templates from schema directories
- Enrich templates with change-specific context (dependency status)
- Format change status for CLI output

**Non-Goals:**
- Template authoring UI
- Dynamic template compilation/execution
- Caching (keep it stateless like the rest)

## Decisions

### 1. Pure functions over classes

Follow the pattern in `resolver.ts` and `state.ts`. Use a simple `ChangeContext` interface with pure functions:

```typescript
interface ChangeContext {
  changeName: string;
  changeDir: string;
  schemaName: string;
  graph: ArtifactGraph;
  completed: CompletedSet;
}

function loadChangeContext(projectRoot: string, changeName: string, schemaName?: string): ChangeContext
function loadTemplate(schemaName: string, templatePath: string): string
function getInstructions(artifactId: string, context: ChangeContext): string
function formatStatus(context: ChangeContext): string
```

**Why:** Matches existing codebase patterns. Easier to test. No hidden state.

### 2. Template resolution from schema directory

Templates are loaded from the schema's `templates/` subdirectory:

```typescript
function loadTemplate(schemaName: string, templatePath: string): string {
  const schemaDir = getSchemaDir(schemaName);  // From resolver.ts
  const fullPath = path.join(schemaDir, 'templates', templatePath);
  return fs.readFileSync(fullPath, 'utf-8');
}
```

Resolution is handled by `getSchemaDir()` which already checks user override → package built-in.

**Why:** Leverages existing schema resolution. Templates are co-located with schemas.

### 3. Template path from artifact definition

The artifact's `template` field is a path relative to the schema's `templates/` directory:

```yaml
artifacts:
  - id: proposal
    template: "proposal.md"  # → schemas/<schema>/templates/proposal.md
```

**Why:** Explicit, simple, no magic.

### 4. Minimal context injection

Templates are markdown. Injection prepends a header section with context:

```markdown
---
change: add-auth
artifact: proposal
schema: spec-driven
output: openspec/changes/add-auth/proposal.md
---

## Dependencies
- [x] (none - this is a root artifact)

## Next Steps
After creating this artifact, you can work on: design, specs

---

[original template content...]
```

**Why:** Simple string concatenation. No template engine dependency. Clear separation.

### 5. Status output format

```markdown
## Change: add-auth (spec-driven)

| Artifact | Status | Output |
|----------|--------|--------|
| proposal | done | proposal.md |
| specs | ready | specs/*.md |
| design | blocked (needs: proposal) | design.md |
| tasks | blocked (needs: specs, design) | tasks.md |
```

**Why:** Markdown table is readable in terminal and docs. Matches CLI output style.

## File Structure

```
src/core/artifact-graph/
├── index.ts              # Add new exports
├── template.ts           # NEW: Template loading
├── context.ts            # NEW: ChangeContext loading
└── instructions.ts       # NEW: Enrichment and formatting
```

## Risks / Trade-offs

**Dependency on restructure-schema-directories:**
- This proposal requires the schema restructure to be done first
- Mitigation: Clear dependency documented, implement in order

**No template engine:**
- Pro: Zero dependencies, simple code
- Con: Limited expressiveness
- Mitigation: Current use case only needs static templates + header injection

## Migration Plan

N/A - new capability, no existing code to migrate.

## Open Questions

None.
