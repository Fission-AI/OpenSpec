# Context Store Project Roots And Schema-Led Initiatives

## Status

Proposed from the manual beta reality pass.

This work item replaces the current "initiative create writes a full hardcoded
six-file packet" model with a project-like context-store root and an iterative,
schema-led initiative artifact flow.

## Source Of Truth

Start from `../../direction.md` and preserve the current boundary:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

Manual beta evidence: agents can create the current MVP initiative shape, but
the generated `requirements.md`, `design.md`, `decisions.md`, `questions.md`,
and `tasks.md` invite premature, unreviewed planning content.

## Why This Exists

`openspec initiative create` currently creates a complete-looking planning
packet from hardcoded TypeScript constants and `TBD` templates. That made the
MVP tangible, but it is the wrong default for real initiative work.

Initiatives are high-level shared planning surfaces for PMs, designers,
architects, and agents. They should capture intent, reviewed requirements,
design direction, open questions, and decisions as those artifacts become real.
They should not create empty or fake documents that look finished just because
the folder exists.

The broader product shape is that a context store should feel like an OpenSpec
root in the same way a repo does after `openspec init`: it can have local
OpenSpec configuration and project-local schemas. The difference is lifecycle:
a context store is the shared context root, not an implementation repo.

## Product Model

Repo after `openspec init`:

```text
repo/
  openspec/
    config.yaml
    schemas/
    changes/
    specs/
```

Context store after setup:

```text
context-store/
  .openspec-store/
    store.yaml
  openspec/
    config.yaml
    schemas/
  initiatives/
```

The `openspec/` directory inside a context store exists for OpenSpec config and
schema resolution. It does not by itself make the context store an executable
implementation planning home.

## Goals

- Let context stores carry OpenSpec config, including a default initiative
  schema.
- Let context stores carry project-local schemas under `openspec/schemas/`.
- Replace hardcoded initiative file creation with a schema-led artifact model.
- Make `initiative create` sparse and safe by default.
- Let agents grow initiative artifacts one step at a time through status and
  instructions output.
- Keep existing six-file MVP initiatives readable.
- Keep repo-local changes as the default implementation artifact.

## Non-Goals

- Do not make context-store-hosted executable changes part of this slice. That
  remains Item 18.
- Do not add cross-repo apply, archive, validation, or spec-sync orchestration.
- Do not make workspace-local artifacts the shared planning source of truth.
- Do not migrate existing initiatives automatically.
- Do not install AI-tool runtime files into context stores by default unless a
  later UX decision explicitly opts into that.

## Default Initiative Shape

New initiative creation should create a shell, not the whole plan:

```text
initiatives/<id>/
  initiative.yaml
  brief.md
```

`brief.md` is a seed document, not a completion marker for reviewed
requirements or design. It should contain the title, summary, and a short
"current understanding" section with no `TBD` placeholders.

Reviewed planning artifacts are created later through the initiative schema.

Default built-in schema, conceptually:

```yaml
name: product-initiative
version: 1
description: High-level initiative planning for PMs, designers, architects, and agents
usage: initiative
artifacts:
  - id: requirements
    generates: requirements.md
    description: Product intent, goals, non-goals, requirements, and open questions
    template: requirements.md
    requires: []

  - id: design
    generates: design.md
    description: Product, UX, and architecture direction with constraints and tradeoffs
    template: design.md
    requires:
      - requirements
```

Do not include `tasks.md` in the default initiative schema. Implementation
tasks belong in repo-local changes. Coordination tasks, workstreams, decision
logs, and question logs can be separate later schemas or explicit artifacts once
the usage pattern is clearer.

## UX Direction

Store setup should make the store project-like enough for schemas:

```bash
openspec context-store setup team-context --init-git
```

Expected created shape:

```text
team-context/
  .openspec-store/store.yaml
  openspec/config.yaml
  initiatives/
```

Preferred config direction:

```yaml
initiative_schema: product-initiative
```

This avoids overloading the existing repo-local `schema` field, which currently
means "default change schema." If implementation chooses to reuse `schema`
instead, docs and JSON output must make the context-store scope explicit.

Then initiative creation stays small:

```bash
openspec initiative create agent-trace-hooks \
  --store team-context \
  --title "Agent Trace Hooks" \
  --summary "Explore lightweight capture of agent trace events and hook outcomes."
```

Expected next action:

```bash
openspec initiative status team-context/agent-trace-hooks --json
openspec initiative instructions requirements team-context/agent-trace-hooks --json
```

The agent writes `requirements.md` only when the conversation has enough
reviewed content. `design.md` becomes ready after requirements exist.

## Technical Approach

Reuse the artifact graph primitives, but add an initiative-specific loader
instead of forcing initiatives through `loadChangeContext`.

Current reusable pieces:

- `src/core/artifact-graph/graph.ts`
- `src/core/artifact-graph/state.ts`
- `src/core/artifact-graph/outputs.ts`
- `src/core/artifact-graph/resolver.ts`
- `src/core/artifact-graph/instruction-loader.ts` template loading
- `src/core/project-config.ts`

New initiative-specific pieces:

- a context-store OpenSpec-root helper that treats the store root as the
  `projectRoot` for config and schema lookup
- an initiative artifact context loader rooted at
  `context-store/initiatives/<id>/`
- initiative `status` and `instructions` commands that mirror the repo-local
  artifact workflow but return initiative-specific fields
- a sparse `initiative create` path that writes `initiative.yaml` and `brief.md`
  only

Do not use the existing repo planning-home resolver unchanged. Once context
stores contain `openspec/config.yaml`, the current "nearest `openspec/` folder
means repo planning home" heuristic can accidentally make a context store look
like an implementation repo. This work must either:

- teach planning-home resolution to detect `.openspec-store/store.yaml` and
  return or reject a context-store kind for implementation commands, or
- explicitly reject `openspec new change` from a context-store root until Item
  15 defines target-bound executable changes.

## Schema And Config Compatibility

Prefer a next-release-safe config path:

- Add `initiative_schema` to project config, or an equivalent
  collection-specific config field.
- Continue using existing `schema` as the default repo-local change schema.
- Store per-initiative schema overrides in existing `metadata` if needed.
- Avoid adding a new top-level `schema` field to `initiative.yaml` until
  initiative metadata versioning is designed.

Why: `initiative.yaml` is currently strict and versioned as `version: 1`.
Adding a top-level field would make older CLIs reject new initiatives. Existing
`metadata` can carry forward-compatible fields without breaking old readers.

Schema namespace needs one explicit decision:

- Either add a `usage: change | initiative` discriminator to schema files and
  filter commands accordingly, or
- use a separate initiative schema namespace while reusing the same artifact
  graph format.

The simplest user-facing model is still `openspec/schemas/`, but commands must
avoid listing `product-initiative` as a valid repo-local change workflow.

## JSON Contract

`initiative create --json` should report the shell and next actions:

```json
{
  "context_store": {
    "id": "team-context",
    "root": "/path/to/store"
  },
  "initiative": {
    "id": "agent-trace-hooks",
    "root": "/path/to/store/initiatives/agent-trace-hooks",
    "metadata_path": "/path/to/store/initiatives/agent-trace-hooks/initiative.yaml",
    "schema": "product-initiative"
  },
  "created_files": [
    "initiative.yaml",
    "brief.md"
  ],
  "next_commands": {
    "status": "openspec initiative status team-context/agent-trace-hooks --json",
    "requirements": "openspec initiative instructions requirements team-context/agent-trace-hooks --json"
  },
  "status": []
}
```

`initiative status --json` should include:

- context store identity and root
- initiative identity, root, metadata path, and selected schema
- artifact paths keyed by artifact id
- artifact statuses: `done`, `ready`, `blocked`
- next steps
- action context that says this is shared planning context, not an editable
  implementation target

`initiative instructions --json` should include:

- resolved output path
- existing output paths
- schema instruction
- template content
- dependencies and unlocks
- store config context/rules if supported

## Release Risk And Migration

This is compatible if implemented as a sparse, additive layer:

- Existing six-file initiatives remain readable because list/show only require
  `initiative.yaml`.
- Existing optional markdown files can remain in old initiative folders.
- New status/instructions can ignore files outside the selected schema.
- Old CLIs can still read new initiatives if schema data stays under
  `metadata` or store config rather than new strict top-level fields.

High-risk areas:

- Planning-home detection after context stores gain `openspec/config.yaml`.
- Tests and docs that assert the six-file MVP initiative shape.
- Schema lists and completions if initiative schemas share the same namespace
  as change schemas.
- Agent guidance that still tells agents to edit every generated initiative
  markdown file after creation.

## Test And Doc Touch Points

Likely tests to update or add:

- `test/core/collections/initiatives/schema.test.ts`
- `test/core/collections/initiatives/templates.test.ts`
- `test/core/collections/initiatives/operations.test.ts`
- `test/commands/initiative.test.ts`
- `test/commands/context-store.test.ts`
- `test/commands/artifact-workflow.test.ts`
- planning-home tests for context-store roots with `openspec/config.yaml`
- schema listing/completion tests if schema usage filtering is added

Likely docs to update:

- `docs/workspaces-beta/agent-cli-playbook.md`
- `docs/workspaces-beta/user-guide.md`
- `docs/cli.md`
- schema docs if `usage` or `initiative_schema` is added
- `openspec/initiatives/context-store-and-initiatives/work-items/05-ship-initiative-mvp/`
  with a note that the MVP shape was superseded by this work item

## Done When

- A new context store has OpenSpec config and can resolve project-local
  initiative schemas.
- `initiative create` creates only the sparse initiative shell.
- Agents can use initiative status/instructions to create high-level planning
  artifacts iteratively.
- `openspec new change` does not accidentally treat a context store as a normal
  implementation repo just because the store has `openspec/config.yaml`.
- Existing MVP initiatives continue to list and show.
- Docs describe initiative artifacts as reviewed, iterative context rather than
  files to fill in immediately.
