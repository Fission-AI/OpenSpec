# Customization

OpenSpec provides three levels of customization:

| Level | What it does | Best for |
|-------|--------------|----------|
| **Project Config** | Set defaults, inject context/rules | Most teams |
| **Custom Schemas** | Define your own workflow artifacts | Teams with unique processes |
| **Global Overrides** | Share schemas across all projects | Power users |

---

## Project Configuration

The `openspec/config.yaml` file is the easiest way to customize OpenSpec for your team. It lets you:

- **Set a default schema** - Skip `--schema` on every command
- **Inject project context** - AI sees your tech stack, conventions, etc.
- **Add per-artifact rules** - Custom rules for specific artifacts

### Quick Setup

```bash
openspec init
```

This walks you through creating a config interactively. Or create one manually:

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

### How It Works

**Default schema:**

```bash
# Without config
openspec new change my-feature --schema spec-driven

# With config - schema is automatic
openspec new change my-feature
```

**Context and rules injection:**

When generating any artifact, your context and rules are injected into the AI prompt:

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
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

### Schema Resolution Order

When OpenSpec needs a schema, it checks in this order:

1. CLI flag: `--schema <name>`
2. Change metadata (`.openspec.yaml` in the change folder)
3. Project config (`openspec/config.yaml`)
4. Default (`spec-driven`)

---

## Custom Schemas

When project config isn't enough, create your own schema with a completely custom workflow. Custom schemas live in your project's `openspec/schemas/` directory and are version-controlled with your code.

```text
your-project/
├── openspec/
│   ├── config.yaml        # Project config
│   ├── schemas/           # Custom schemas live here
│   │   └── my-workflow/
│   │       ├── schema.yaml
│   │       └── templates/
│   └── changes/           # Your changes
└── src/
```

### Fork an Existing Schema

The fastest way to customize is to fork a built-in schema:

```bash
openspec schema fork spec-driven my-workflow
```

This copies the entire `spec-driven` schema to `openspec/schemas/my-workflow/` where you can edit it freely.

**What you get:**

```text
openspec/schemas/my-workflow/
├── schema.yaml           # Workflow definition
└── templates/
    ├── proposal.md       # Template for proposal artifact
    ├── spec.md           # Template for specs
    ├── design.md         # Template for design
    └── tasks.md          # Template for tasks
```

Now edit `schema.yaml` to change the workflow, or edit templates to change what AI generates.

### Create a Schema from Scratch

For a completely fresh workflow:

```bash
# Interactive
openspec schema init research-first

# Non-interactive
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

### Schema Structure

A schema defines the artifacts in your workflow and how they depend on each other:

```yaml
# openspec/schemas/my-workflow/schema.yaml
name: my-workflow
version: 1
description: My team's custom workflow

artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal document
    template: proposal.md
    instruction: |
      Create a proposal that explains WHY this change is needed.
      Focus on the problem, not the solution.
    requires: []

  - id: design
    generates: design.md
    description: Technical design
    template: design.md
    instruction: |
      Create a design document explaining HOW to implement.
    requires:
      - proposal    # Can't create design until proposal exists

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires:
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

**Key fields:**

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier, used in commands and rules |
| `generates` | Output filename (supports globs like `specs/**/*.md`) |
| `template` | Template file in `templates/` directory |
| `instruction` | AI instructions for creating this artifact |
| `requires` | Dependencies - which artifacts must exist first |

### Templates

Templates are markdown files that guide the AI. They're injected into the prompt when creating that artifact.

```markdown
<!-- templates/proposal.md -->
## Why

<!-- Explain the motivation for this change. What problem does this solve? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities or modifications. -->

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

Templates can include:
- Section headers the AI should fill in
- HTML comments with guidance for the AI
- Example formats showing expected structure

### Validate Your Schema

Before using a custom schema, validate it:

```bash
openspec schema validate my-workflow
```

This checks:
- `schema.yaml` syntax is correct
- All referenced templates exist
- No circular dependencies
- Artifact IDs are valid

### Use Your Custom Schema

Once created, use your schema with:

```bash
# Specify on command
openspec new change feature --schema my-workflow

# Or set as default in config.yaml
schema: my-workflow
```

### Debug Schema Resolution

Not sure which schema is being used? Check with:

```bash
# See where a specific schema resolves from
openspec schema which my-workflow

# List all available schemas
openspec schema which --all
```

Output shows whether it's from your project, user directory, or the package:

```text
Schema: my-workflow
Source: project
Path: /path/to/project/openspec/schemas/my-workflow
```

---

> **Note:** OpenSpec also supports user-level schemas at `~/.local/share/openspec/schemas/` for sharing across projects, but project-level schemas in `openspec/schemas/` are recommended since they're version-controlled with your code.

---

## Examples

### Rapid Iteration Workflow

A minimal workflow for quick iterations:

```yaml
# openspec/schemas/rapid/schema.yaml
name: rapid
version: 1
description: Fast iteration with minimal overhead

artifacts:
  - id: proposal
    generates: proposal.md
    description: Quick proposal
    template: proposal.md
    instruction: |
      Create a brief proposal for this change.
      Focus on what and why, skip detailed specs.
    requires: []

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires: [proposal]

apply:
  requires: [tasks]
  tracks: tasks.md
```

### Adding a Review Artifact

Fork the default and add a review step:

```bash
openspec schema fork spec-driven with-review
```

Then edit `schema.yaml` to add:

```yaml
  - id: review
    generates: review.md
    description: Pre-implementation review checklist
    template: review.md
    instruction: |
      Create a review checklist based on the design.
      Include security, performance, and testing considerations.
    requires:
      - design

  - id: tasks
    # ... existing tasks config ...
    requires:
      - specs
      - design
      - review    # Now tasks require review too
```

---

## See Also

- [CLI Reference: Schema Commands](cli.md#schema-commands) - Full command documentation
