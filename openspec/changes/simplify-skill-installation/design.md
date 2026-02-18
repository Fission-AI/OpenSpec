## Context

OpenSpec currently installs 10 workflows (skills + commands) for every user, overwhelming new users. The init flow asks multiple questions (profile, delivery, tools) creating friction before users can experience value.

Current architecture:
- `src/core/init.ts` - Handles tool selection and skill/command generation
- `src/core/config.ts` - Defines `AI_TOOLS` with `skillsDir` mappings
- `src/core/shared/skill-generation.ts` - Generates skill files from templates
- `src/core/templates/workflows/*.ts` - Individual workflow templates
- `src/prompts/searchable-multi-select.ts` - Tool selection UI

Global config exists at `~/.config/openspec/config.json` for telemetry/feature flags. Profile/delivery settings will extend this existing config.

## Goals / Non-Goals

**Goals:**
- Get new users to "aha moment" in under 1 minute
- Smart defaults init with auto-detection and confirmation (core profile, both delivery)
- Auto-detect installed tools from existing directories
- Introduce profile system (core/custom) for workflow selection
- Introduce delivery config (skills/commands/both) as power-user setting
- Create new `propose` workflow combining `new` + `ff`
- Fix tool selection UX (space to select, enter to confirm)
- Maintain backwards compatibility for existing users

**Non-Goals:**
- Removing any existing workflows (all remain available via custom profile)
- Per-project profile/delivery settings (user-level only)
- Changing the artifact structure or schema system
- Modifying how skills/commands are formatted or written

## Decisions

### 1. Extend Existing Global Config

Add profile/delivery settings to existing `~/.config/openspec/config.json` (via `src/core/global-config.ts`).

**Rationale:** Global config already exists with XDG/APPDATA cross-platform path handling, schema evolution, and merge-with-defaults behavior. Reusing it avoids a second config file and leverages existing infrastructure.

**Schema extension:**
```json
{
  "telemetry": { ... },     // existing
  "featureFlags": { ... },  // existing
  "profile": "core",        // NEW
  "delivery": "both",       // NEW
  "workflows": [...]        // NEW (only for custom profile)
}
```

**Alternatives considered:**
- New `~/.openspec/config.yaml`: Creates second config file, different format, path confusion
- Project config: Would require syncing mechanism, users edit it directly
- Environment variables: Less discoverable, harder to persist

### 2. Profile System with Two Tiers

```
core (default):     propose, explore, apply, archive (4)
custom:             user-defined subset of workflows
```

**Rationale:** Core covers the essential loop (propose → explore → apply → archive). Custom allows users to pick exactly what they need via an interactive picker.

**Configuration UX:**
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
...
```

**Alternatives considered:**
- Three tiers (core/extended/custom): Extended is redundant - users who want all workflows can select them in custom
- Separate commands for profile and delivery: Combining into one picker reduces cognitive load

### 3. Propose Workflow = New + FF Combined

Single workflow that creates a change and generates all artifacts in one step.

**Rationale:** Most users want to go from idea to implementation-ready. Separating `new` (creates folder) and `ff` (generates artifacts) adds unnecessary steps. Power users who want control can use `new` + `continue` via custom profile.

**Implementation:** New template in `src/core/templates/workflows/propose.ts` that:
1. Creates change directory via `openspec new change`
2. Runs artifact generation loop (like ff does)
3. Includes onboarding-style explanations in output

### 4. Auto-Detection with Confirmation

Scan for existing tool directories, pre-select detected tools, ask for confirmation.

**Rationale:** Reduces questions while still giving user control. Better than full auto (no confirmation) which might install unwanted tools, or no detection (always ask) which adds friction.

**Detection logic:**
```typescript
const TOOL_DIRS = {
  'claude': '.claude',
  'cursor': '.cursor',
  'windsurf': '.windsurf',
  // ... etc
};
// Scan cwd for existing directories, pre-select matches
```

### 5. Delivery as Part of Profile Config

Delivery preference (skills/commands/both) stored in global config, defaulting to "both".

**Rationale:** Most users don't know or care about this distinction. Power users who have a preference can set it via `openspec config profile` interactive picker. Not worth asking during init.

### 6. Filesystem as Truth for Installed Workflows

What's installed in `.claude/skills/` (etc.) is the source of truth, not config.

**Rationale:**
- Backwards compatible with existing installs
- User can manually add/remove skill directories
- Config profile is a "template" for what to install, not a constraint

**Behavior:**
- `openspec init` sets up new projects OR re-initializes existing projects (selects tools, generates workflows)
- `openspec update` refreshes an existing project to match current config (no tool selection)
- `openspec config profile` updates global config only, offers to run update if in a project
- Extra workflows (not in profile) are preserved
- Delivery changes are applied: switching to `skills` removes commands, switching to `commands` removes skills

**When to use init vs update:**
- `init`: First time setup, or when you want to change which tools are configured
- `update`: After changing config, or to refresh templates to latest version

### 7. Fix Multi-Select Keybindings

Change from tab-to-confirm to industry-standard space/enter.

**Rationale:** Tab to confirm is non-standard and confuses users. Most CLI tools use space to toggle, enter to confirm.

**Implementation:** Modify `src/prompts/searchable-multi-select.ts` keybinding configuration.

## Risks / Trade-offs

**Risk: Breaking existing user workflows**
→ Mitigation: Filesystem is truth, existing installs untouched. All workflows available via custom profile.

**Risk: Propose workflow duplicates ff logic**
→ Mitigation: Extract shared artifact generation into reusable function, both `propose` and `ff` call it.

**Risk: Global config file management**
→ Mitigation: Create directory/file on first use. Handle missing file gracefully (use defaults).

**Risk: Auto-detection false positives**
→ Mitigation: Show detected tools and ask for confirmation, don't auto-install silently.

**Trade-off: Core profile has only 4 workflows**
→ Acceptable: These cover the main loop. Users who need more can use `openspec config profile` to select additional workflows.

## Migration Plan

1. **Phase 1: Add infrastructure**
   - Extend global-config.ts with profile/delivery/workflows fields
   - Profile definitions and resolution
   - Tool auto-detection

2. **Phase 2: Create propose workflow**
   - New template combining new + ff
   - Enhanced UX with explanatory output

3. **Phase 3: Update init flow**
   - Smart defaults with tool confirmation
   - Auto-detect and confirm tools
   - Respect profile/delivery settings

4. **Phase 4: Add config profile command**
   - `openspec config profile` interactive picker
   - `openspec config profile core` preset shortcut

5. **Phase 5: Update the update command**
   - Read global config for profile/delivery
   - Add missing workflows from profile
   - Delete files when delivery changes (e.g., commands removed if `skills`)
   - Display summary of changes

6. **Phase 6: Fix multi-select UX**
   - Update keybindings in searchable-multi-select

**Rollback:** All changes are additive. Existing behavior preserved via custom profile with all workflows selected.
