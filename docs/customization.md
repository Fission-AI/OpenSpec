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
- **Add per-operation guidance** - Advisory preferences for apply and archive work
- **Remember integration choices** - e.g. the [GitHub Copilot cloud coding agent](supported-tools.md#github-copilot-cloud-coding-agent) opt-in

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

operations:
  apply:
    guidance:
      - Run focused tests before the full suite
  archive:
    guidance:
      - Keep the completion summary concise

# Set by `openspec init` when you choose (or decline) the GitHub Copilot
# cloud coding agent; controls whether `init`/`update` generate its files.
githubCopilot:
  cloudAgent: false
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

**Operation guidance:**

`operations.apply.guidance` and `operations.archive.guidance` are optional arrays
of advisory instructions for how an agent should conduct those operations. They
are separate from `rules`: operation guidance does not constrain artifact content,
and artifact rules are never relabeled as operation guidance.

Apply and archive fetch these inputs at execution time:

```bash
openspec instructions apply --change my-feature --json
openspec instructions archive --change my-feature --json
```

Both surfaces return current project `context` and matching
`operationGuidance` as separate optional fields. Each invocation reads a fresh
snapshot from the resolved root. When `--store <id>` is selected, the change,
context, and guidance all come from that store rather than the current repository.
The archive instruction command is read-only: it does not inspect or merge delta
specs, write main specs, move the change, or run the static archive workflow.

Project context is a required prompt-level input. Generated workflows read it and
apply relevant project facts, conventions, and constraints. Operation guidance is
optional additive advice: workflows consider every entry and follow entries that
are applicable and compatible with the built-in workflow.

Both fields remain separate from CLI-controlled state, resolved paths, built-in
steps, explicit user choices, and artifact rules. A workflow reports context
conflicts while preserving the controlling value. It does not follow inapplicable
or conflicting guidance and explains why. Neither field is an enforceable check,
and workflows do not copy their text into implementation files, specs, change
artifacts, or summaries unless the user separately requests that content.

**Archive and spec-sync input safety:**

Archive, bulk archive, and standalone sync use
`artifactPaths.specs.existingOutputPaths` from `openspec status --json` as the
only delta-spec source. A schema without a `specs` artifact, or a change whose
concrete output list is empty, has nothing to sync; other artifacts are not used
to infer delta specs.

Before a semantic merge writes a main spec, the workflow consumes current
`openspec instructions specs --change <name> --json` output. The returned
`specs` rules constrain only the main specs produced by that merge. Single archive
passes that snapshot into inline sync, standalone sync fetches it directly, and
bulk archive obtains every required snapshot before its first spec write. A
non-zero or invalid JSON archive/specs instruction response is a lookup failure,
not an empty input: the workflow stops before the affected spec write or change
move (for bulk archive, before any batch write or move).

This configuration does not change archive execution phases, user prompts,
filesystem operations, semantic merge ownership, the direct `openspec archive`
command, or the structure and output of artifact `rules`.

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

### Share Schemas from a Store

For schemas maintained by another team or department, register that repository
as a normal OpenSpec Store and select it independently from the location that
owns changes and specs:

```yaml
# openspec/config.yaml
schema: qeda-sdd
schemaStore:
  id: department-schemas
  schemas:
    - qeda-sdd
    - frontend-sdd
```

The scalar form exposes every schema in the Store:

```yaml
schemaStore: department-schemas
```

Omitting `schemas`, or writing `schemas: ["*"]`, has the same all-visible
behavior. Otherwise the list contains exact schema names; `*` cannot be mixed
with names.

When `schemaStore` is configured, its visible schemas replace the project's
local schema layer. Resolution order is:

1. visible schemas from the configured Schema Store;
2. user schemas;
3. package schemas.

The visibility list filters only the Store. A hidden Store schema can still
resolve from the user or package layer. Without `schemaStore`, existing
project → user → package behavior is unchanged.

OpenSpec reads the registered checkout's current files. It does not fetch,
pull, pin, or otherwise synchronize that repository during schema or workflow
commands. Update the checkout with normal Git commands; one registered checkout
is shared by every local consumer that names that Store.

Because a configured Schema Store replaces the project-local schema layer,
`openspec schema init` and `openspec schema fork` do not create local schemas
in that consumer. Edit the registered Store directly, or remove `schemaStore`
before creating a project-local schema.

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

List artifacts in the order you want them written. `requires` decides what is
possible; the order of the `artifacts:` list decides what comes first when
several artifacts are ready at once.

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

## Community Schemas

OpenSpec also supports community-maintained schemas distributed via standalone repositories. These provide opinionated workflows that integrate OpenSpec with other tools or systems, similar to how [github/spec-kit's community extension catalog](https://github.com/github/spec-kit/tree/main/extensions) works for spec-kit.

Community schemas are not vendored into OpenSpec core — they live in their own repositories with their own release cadence. To use one, copy the schema bundle into your project's `openspec/schemas/<schema-name>/` directory (each repo's README has install instructions).

| Schema | Maintainer | Repository | Description |
|--------|-----------|-----------|-------------|
| `intent-driven` | @harikrishnan83 | [intent-driven-dev/openspec-schemas](https://github.com/intent-driven-dev/openspec-schemas/tree/main/openspec/schemas/intent-driven) | Captures change intent, observable behaviour, technical design, and durable architectural decisions before implementation. Adds a change-local ADR review manifest and writes qualifying long-lived decisions as immutable, supersedable ADRs. |
| `superpowers-bridge` | @JiangWay | [JiangWay/openspec-schemas](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge) | Integrates OpenSpec's artifact governance with [obra/superpowers](https://github.com/obra/superpowers) execution skills (brainstorming, writing-plans, TDD via subagents, code review, finishing). Adds an evidence-first `retrospective` artifact filling a gap Superpowers does not natively cover. |
| `nanopm` | @nmrtn | [nmrtn/nanopm](https://github.com/nmrtn/nanopm/tree/main/openspec-schema) | PM-first workflow. Runs [nanopm](https://github.com/nmrtn/nanopm)'s planning pipeline (audit → strategy → roadmap → PRD) upstream of implementation. Bridges product planning to OpenSpec's spec-driven engineering workflow. Artifacts read from `.nanopm/` if present — proposal sources the audit, design sources the strategy, and tasks source the PRD breakdown. |
| `e2e-runbooks` | @Lukk17 | [Lukk17/openspec-schemas](https://github.com/Lukk17/openspec-schemas/tree/master/openspec/schemas/e2e-runbooks) | Capability-level end-to-end test runbooks. Each capability gets an immutable spec, an immutable tasks-template, and one timestamped run record per execution. Assertions are observable behaviour only (HTTP status, response body, persisted state — never log substrings); each run records start/end UTC, duration, and best-estimate LLM token consumption. |
| `anvil` | @jikkujoyce | [jikkujoyce/openspec-schemas](https://github.com/jikkujoyce/openspec-schemas/tree/main/schemas/anvil) | Spec-driven workflow with TDD discipline and an adversarial review step. Flow: `proposal` → `specs` → `design` → `review` → `test-plan` → `tasks` → `apply` → `verify`. `review` is written by a fresh-context, read-only reviewer (a second model when one is available) and emits a `VERDICT:` line telling the agent to gate `test-plan`, `tasks`, and `apply`; OpenSpec only checks that artifacts exist, so enforce the gate with your own CI or hook. `test-plan` maps every spec scenario to a named test and doubles as a red/green ledger that `verify` audits. |

> Want to contribute a community schema? Open an issue with a link to your repository, or submit a PR adding a row to this table.

---

## See Also

- [CLI Reference: Schema Commands](cli.md#schema-commands) - Full command documentation
