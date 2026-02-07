## Context

OpenSpec integration scripts currently generate OpenCode AI command markdown files under `.opencode/command/`, but the official documentation specifies `.opencode/commands/`. This change focuses on the OpenSpec initialization script that writes those markdown files.

## Goals / Non-Goals

**Goals:**
- Align generated command file locations with `.opencode/commands/`.
- Limit changes to OpenSpec init/update flows that generate or migrate command markdown files.

**Non-Goals:**
- Redesign the command format or command execution model.
- Change the existing command content or add new command types.
- Update CLI behavior unrelated to command generation or migration.

## Decisions

- Use `.opencode/commands/` as the single source of truth for generated command files, matching documentation.
  - Alternative: keep `.opencode/command/` as-is and update docs. Rejected because documentation is authoritative and users already rely on it.
- Update OpenSpec init/update to write command markdown files directly into `.opencode/commands/`.
  - Alternative: keep `.opencode/command/` and update docs. Rejected because the documentation is the source of truth.
- If `.opencode/command/` exists, migrate its files into `.opencode/commands/` and prompt to delete the old directory when it is empty.
  - Alternative: leave the old directory indefinitely. Rejected to avoid confusion and duplicated locations.

## Risks / Trade-offs

- [Risk] Existing users may have custom tooling pointing at `.opencode/command/` → Mitigation: migrate files and communicate the new location in OpenSpec output.
- [Trade-off] Migration logic adds a small amount of complexity to initialization → Mitigation: keep migration to a straightforward move/copy step plus optional cleanup.

## Migration Plan

- Update OpenSpec init/update to create `.opencode/commands/` and generate command files there.
- If `.opencode/command/` exists, move or copy known command files into `.opencode/commands/`.
- If `.opencode/command/` is empty after migration, prompt the user to delete it.
- Update tests and documentation to reference `.opencode/commands/`.

## Open Questions

- Should the cleanup prompt be opt-in or on by default when `.opencode/command/` is empty?
