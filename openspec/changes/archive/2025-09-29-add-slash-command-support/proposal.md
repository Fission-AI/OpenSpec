# Add Slash Command Support for Coding Agents

## Summary
- Enable Pastelsdd to generate and update custom slash commands for supported coding agents (Claude Code and Cursor).
- Provide three slash commands aligned with Pastelsdd's workflow: proposal (start a change proposal), apply (implement), and archive.
- Share slash command templating between agents to make future extensions simple.

## Motivation
Developers use different coding agents and editors. Having consistent slash commands across tools for the Pastelsdd workflow reduces friction and ensures a standard way to trigger the workflow. Supporting both Claude Code and Cursor now lays a foundation for future agents that introduce slash command features.

## Proposal
1. During `pastelsdd init`, when a user selects a supported tool, generate slash command configuration for three Pastelsdd workflow stages:
   - Claude (namespaced): `/pastelsdd/proposal`, `/pastelsdd/apply`, `/pastelsdd/archive`.
   - Cursor (flat, prefixed): `/pastelsdd-proposal`, `/pastelsdd-apply`, `/pastelsdd-archive`.
   - Semantics:
     - Create – scaffold a change (ID, `proposal.md`, `tasks.md`, delta specs); validate strictly.
     - Apply – implement an approved change; complete tasks; validate strictly.
     - Archive – archive after deployment; update specs if needed.
   - Each command file MUST embed concise, step-by-step instructions sourced from `pastelsdd/README.md` (see Template Content section).
2. Store slash command files per tool:
   - Claude Code: `.claude/commands/pastelsdd/{proposal,apply,archive}.md`
   - Cursor: `.cursor/commands/{pastelsdd-proposal,pastelsdd-apply,pastelsdd-archive}.md`
   - Ensure nested directories are created.
3. Command file format and metadata:
   - Use Markdown with optional YAML frontmatter for tool metadata (name/title, description, category/tags) when supported by the tool.
   - Place Pastelsdd markers around the body only, never inside frontmatter.
   - Keep the visible slash name, file name, and any frontmatter `name`/`id` consistently aligned (e.g., `proposal`, `pastelsdd-proposal`).
   - Namespacing: categorize these under “Pastelsdd” and prefer unique IDs (e.g., `pastelsdd-proposal`) to avoid collisions.
4. Centralize templates: define command bodies once and reuse across tools; apply minimal per-tool wrappers (frontmatter, categories, filenames).
5. During `pastelsdd update`, refresh only existing slash command files (per-file basis) within markers; do not create missing files or new tools.

## Design Ideas
- Introduce `SlashCommandConfigurator` to manage multiple files per tool.
  - Expose targets rather than a single `configFileName` (e.g., `getTargets(): Array<{ path: string; kind: 'slash'; id: string }>`).
  - Provide `generateAll(projectPath, pastelsddDir)` for init and `updateExisting(projectPath, pastelsddDir)` for update.
- Per-tool adapters add only frontmatter and pathing; bodies come from shared templates.
- Templates live in `TemplateManager` with helpers that extract concise, authoritative snippets from `pastelsdd/README.md`.
- Update flow logs per-file results so users see exactly which slash files were refreshed.

### Marker Placement
- Markers MUST wrap only the Markdown body contents:
  - Frontmatter (if present) goes first.
  - Then `<!-- PASTELSDD:START -->` … body … `<!-- PASTELSDD:END -->`.
  - Avoid inserting markers into the YAML block to prevent parse errors.

### Idempotency and Creation Rules
- `init`: create all three files for the chosen tool(s) once; subsequent `init` runs are no-ops for existing files.
- `update`: refresh only files that exist; skip missing ones without creating new files.
- Directory creation for `.claude/commands/pastelsdd/` and `.cursor/commands/` is the configurator’s responsibility.

### Command Naming & UX
- Claude Code: use namespacing in the slash itself for readability and grouping: `/pastelsdd/proposal`, `/pastelsdd/apply`, `/pastelsdd/archive`.
- Cursor: use flat names with an `pastelsdd-` prefix: `/pastelsdd-proposal`, `/pastelsdd-apply`, `/pastelsdd-archive`. Group via `category: Pastelsdd` when supported.
- Consistency: align file names, visible slash names, and any frontmatter `id` (e.g., `id: pastelsdd-apply`).
- Migration: do not rename existing commands during `update`; apply new naming only on `init` (or via an explicit migrate step).

## Open Questions
- Validate exact metadata/frontmatter supported by each tool version; if unsupported, omit frontmatter and ship Markdown body only.
- Confirm the final Cursor command file location for the targeted versions; fall back to Markdown-only if Cursor does not parse frontmatter.
- Evaluate additional commands beyond the initial three (e.g., `/show-change`, `/validate-all`) based on user demand.

## Alternatives
- Hard-code slash command text per tool (rejected: duplicates content; increases maintenance).
- Delay Cursor support until its config stabilizes (partial accept): gate Cursor behind a feature flag until verified in real environments.

## Risks
- Tool configuration formats may change, requiring updates to wrappers/frontmatter.
- Incorrect paths or categories can hide commands; add path existence checks and clear logging.
- Marker misuse (inside frontmatter) can break parsing; enforce placement rules in tests.

## Future Work
- Support additional editors/agents that expose slash command APIs.
- Allow users to customize command names and categories during `pastelsdd init`.
- Provide a dedicated command to regenerate slash commands without running full `update`.

## File Format Examples
The following examples illustrate expected structure. If a tool does not support frontmatter, omit the YAML block and keep only the markers + body.

### Claude Code: `.claude/commands/pastelsdd/proposal.md`
```markdown
---
name: Pastelsdd: Proposal
description: Scaffold a new Pastelsdd change and validate strictly.
category: Pastelsdd
tags: [pastelsdd, change]
---
<!-- PASTELSDD:START -->
...command body from shared template...
<!-- PASTELSDD:END -->
```

Slash invocation: `/pastelsdd/proposal` (namespaced)

### Cursor: `.cursor/commands/pastelsdd-proposal.md`
```markdown
---
name: /pastelsdd-proposal
id: pastelsdd-proposal
category: Pastelsdd
description: Scaffold a new Pastelsdd change and validate strictly.
---
<!-- PASTELSDD:START -->
...command body from shared template...
<!-- PASTELSDD:END -->
```

Slash invocation: `/pastelsdd-proposal` (flat, prefixed)

## Template Content
Templates should be brief, actionable, and sourced from `pastelsdd/README.md` to avoid duplication. Each command body includes:
- Guardrails: ask 1–2 clarifying questions if needed; follow minimal-complexity rules; use `pnpm` for Node projects.
- Step list tailored to the workflow stage (proposal, apply, archive), including strict validation commands.
- Pointers to `pastelsdd show`, `pastelsdd list`, and troubleshooting tips when validation fails.

## Testing Strategy
- Golden snapshots for generated files per tool (frontmatter + markers + body).
- Partial presence tests: if 1–2 files exist, `update` only refreshes those and does not create missing ones.
- Marker placement tests: ensure markers never appear inside frontmatter; cover missing/duplicated marker recovery behavior.
- Logging tests: `update` reports per-file updates for slash commands.
