## Context

Kimi CLI is not another Claude/Codex-style adapter target. Its extension model is built around discovered skills, not external command files:

- skills are discovered from `.kimi/skills/`
- skills are exposed as `/skill:<name>`
- no stable `.kimi/commands/` or prompt-file loading mechanism was found in the Kimi CLI codebase

OpenSpec's existing architecture can already represent that shape:

- `AI_TOOLS` can advertise a `skillsDir`
- `init` can install skills for any selected tool with `skillsDir`
- when command generation is attempted for a tool without an adapter, OpenSpec already records `commandsSkipped`

## Goals

- Add Kimi CLI using the same narrow `skills-only` pattern already used by Trae
- Keep the implementation small: metadata, docs, and a focused regression test
- Make the spec text match the current code path for adapterless tools

## Non-Goals

- designing a Kimi-specific command adapter without upstream support
- changing tool capability modeling across the whole generation pipeline
- reworking `delivery=commands` behavior for all adapterless tools

## Decisions

### 1. Represent Kimi CLI as an adapterless tool with `.kimi`

Add a new `AI_TOOLS` entry:

```ts
{ name: 'Kimi CLI', value: 'kimi', available: true, successLabel: 'Kimi CLI', skillsDir: '.kimi' }
```

This matches Kimi CLI's project-local skills root and lets existing init/update detection paths treat it as a supported tool.

### 2. Do not add a Kimi command adapter

No `src/core/command-generation/adapters/kimi.ts` file will be added, and the command adapter registry will remain unchanged.

Rationale:

- Kimi CLI exposes skills dynamically as `/skill:<name>`
- the previous upstream PR stalled specifically because no legitimate adapter target was available
- adding a fake `.kimi/commands/...` path would create behavior OpenSpec cannot justify against upstream Kimi CLI behavior

### 3. Document Kimi by its real invocation surface

Kimi documentation in OpenSpec must use Kimi's actual skill invocation form:

- supported-tools: no generated command files, use `/skill:openspec-*`
- commands doc: examples such as `/skill:openspec-propose`

The docs must not claim generated `opsx-*` files or `/openspec-*` direct invocations for Kimi.

### 4. Keep the change compatible with existing Trae-style behavior

This change intentionally follows the current adapterless-tool behavior already present in the codebase:

- skills are created whenever delivery includes skills
- command generation is skipped when no adapter exists
- init output reports `Commands skipped for: kimi (no adapter)`

This keeps the Kimi change small and avoids overlapping implementation work already captured in `add-tool-command-surface-capabilities`.

## Test Strategy

Add one focused regression test in `test/core/init.test.ts`:

- configure `delivery=both`
- run init with `--tools kimi`
- verify Kimi skills are created under `.kimi/skills/...`
- verify init reports the skipped command generation path for `kimi`

That test is enough for this narrow change because:

- adapterless update behavior already has generic coverage
- CLI tool-id rendering is derived from `AI_TOOLS`
- no command adapter or path formatting logic is being introduced

## Risks / Trade-offs

The main trade-off is scope: Kimi will inherit the current adapterless-tool behavior, including the broader limitation that `delivery=commands` is not yet capability-aware for skills-invocable tools. That is acceptable for this change because it matches the existing Trae/ForgeCode model and keeps the implementation aligned with verified Kimi CLI behavior.
