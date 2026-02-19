## Why

Users have complained that there are too many skills/commands (currently 10) and new users feel overwhelmed. We want to simplify the default experience while preserving power-user capabilities and backwards compatibility.

The goal: **get users to an "aha moment" in under a minute**.

```text
0:00  $ openspec init
      ✓ Done. Run /opsx:propose "your idea"

0:15  /opsx:propose "add user authentication"

0:45  Agent creates proposal.md, design.md, tasks.md
      "Whoa, it planned the whole thing for me" ← AHA

1:00  /opsx:apply
```

Additionally, users have different preferences for how workflows are delivered (skills vs commands vs both), but this should be a power-user configuration, not something new users think about.

## What Changes

### 1. Smart Defaults Init

Init auto-detects tools and asks for confirmation:

```text
$ openspec init

Detected tools:
  [x] Claude Code
  [x] Cursor
  [ ] Windsurf

Press Enter to confirm, or Space to toggle

Setting up OpenSpec...
✓ Done

Start your first change:
  /opsx:propose "add dark mode"
```

**No prompts for profile or delivery.** Defaults are:
- Profile: core
- Delivery: both

Power users can customize via `openspec config profile`.

### 2. Tool Detection Behavior

Init scans for existing tool directories (`.claude/`, `.cursor/`, etc.):
- **Tools detected (interactive):** Shows pre-selected checkboxes, user confirms or adjusts
- **No tools detected (interactive):** Prompts for full tool selection
- **Non-interactive (CI):** Uses detected tools automatically, fails if none detected

### 3. Fix Tool Selection UX

Current behavior confuses users:
- Tab to confirm (unexpected)

New behavior:
- **Space** to toggle selection
- **Enter** to confirm

### 4. Introduce Profiles

Profiles define which workflows to install:

- **core** (default): `propose`, `explore`, `apply`, `archive` (4 workflows)
- **custom**: User-selected subset of workflows

The `propose` workflow is new - it combines `new` + `ff` into a single command that creates a change and generates all artifacts.

### 5. Improved Propose UX

`/opsx:propose` should naturally onboard users by explaining what it's doing:

```text
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

```shell
# Profile configuration (interactive picker for delivery + workflows)
openspec config profile          # interactive picker
openspec config profile core     # preset shortcut (core workflows, preserves delivery)
```

The interactive picker allows users to configure both delivery method and workflow selection in one place:

```
$ openspec config profile

Delivery: [skills] [commands] [both]
                              ^^^^^^

Workflows: (space to toggle, enter to save)
[x] propose
[x] explore
[x] apply
[x] archive
[ ] new
[ ] ff
[ ] continue
[ ] verify
[ ] sync
[ ] bulk-archive
[ ] onboard
```

### 8. Backwards Compatibility & Migration

**Existing users keep their current setup.** When `openspec update` runs on a project with existing workflows and no `profile` in global config, it performs a one-time migration:

1. Scans installed workflow files across all tool directories in the project
2. Writes `profile: "custom"`, `delivery: "both"`, `workflows: [<detected>]` to global config
3. Refreshes templates but does NOT add or remove any workflows
4. Displays: "Migrated: custom profile with N existing workflows"

After migration, subsequent `init` and `update` commands respect the migrated config.

**Key behaviors:**
- Existing users' workflows are preserved exactly as-is (no `propose` added automatically)
- Both `init` (re-init) and `update` trigger migration on existing projects if no profile is set
- `openspec init` on a **new** project (no existing workflows) uses global config, defaulting to `core`
- `init` with a custom profile shows what will be installed and prompts to proceed or reconfigure
- `init` validates `--profile` values (`core` or `custom`) and errors on invalid input
- Migration message mentions `propose` and suggests `openspec config profile core` to opt in
- After migration, users can opt into `core` profile via `openspec config profile core`
- Workflow templates conditionally reference only installed workflows in "next steps" guidance
- Delivery changes are applied: switching to `skills` removes command files, switching to `commands` removes skill files
- Re-running `init` applies delivery cleanup on existing projects (removes files that no longer match delivery)
- `update` treats profile/delivery drift as update-required even when template versions are already current
- `update` treats command-only installs as configured tools
- All workflows remain available via custom profile

## Capabilities

### New Capabilities

- `profiles`: Workflow profiles (core, custom), delivery preferences, global config storage, interactive picker
- `propose-workflow`: Combined workflow that creates change + generates all artifacts

### Modified Capabilities

- `cli-init`: Smart defaults with tool auto-detection, profile-based skill/command generation
- `cli-update`: Profile support, delivery changes, one-time migration for existing users

## Impact

### New Files
- `src/core/templates/workflows/propose.ts` - New propose workflow template
- `src/core/profiles.ts` - Profile definitions and logic
- `src/core/available-tools.ts` - Detect what AI tools user has from directories

### Modified Files
- `src/core/init.ts` - Smart defaults, auto-detection, tool confirmation
- `src/core/config.ts` - Add profile and delivery types
- `src/core/global-config.ts` - Add profile, delivery, workflows fields to schema
- `src/core/shared/skill-generation.ts` - Filter by profile, respect delivery
- `src/core/shared/tool-detection.ts` - Update SKILL_NAMES and COMMAND_IDS to include propose
- `src/commands/config.ts` - Add `profile` subcommand with interactive picker
- `src/core/update.ts` - Add profile/delivery support, file deletion for delivery changes
- `src/prompts/searchable-multi-select.ts` - Fix keybindings (space/enter)

### Global Config Schema Extension
```json
// ~/.config/openspec/config.json (extends existing)
{
  "telemetry": { ... },          // existing
  "featureFlags": { ... },       // existing
  "profile": "core",             // NEW: core | custom
  "delivery": "both",            // NEW: both | skills | commands
  "workflows": ["propose", ...]  // NEW: only if profile: custom
}
```

## Profiles Reference

| Profile | Workflows | Description |
|---------|-----------|-------------|
| core | propose, explore, apply, archive | Streamlined flow for most users (default) |
| custom | user-defined | Pick exactly what you need via `openspec config profile` |
