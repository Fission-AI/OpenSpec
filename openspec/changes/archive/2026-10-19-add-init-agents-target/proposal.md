## Why

`.agents/skills` has become the shared, vendor-neutral location modern agent tools read. OpenSpec already carried an `agents` entry in `AI_TOOLS`, but with `available: false` and no `skillsDir` it was unreachable — every real gate keys off `skillsDir`. Teams running several agents on one repo, or a tool with no first-class integration yet, had to generate for some other tool and move the files by hand (#1480), or pick a vendor target they do not use (#1104, #653).

## What Changes

- Enable `agents` in `AI_TOOLS` with `skillsDir: '.agents'`, making it selectable interactively and via `--tools agents`.
- Scope detection to `detectionPaths: ['.agents/skills']` so a bare `.agents/` written by another framework does not select — or silently install into — the target.
- Rename the entry to `Shared .agents skills`. The old label said "AGENTS.md", but OpenSpec writes no `AGENTS.md` — it strips its markers out of one.
- Document the target, including when to prefer it over a tool-specific integration.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: define the `.agents` skills root and its scoped detection path
- `cli-init`: record that the shared target installs skills and skips command generation

## Impact

- `src/core/config.ts` - enable the `agents` entry, scope detection, correct the label
- `.changeset/add-agents-tool.md` - minor release note, including the `--tools all` behavior change
- `docs/supported-tools.md`, `docs/cli.md`, `docs/commands.md`, `docs/how-commands-work.md`, `docs/troubleshooting.md` - list `agents` among skills-only tools and explain when to choose it
- `test/core/*`, `test/commands/*`, `test/cli-e2e/*` - cover init, update, detection, and the deprecated alias

## Non-Goals

- No command adapter for `agents`. There is no cross-vendor slash-command format, so commands stay skills-only (the Kimi/Hermes pattern).
- No `.pi`, `.codex`, or `.agent` migration into `.agents`. Moving vendor tools to the shared root is separate work (#830, #1157).
