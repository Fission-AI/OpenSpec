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
// Use existing AI_TOOLS config to get directory mappings
// Each tool in AI_TOOLS has a skillsDir property (e.g., '.claude', '.cursor', '.windsurf')
// Scan cwd for existing directories matching skillsDir values, pre-select matches
const detectedTools = AI_TOOLS.filter(tool =>
  fs.existsSync(path.join(cwd, tool.skillsDir))
);
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

**Why not a separate tool manifest?**

Tool selection (which assistants a project uses) is per-user AND per-project, but the two config locations are per-user-only (global config) or per-project-shared (checked-in project config). A separate manifest was explored and rejected:

- *Path-keyed global config* (`projects: { "/path": { tools: [...] } }`): Fragile on directory move/rename/delete, symlink ambiguity, and project behavior depends on invisible external state.
- *Gitignored local file* (`.openspec.local`): Lost on fresh clone, adds file management overhead.
- *Checked-in project config* (`openspec/config.yaml` with `tools` field): Forces tool choices on the whole team — Alice uses Claude Code, Bob uses Cursor, neither wants the other's tools mandated.

The filesystem approach avoids all three problems. For teams, it's actually beneficial: checked-in skill files mean `openspec update` from any team member refreshes skills for all tools the project supports. The generated files serve as both the deliverable and the implicit tool manifest.

Known gap: a tool that stores config outside the project tree (no local directory to scan) would need tool-specific handling, since there's nothing in the project to scan. Address if/when such a tool is supported.

**When to use init vs update:**
- `init`: First time setup, or when you want to change which tools are configured
- `update`: After changing config, or to refresh templates to latest version

### 8. Existing User Migration

When `openspec init` or `openspec update` encounters a project with existing workflows but no `profile` field in global config, it performs a one-time migration to preserve the user's current setup.

**Rationale:** Without migration, existing users would default to `core` profile, causing `propose` to be added on top of their 10 workflows — making things worse, not better. Migration ensures existing users keep exactly what they have.

**Triggered by:** Both `init` (re-init on existing project) and `update`. The migration check is a shared function called early in both commands, before profile resolution.

**Detection logic:**
```typescript
// Shared migration check, called by both init and update:
function migrateIfNeeded(projectPath: string, tools: AiTool[]): void {
  const globalConfig = readGlobalConfig();
  if (globalConfig.profile) return; // already migrated or explicitly set

  const installedWorkflows = scanInstalledWorkflows(projectPath, tools);
  if (installedWorkflows.length === 0) return; // new user, use core defaults

  // Existing user — migrate to custom profile
  writeGlobalConfig({
    ...globalConfig,
    profile: 'custom',
    delivery: 'both',
    workflows: installedWorkflows,
  });
}
```

**Scanning logic:**
- Scan all tool directories (`.claude/skills/`, `.cursor/skills/`, etc.) for workflow directories/files
- Match only against `ALL_WORKFLOWS` constant — ignore user-created custom skills/commands
- Map directory names back to workflow IDs (e.g., `openspec-explore/` → `explore`, `opsx-explore.md` → `explore`)
- Take the union of detected workflow names across all tools

**Edge cases:**
- **User manually deleted some workflows:** Migration scans what's actually installed, respecting their choices
- **Multiple projects with different workflow sets:** First project to trigger migration sets global config; subsequent projects use it
- **User has custom (non-OpenSpec) skills in the directory:** Ignored — scanner only matches known workflow IDs from `ALL_WORKFLOWS`
- **Migration is idempotent:** If `profile` is already set in config, no re-migration occurs
- **Non-interactive (CI):** Same migration logic, no confirmation needed — it's preserving existing state

**Alternatives considered:**
- Migrate during `init` instead of `update`: Init already has its own flow (tool selection, etc.). Mixing migration with init creates confusing UX
- Don't migrate, just default to core: Breaks existing users by adding `propose` and showing "extra workflows" warnings
- Migrate at global config read time: Too implicit, hard to show feedback to user

### 9. Generic Next-Step Guidance in Templates

Workflow templates use generic, concept-based next-step guidance rather than referencing specific workflow commands. For example, instead of "run `/opsx:propose`", templates say "create a change proposal".

**Rationale:** Conditional cross-referencing (where each template checks which other workflows are installed and renders different command names) adds significant complexity to template generation, testing, and maintenance. Generic guidance avoids this entirely while still being useful — users already know their installed workflows.

**Note:** If we find that users consistently struggle to map concepts to commands, we can revisit this with conditional cross-references. For now, simplicity wins.

### 7. Fix Multi-Select Keybindings

Change from tab-to-confirm to industry-standard space/enter.

**Rationale:** Tab to confirm is non-standard and confuses users. Most CLI tools use space to toggle, enter to confirm.

**Implementation:** Modify `src/prompts/searchable-multi-select.ts` keybinding configuration.

### 10. Update Sync Must Consider Config Drift, Not Just Version Drift

`openspec update` cannot rely only on `generatedBy` version checks for deciding whether work is needed.

**Rationale:** profile and delivery changes can require file add/remove operations even when existing skill templates are current. If we only check template versions, update may incorrectly return "up to date" and skip required sync.

**Implementation:**
- Keep version checks for template refresh decisions
- Add file-state drift checks for profile/delivery (missing expected files or stale files from removed delivery mode)
- Treat either version drift OR config drift as update-required

### 11. Tool Configuration Detection Includes Commands-Only Installs

Configured-tool detection for update must include command files, not only skill files.

**Rationale:** with `delivery: commands`, a project can be fully configured without skill files. Skill-only detection incorrectly reports "No configured tools found."

**Implementation:**
- For update flows, treat a tool as configured if it has either generated skills or generated commands
- Keep migration workflow scanning behavior unchanged (skills remain the migration source of truth)

### 12. Init Profile Override Is Strictly Validated

`openspec init --profile` must validate allowed values before proceeding.

**Rationale:** silently accepting unknown profile values hides user errors and produces implicit fallback behavior.

**Implementation:** accept only `core` and `custom`; throw a clear CLI error for invalid values.

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
