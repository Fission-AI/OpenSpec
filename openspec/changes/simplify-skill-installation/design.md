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
- Zero-question init with sensible defaults (core profile, both delivery)
- Auto-detect installed tools from existing directories
- Introduce profile system (core/extended/custom) for workflow selection
- Introduce delivery config (skills/commands/both) as power-user setting
- Create new `propose` workflow combining `new` + `ff`
- Fix tool selection UX (space to select, enter to confirm)
- Maintain backwards compatibility for existing users

**Non-Goals:**
- Removing any existing workflows (all remain available in extended profile)
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

### 2. Profile System with Three Tiers

```
core (default):     propose, explore, apply, archive (4)
extended:           all 11 workflows
custom:             user-defined subset
```

**Rationale:** Core covers the essential loop (propose → explore → apply → archive). Extended provides full control for power users. Custom allows fine-tuning.

**Alternatives considered:**
- Two tiers (simple/full): Less flexibility for users who want most but not all
- No profiles (always custom): More cognitive load, defeats simplification goal

### 3. Propose Workflow = New + FF Combined

Single workflow that creates a change and generates all artifacts in one step.

**Rationale:** Most users want to go from idea to implementation-ready. Separating `new` (creates folder) and `ff` (generates artifacts) adds unnecessary steps. Power users who want control can use `new` + `continue` from extended profile.

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

### 5. Delivery as Config, Not Init Prompt

Delivery preference (skills/commands/both) stored in global config, defaulting to "both".

**Rationale:** Most users don't know or care about this distinction. Power users who have a preference can set it once via `openspec config set delivery skills`. Not worth asking during init.

### 6. Filesystem as Truth for Installed Workflows

What's installed in `.claude/skills/` (etc.) is the source of truth, not config.

**Rationale:**
- Backwards compatible with existing installs
- User can manually add/remove skill directories
- Config profile is a "template" for what to install, not a constraint

**Behavior:**
- `openspec init` installs profile workflows, doesn't remove extras
- `openspec init --apply-profile` syncs to profile (removes extras via SKILL_NAMES and COMMAND_IDS lookups)
- `openspec profile show` reads filesystem, shows what's actually installed
- `openspec profile install <workflow>` immediately generates files (not config-only)
- `openspec profile uninstall <workflow>` immediately removes files (not config-only)

### 6a. Profile Install/Uninstall = Immediate Filesystem Mutation

When user runs `profile install X`, files are generated immediately. No separate "apply" step.

**Rationale:** Users expect "install" to install. Config-only mutations with deferred application creates confusion where `profile install explore` succeeds but `profile show` shows nothing installed.

**Implementation:**
1. Update config to reflect new custom profile
2. Detect all configured tools in current project
3. Generate skill/command files for the workflow across all tools
4. Display confirmation with installed locations

### 6b. Safe Deletion via Constant Lookups

When removing workflows, only delete items in SKILL_NAMES and COMMAND_IDS constants.

**Rationale:** We generate known lists of skills and commands. Delete only what we created by checking against explicit lists, not pattern matching.

**Implementation:**
```typescript
// For skills - only delete if name is in our known list
if (SKILL_NAMES.includes(dirName)) {
  // Safe to delete skill directory - we created it
}

// For commands - only delete if ID is in our known list
if (COMMAND_IDS.includes(commandId)) {
  // Safe to delete command file - we created it
  // Use tool adapter to resolve actual file path
}
```

**Constants:**
- `SKILL_NAMES`: Array of skill directory names (e.g., `openspec-explore`, `openspec-apply-change`)
- `COMMAND_IDS`: Array of command IDs (e.g., `explore`, `apply`, `new`)

### 8. Fix Multi-Select Keybindings

Change from tab-to-confirm to industry-standard space/enter.

**Rationale:** Tab to confirm is non-standard and confuses users. Most CLI tools use space to toggle, enter to confirm.

**Implementation:** Modify `src/prompts/searchable-multi-select.ts` keybinding configuration.

## Risks / Trade-offs

**Risk: Breaking existing user workflows**
→ Mitigation: Filesystem is truth, existing installs untouched. Extended profile includes all current workflows.

**Risk: Propose workflow duplicates ff logic**
→ Mitigation: Extract shared artifact generation into reusable function, both `propose` and `ff` call it.

**Risk: Global config file management**
→ Mitigation: Create directory/file on first use. Handle missing file gracefully (use defaults).

**Risk: Auto-detection false positives**
→ Mitigation: Show detected tools and ask for confirmation, don't auto-install silently.

**Trade-off: Core profile has only 4 workflows**
→ Acceptable: These cover the main loop. Users who need more can `openspec profile set extended` or install individual workflows.

## Migration Plan

1. **Phase 1: Add infrastructure**
   - Extend global-config.ts with profile/delivery/workflows fields
   - Profile definitions and resolution
   - Tool auto-detection

2. **Phase 2: Create propose workflow**
   - New template combining new + ff
   - Enhanced UX with explanatory output

3. **Phase 3: Update init flow**
   - Zero-question default flow
   - Auto-detect and confirm tools
   - Respect profile/delivery settings

4. **Phase 4: Add profile/config commands**
   - `openspec profile set/install/uninstall/list/show`
   - `openspec config set/get/list`

5. **Phase 5: Fix multi-select UX**
   - Update keybindings in searchable-multi-select

**Rollback:** All changes are additive. Existing behavior preserved via extended profile.
