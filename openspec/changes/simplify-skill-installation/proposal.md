## Why

Users have complained that there are too many skills/commands (currently 10) and new users feel overwhelmed. We want to simplify the default experience while preserving power-user capabilities and backwards compatibility.

The goal: **get users to an "aha moment" in under a minute**.

```
0:00  $ openspec init
      ✓ Done. Run /opsx:propose "your idea"

0:15  /opsx:propose "add user authentication"

0:45  Agent creates proposal.md, design.md, tasks.md
      "Whoa, it planned the whole thing for me" ← AHA

1:00  /opsx:apply
```

Additionally, users have different preferences for how workflows are delivered (skills vs commands vs both), but this should be a power-user configuration, not something new users think about.

## What Changes

### 1. Zero-Question Init

Init should just work with sensible defaults:

```
$ openspec init

Detected: Claude Code, Cursor
Setting up OpenSpec...
✓ Done

Start your first change:
  /opsx:propose "add dark mode"
```

**No prompts for profile or delivery.** Defaults are:
- Profile: core
- Delivery: both

Power users can customize later via `openspec profile` and `openspec config`.

### 2. Auto-Detect Tools

Init scans for existing tool directories (`.claude/`, `.cursor/`, etc.) and:
- If tools found: Shows detected tools, asks for confirmation
- If no tools found: Prompts for selection
- Non-interactive: Uses detected tools automatically, fails only if none detected

### 3. Fix Tool Selection UX

Current behavior confuses users:
- Tab to confirm (unexpected)

New behavior:
- **Space** to toggle selection
- **Enter** to confirm

### 4. Introduce Profiles

Profiles define which workflows to install:

- **core** (default): `propose`, `explore`, `apply`, `archive` (4 workflows)
- **extended**: All 11 workflows including `new`, `ff`, `continue`, `verify`, `sync`, `bulk-archive`, `onboard`
- **custom**: User-selected subset

The `propose` workflow is new - it combines `new` + `ff` into a single command that creates a change and generates all artifacts.

### 5. Improved Propose UX

`/opsx:propose` should naturally onboard users by explaining what it's doing:

```
I'll create a change with 3 artifacts:
- proposal.md (what & why)
- design.md (how)
- tasks.md (implementation steps)

When ready to implement, run /opsx:apply
```

This teaches as it goes - no separate onboarding needed for most users.

### 6. Introduce Delivery Config

Delivery controls how workflows are installed:

- **both** (default): Skills and commands
- **skills**: Skills only
- **commands**: Commands only

Stored in existing global config (`~/.config/openspec/config.json`). Not prompted during init.

### 7. New CLI Commands

```
# Profile management (what to install)
openspec profile set core
openspec profile set extended
openspec profile install explore     # add one workflow
openspec profile uninstall verify    # remove one workflow
openspec profile list                # show available profiles
openspec profile show                # show current installation

# Config management (how to install)
openspec config set delivery skills
openspec config set delivery both
openspec config get delivery
openspec config list
```

### 8. Backwards Compatibility

- Existing users with all workflows keep them (filesystem is truth)
- `openspec init` on existing projects refreshes without removing extras
- `openspec init --apply-profile` explicitly syncs to profile (removes extras)
- All existing commands remain available in extended profile

## Capabilities

### New Capabilities

- `profiles`: Support for workflow profiles (core, extended, custom)
- `delivery-config`: User preference for delivery method (skills, commands, both)
- `propose-workflow`: Combined workflow that creates change + generates all artifacts
- `user-config`: Extend existing global config with profile/delivery settings
- `available-tools`: Detect what AI tools the user has from existing directories

### Modified Capabilities

- `init`: Zero-question flow with auto-detection and sensible defaults
- `tool-selection-ux`: Space to select, Enter to confirm
- `skill-generation`: Conditional based on profile and delivery settings
- `command-generation`: Conditional based on profile and delivery settings

## Impact

### New Files
- `src/core/templates/workflows/propose.ts` - New propose workflow template
- `src/commands/profile.ts` - Profile management command
- `src/core/profiles.ts` - Profile definitions and logic
- `src/core/available-tools.ts` - Detect what AI tools user has from directories

### Modified Files
- `src/core/init.ts` - Zero-question flow, auto-detection, sensible defaults
- `src/core/config.ts` - Add profile and delivery types
- `src/core/global-config.ts` - Add profile, delivery, workflows fields to schema
- `src/core/shared/skill-generation.ts` - Filter by profile, respect delivery
- `src/core/shared/tool-detection.ts` - Update SKILL_NAMES to include propose
- `src/commands/config.ts` - Add delivery config commands
- `src/prompts/searchable-multi-select.ts` - Fix keybindings (space/enter)

### Global Config Schema Extension
```json
// ~/.config/openspec/config.json (extends existing)
{
  "telemetry": { ... },          // existing
  "featureFlags": { ... },       // existing
  "profile": "core",             // NEW: core | extended | custom
  "delivery": "both",            // NEW: both | skills | commands
  "workflows": ["propose", ...]  // NEW: only if profile: custom
}
```

## Profiles Reference

| Profile | Workflows | Description |
|---------|-----------|-------------|
| core | propose, explore, apply, archive | Streamlined flow for most users |
| extended | all 11 | Full control including new, ff, continue, verify, sync, bulk-archive, onboard |
| custom | user-defined | Pick exactly what you need |
