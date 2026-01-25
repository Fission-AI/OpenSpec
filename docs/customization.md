# Customization

OpenSpec provides two levels of customization:

1. **Project Config** (`openspec/config.yaml`) - Lightweight per-project customization for default schemas, shared context, and per-artifact rules
2. **Schema Overrides** - Full schema and template customization via XDG directories

---

## Project Configuration

The `openspec/config.yaml` file provides a lightweight customization layer that lets teams:

- **Set a default schema** - New changes automatically use this schema instead of specifying `--schema` every time
- **Inject project context** - Shared context (tech stack, conventions) shown to AI when creating any artifact
- **Add per-artifact rules** - Custom rules that only apply to specific artifacts (e.g., proposal, specs)

### Creating a Config

You can create the config through the interactive setup:

```bash
openspec init
```

Or create it manually:

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
```

### How Config Affects Workflows

**Default schema selection:**

```bash
# Without config: must specify schema
openspec new change my-feature --schema spec-driven

# With config: schema is automatic
openspec new change my-feature
```

**Context and rules injection:**

When generating instructions for an artifact, context and rules are injected:

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
API style: RESTful, documented in docs/api.md
...
</context>

<rules>
- Include rollback plan
- Identify affected teams
</rules>

<template>
[Schema's built-in template]
</template>
```

- **Context** appears in ALL artifacts
- **Rules** ONLY appear for the matching artifact

### Schema Resolution Precedence

1. CLI flag wins: `openspec new change feature --schema tdd`
2. Change metadata (if `.openspec.yaml` specifies schema)
3. Project config (`openspec/config.yaml`)
4. Default schema (`spec-driven`)

### Error Handling

The config provides graceful error handling:

```bash
# Typo in schema name - shows suggestions
# Schema 'spec-drivne' not found
# Did you mean: spec-driven (built-in)

# Unknown artifact ID in rules - warns but continues
# ⚠️ Unknown artifact ID in rules: "testplan". Valid IDs for schema "spec-driven": ...
```

---

## Schema Overrides

For deeper customization, you can override entire schemas or templates.

### How Schema Resolution Works

OpenSpec uses a 2-level schema resolution system following the XDG Base Directory Specification:

1. **User override**: `${XDG_DATA_HOME}/openspec/schemas/<name>/`
2. **Package built-in**: `<npm-package>/schemas/<name>/`

When a schema is requested, the resolver checks the user directory first. If found, that entire schema directory is used. Otherwise, it falls back to the package's built-in schema.

### Override Directories

| Platform | Path |
|----------|------|
| macOS/Linux | `~/.local/share/openspec/schemas/` |
| Windows | `%LOCALAPPDATA%\openspec\schemas\` |
| All (if set) | `$XDG_DATA_HOME/openspec/schemas/` |

### Manual Schema Override

To override the default `spec-driven` schema:

**1. Create the directory structure:**

```bash
# macOS/Linux
mkdir -p ~/.local/share/openspec/schemas/spec-driven/templates
```

**2. Find and copy the default schema files:**

```bash
# Find the package location
npm list -g openspec --parseable

# Copy files from the package's schemas/ directory
cp <package-path>/schemas/spec-driven/schema.yaml ~/.local/share/openspec/schemas/spec-driven/
cp <package-path>/schemas/spec-driven/templates/*.md ~/.local/share/openspec/schemas/spec-driven/templates/
```

**3. Modify the copied files:**

Edit `schema.yaml` to change the workflow structure:

```yaml
name: spec-driven
version: 1
description: My custom workflow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal
    template: proposal.md
    requires: []
  # Add, remove, or modify artifacts...
```

Edit templates in `templates/` to customize the content guidance.

### Current Limitations

| Issue | Impact |
|-------|--------|
| **Path discovery** | Users must know XDG conventions and platform-specific paths |
| **Package location** | Finding the npm package path varies by install method |
| **No scaffolding** | Users must manually create directories and copy files |
| **No verification** | No way to confirm which schema is actually being resolved |
| **Full copy required** | Must copy entire schema even to change one template |

### Related Files

| File | Purpose |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | Schema resolution logic |
| `src/core/artifact-graph/instruction-loader.ts` | Template loading |
| `src/core/global-config.ts` | XDG path helpers |
| `schemas/spec-driven/` | Default schema and templates |
