## Context

Grok Build (CLI binary `grok`) is not a Claude/Codex-style command-file adapter target. Its documented extension model is skill-centric:

- project skills from `./.grok/skills/` (walked up to the repo root)
- user skills from `~/.grok/skills/`
- plugin skills and optional `[skills] paths` in config
- user-invocable skills appear as slash commands: `/<skill-name>`
- core TUI commands (`/plan`, `/model`, `/skills`, …) are built-in, not project-generated files
- no documented project-local `.grok/commands/` layout for custom OpenSpec command generation

Grok also has Claude/Cursor compatibility scanners that can free-ride existing `.claude/skills` or `.cursor/skills`. That is a personal workaround, not the product integration: OpenSpec should own a native `.grok` skills install so pure-Grok users and multi-tool projects get first-class init/update behavior.

OpenSpec already represents this shape:

- `AI_TOOLS` can advertise a `skillsDir`
- `init`/`update` install skills for any selected tool with `skillsDir`
- when command generation is attempted for a tool without an adapter, OpenSpec records `commandsSkipped`

## Goals / Non-Goals

**Goals:**

- Add Grok Build using the same narrow skills-only pattern as Kimi CLI / ForgeCode / Mistral Vibe
- Keep the implementation small: metadata, docs, focused regression test, changeset
- Align specs with the existing adapterless code path

**Non-Goals:**

- designing a Grok-specific command adapter without a documented project command-file surface
- relying on Claude/Cursor free-ride as the supported integration
- changing tool capability modeling or `delivery=commands` behavior for all adapterless tools (tracked in `add-tool-command-surface-capabilities`)

## Decisions

### 1. Represent Grok Build as an adapterless tool with `.grok`

Add a new `AI_TOOLS` entry:

```ts
{ name: 'Grok Build', value: 'grok', available: true, successLabel: 'Grok Build', skillsDir: '.grok' }
```

Rationale for IDs:

- `value: 'grok'` matches the CLI binary and the project directory `.grok` (same pattern as `claude` → `.claude`, `kimi` → `.kimi`)
- display name `Grok Build` matches xAI product naming
- alternatives considered: `grok-build` (product-accurate but inconsistent with other short tool IDs)

### 2. Do not add a Grok command adapter

No `src/core/command-generation/adapters/grok.ts`, and no registry change.

Rationale:

- skills are the documented custom extension surface and already become slash commands
- inventing `.grok/commands/...` would create OpenSpec behavior that cannot be justified against xAI docs
- existing adapterless path already skips command generation with an informational message

### 3. Document Grok by its real invocation surface

Grok docs in OpenSpec must use skill-name slash form:

- supported-tools: no generated command files; use skill-based `/openspec-*` invocations
- commands / how-commands-work: examples such as `/openspec-propose`, `/openspec-apply-change`

Do not claim generated `opsx-*` files or Claude-style `/opsx:propose` as Grok's primary surface.

### 4. Treat Claude free-ride as out-of-scope workaround, not design

Grok can discover Claude skills when compat scanners are enabled. Native `.grok` support remains required because:

- pure Grok users may never select Claude
- free-ride couples Grok to Claude layout and can be disabled via Grok config/env
- OpenSpec update tracks configured tools by skillsDir presence; free-ride never registers Grok

If both Claude and Grok are configured, duplicate skill discovery is acceptable; `.grok` remains the canonical OpenSpec target for Grok Build.

### 5. Keep behavior aligned with current adapterless tools

- skills are created whenever delivery includes skills
- command generation is skipped when no adapter exists
- init output reports `Commands skipped for: grok (no adapter)`
- update refreshes Grok when `.grok/skills/openspec-*` exists

## Test Strategy

Add one focused regression test in `test/core/init.test.ts`:

- configure `delivery=both`
- run init with `--tools grok`
- verify skills under `.grok/skills/...` (use `path.join` for expectations)
- verify no `.grok/commands` directory is created
- verify init log includes skipped command generation for `grok` with `(no adapter)` (use relaxed `.some()` matching, as in the Kimi follow-up commit)

That is enough because:

- adapterless update behavior already has generic coverage
- CLI tool-id rendering is derived from `AI_TOOLS`
- no command adapter or path-formatting logic is introduced

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users confuse Claude free-ride with native support | Document native `.grok` path; optional brief note that Claude compat is separate |
| `delivery=commands` still not capability-aware for skills-only tools | Accept same limitation as Kimi/ForgeCode/Vibe; capability work is separate |
| Duplicate skills when both Claude and Grok selected | Acceptable; document that Grok may see both trees |
| xAI later documents project command files | Skills-only remains correct today; adapter can be added later without breaking skills |
