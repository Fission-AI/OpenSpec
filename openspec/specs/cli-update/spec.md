# Update Command Specification

## Purpose

As a developer using OpenSpec, I want to update the OpenSpec instructions in my project when new versions are released, so that I can benefit from improvements to AI agent instructions.

## Core Requirements

### Update Behavior

The update command SHALL update OpenSpec instruction files to the latest templates.

@requirement update-command-execution
WHEN a user runs `openspec update` THEN the command SHALL:
- Check if the `openspec` directory exists
- Replace `openspec/README.md` with the latest template (complete replacement)
- Update the OpenSpec-managed block in `CLAUDE.md` using markers
  - Preserve user content outside markers
  - Create `CLAUDE.md` if missing
- Display ASCII-safe success message: "Updated OpenSpec instructions"

### Prerequisites

The command SHALL require:
- An existing `openspec` directory (created by `openspec init`)

@requirement update-no-directory
IF the `openspec` directory does not exist THEN:
- Display error: "No OpenSpec directory found. Run 'openspec init' first."
- Exit with code 1

### File Handling

The update command SHALL:
- Completely replace `openspec/README.md` with the latest template
- Update only the OpenSpec-managed block in `CLAUDE.md` using markers
- Use the default directory name `openspec`
- Be idempotent (repeated runs have no additional effect)

## Edge Cases

### File Permissions
@requirement update-file-permissions
IF file write fails THEN let the error bubble up naturally with file path.

### Missing CLAUDE.md
@requirement update-missing-claude-md
IF CLAUDE.md doesn't exist THEN create it with the template content.

### Custom Directory Name
Not supported in this change. The default directory name `openspec` SHALL be used.

## Success Criteria

Users SHALL be able to:
- Update OpenSpec instructions with a single command
- Get the latest AI agent instructions
- See clear confirmation of the update

The update process SHALL be:
- Simple and fast (no version checking)
- Predictable (same result every time)
- Self-contained (no network required)