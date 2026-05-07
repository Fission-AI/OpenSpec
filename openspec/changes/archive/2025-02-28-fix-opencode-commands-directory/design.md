## Context

The OpenCode adapter in `src/core/command-generation/adapters/opencode.ts` currently generates command files at `.opencode/command/opsx-<id>.md` (singular `command`). OpenCode's official documentation uses `.opencode/commands/` (plural), and every other adapter in the codebase follows the plural convention for commands directories. The legacy cleanup module in `src/core/legacy-cleanup.ts` also references the singular form for detecting old artifacts.

## Goals / Non-Goals

**Goals:**
- Align the OpenCode adapter path with OpenCode's official `.opencode/commands/` convention
- Add the old singular path `.opencode/command/` to legacy cleanup so existing installations are properly cleaned
- Update documentation to reflect the corrected path
- Update test assertions to match the new path

**Non-Goals:**
- Changing the OpenCode skill path (`.opencode/skills/`) — already correct
- Modifying any other adapter's directory structure
- Adding migration prompts or interactive upgrade flows

## Decisions

### 1. Direct path rename in adapter

**Decision:** Change `path.join('.opencode', 'command', ...)` to `path.join('.opencode', 'commands', ...)` in the adapter's `getFilePath` method.

**Rationale:** This is a single-line change that aligns with the established pattern across all other adapters. No abstraction or indirection needed.

**Alternatives considered:**
- Add a configuration option for the directory name — rejected as over-engineering for a bug fix
- Keep singular and add plural as alias — rejected as it creates ambiguity about which is canonical

### 2. Legacy cleanup via existing constant map

**Decision:** Update the `LEGACY_SLASH_COMMAND_PATHS` entry for `'opencode'` from `'.opencode/command/openspec-*.md'` to `'.opencode/command/opsx-*.md'` (the old singular path becomes the legacy pattern) and ensure the new path is handled by the current command generation pipeline.

**Rationale:** The existing legacy cleanup infrastructure uses `LEGACY_SLASH_COMMAND_PATHS` as an explicit lookup. The old singular-path pattern already matches the legacy format (`openspec-*` prefix from the old SlashCommandRegistry era). The current command generation uses the `opsx-*` prefix, so we also need to add a legacy pattern for `opsx-*` files in the old singular directory.

**Alternatives considered:**
- Add a separate migration script — rejected; the existing legacy cleanup mechanism handles this scenario

### 3. Documentation update

**Decision:** Update the `docs/supported-tools.md` table entry for OpenCode from `.opencode/command/opsx-<id>.md` to `.opencode/commands/opsx-<id>.md`.

**Rationale:** Documentation must match the actual generated paths.

## Risks / Trade-offs

- **[Existing installations have files at old path]** → Mitigated by legacy cleanup detecting `.opencode/command/` artifacts. On next `openspec init`, old files are cleaned up and new files written to `.opencode/commands/`.
- **[Users referencing old path in custom scripts]** → Low risk. The old path was incorrect per OpenCode's specification, so custom references were already misaligned.
