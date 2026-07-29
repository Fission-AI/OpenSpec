# Customization

OpenSpec provides four levels of customization:

| Level | What it does | Best for |
|-------|--------------|----------|
| **Project Config** | Set defaults, inject context/rules | Most teams |
| **Custom Schemas** | Define your own workflow artifacts | Teams with unique processes |
| **Remote Schemas** | Pin a team-owned Git schema across repositories | Multi-repository teams |
| **Global Overrides** | Share schemas across all projects | Power users |

---

## Project Configuration

The `openspec/config.yaml` file is the easiest way to customize OpenSpec for your team. It lets you:

- **Set a default schema** - Skip `--schema` on every command
- **Inject project context** - AI sees your tech stack, conventions, etc.
- **Add per-artifact rules** - Custom rules for specific artifacts
- **Add per-operation guidance** - Advisory preferences for apply and archive work

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

## Remote Team Schemas

A remote schema is a complete schema bundle maintained in a Git repository and
declared by a project. It solves a different problem from the other locations:

- A **project-local schema** is copied into one repository and can evolve there.
- A **remote schema** is shared by many repositories and pinned by each consumer.
- A **user-level schema** is a machine-local override and is not reproducible for a team.
- A **package schema** ships with the installed OpenSpec version.

Declare the source without changing the existing string-valued `schema` field:

```yaml
# openspec/config.yaml
schema: qeda-sdd

schemaSources:
  qeda-sdd:
    git: https://github.com/example/QEDASDD.git
    ref: v1.0.0
    path: schemas/qeda-sdd
```

Then synchronize explicitly:

```bash
# Resolve the configured ref and update the lock
openspec schema sync qeda-sdd

# Synchronize every declared source
openspec schema sync

# Restore/verify the exact lockfile state, for example in CI
openspec schema sync --locked
```

Commit `openspec/schemas.lock.yaml`. It records the requested ref, resolved
commit SHA, bundle path, and SHA-256 content integrity. Do not commit the
machine cache under the OpenSpec global data directory. Normal OpenSpec
commands never fetch: they only use a matching lock entry and verified cache.
If the cache is absent, run `schema sync --locked` while the Git source is
reachable, then ordinary commands work offline.

The consumer repository owns both `openspec/config.yaml` and
`openspec/schemas.lock.yaml`. Running sync from a nested directory searches
upward for that repository. A configured planning store does not own or redirect
remote schema sources. Sync processes for one consumer repository are
serialized, so concurrent named updates cannot lose lockfile entries.
The `openspec/.schemas.lock/` coordination directory ignores its own runtime
files. Participant records are published atomically, and aged malformed
records left by an interrupted process are reclaimed without manual cleanup.

Branches and tags are allowed, but they move only when `schema sync` is run
without `--locked`. A remote update therefore cannot change a normal command's
workflow unexpectedly.

Private repositories use the system Git client's existing SSH agent or
credential helper:

```yaml
schemaSources:
  private-flow:
    git: git@github.com:acme/private-schemas.git
    ref: main
    path: schemas/private-flow
```

Do not put credentials or tokens in configuration. Credential-bearing HTTPS
URLs are rejected, and lockfiles contain no authentication material. OpenSpec
preserves existing `GIT_SSH_COMMAND` options while enforcing `BatchMode=yes`.
An explicit `StrictHostKeyChecking` value is preserved; OpenSpec adds
`StrictHostKeyChecking=accept-new` only when no host-key policy is present.

Schema authority is name-based:

- Without a remote declaration, precedence remains project-local, user-level,
  then package built-in.
- Once `schemaSources.<name>` is declared, the remote owns that name.
- A same-named project-local bundle is a configuration conflict; OpenSpec does
  not silently choose or shadow either bundle.

A declared remote source fails closed when its lock or cache is missing,
stale, or corrupt; OpenSpec does not silently select a same-named user or
package schema. `schema which --all` reports each unavailable remote separately
while continuing to list healthy schemas. Bundle paths must stay inside the Git
repository. Absolute paths, traversal, symlinks, submodules, case-colliding
paths, invalid names, incomplete schemas, and bundles over 1,000 files or
10 MiB are rejected. These portable fail-closed checks apply to remote bundles;
existing project-local schema validation retains its legacy path and symlink
behavior. Remote schemas are complete bundles; inheritance and schema merging
are not supported.

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

Community schemas are not vendored into OpenSpec core — they live in their own repositories with their own release cadence. You can either declare one as a remote schema and pin it with `openspec schema sync`, or copy its bundle into your project's `openspec/schemas/<schema-name>/` directory.

| Schema | Maintainer | Repository | Description |
|--------|-----------|-----------|-------------|
| `superpowers-bridge` | @JiangWay | [JiangWay/openspec-schemas](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge) | Integrates OpenSpec's artifact governance with [obra/superpowers](https://github.com/obra/superpowers) execution skills (brainstorming, writing-plans, TDD via subagents, code review, finishing). Adds an evidence-first `retrospective` artifact filling a gap Superpowers does not natively cover. |
| `nanopm` | @nmrtn | [nmrtn/nanopm](https://github.com/nmrtn/nanopm/tree/main/openspec-schema) | PM-first workflow. Runs [nanopm](https://github.com/nmrtn/nanopm)'s planning pipeline (audit → strategy → roadmap → PRD) upstream of implementation. Bridges product planning to OpenSpec's spec-driven engineering workflow. Artifacts read from `.nanopm/` if present — proposal sources the audit, design sources the strategy, and tasks source the PRD breakdown. |
| `e2e-runbooks` | @Lukk17 | [Lukk17/openspec-schemas](https://github.com/Lukk17/openspec-schemas/tree/master/openspec/schemas/e2e-runbooks) | Capability-level end-to-end test runbooks. Each capability gets an immutable spec, an immutable tasks-template, and one timestamped run record per execution. Assertions are observable behaviour only (HTTP status, response body, persisted state — never log substrings); each run records start/end UTC, duration, and best-estimate LLM token consumption. |
| `anvil` | @jikkujoyce | [jikkujoyce/openspec-schemas](https://github.com/jikkujoyce/openspec-schemas/tree/main/schemas/anvil) | Spec-driven workflow with TDD discipline and an adversarial review step. Flow: `proposal` → `specs` → `design` → `review` → `test-plan` → `tasks` → `apply` → `verify`. `review` is written by a fresh-context, read-only reviewer (a second model when one is available) and emits a `VERDICT:` line telling the agent to gate `test-plan`, `tasks`, and `apply`; OpenSpec only checks that artifacts exist, so enforce the gate with your own CI or hook. `test-plan` maps every spec scenario to a named test and doubles as a red/green ledger that `verify` audits. |

> Want to contribute a community schema? Open an issue with a link to your repository, or submit a PR adding a row to this table.

---

## See Also

- [CLI Reference: Schema Commands](cli.md#schema-commands) - Full command documentation
