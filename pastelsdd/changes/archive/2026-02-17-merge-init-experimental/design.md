## Context

Currently `pastelsdd init` and `pastelsdd experimental` are separate commands with distinct purposes:

- **init**: Creates `pastelsdd/` directory, generates `AGENTS.md`/`project.md`, configures tool config files (`CLAUDE.md`, etc.), generates old slash commands (`/pastelsdd:proposal`, etc.)
- **experimental**: Generates skills (9 per tool), generates pastel slash commands (`/pastel:new`, etc.), creates `config.yaml`

The skill-based workflow (experimental) is the direction we're going, so we're making it the default by merging into `init`.

## Goals / Non-Goals

**Goals:**
- Single `pastelsdd init` command that sets up the complete skill-based workflow
- Clean migration path for existing users with legacy artifacts
- Remove all code related to config files and old slash commands
- Keep the polished UX from experimental (animated welcome, searchable multi-select)

**Non-Goals:**
- Supporting both workflows simultaneously
- Providing options to use the old workflow
- Backward compatibility for `/pastelsdd:*` commands (breaking change)

## Decisions

### Decision 1: Merge into init, not into experimental

**Choice**: Rewrite `init` to do what `experimental` does, then delete `experimental`.

**Rationale**: `init` is the canonical setup command. Users expect `init` to set up their project. `experimental` was always meant to be temporary.

**Alternatives considered**:
- Keep `experimental` as the main command → confusing name for default behavior
- Create new command → unnecessary, `init` already exists

### Decision 2: Legacy cleanup with Y/N prompt

**Choice**: Detect legacy artifacts, show what was found, prompt `"Legacy files detected. Upgrade and clean up? [Y/n]"`, then remove if confirmed.

**Rationale**: Users should know what's being removed. A single Y/N is simple and decisive. No need for multiple options.

**Alternatives considered**:
- Multiple options (keep/remove/cancel) → overcomplicated
- Silent removal → users might be surprised
- Just warn without removing → leaves cruft

### Decision 3: Surgical removal of legacy content

**Choice**: For files with mixed content (Pastelsdd markers + user content), only remove the Pastelsdd marker block. For files that are 100% Pastelsdd content, delete the entire file.

**Rationale**: Respects user customizations. CLAUDE.md might have other instructions beyond Pastelsdd.

**Edge cases**:
- **Config files with mixed content**: Remove only `<!-- PASTELSDD:START -->` to `<!-- PASTELSDD:END -->` block
- **Config files that are 100% Pastelsdd**: Delete file entirely (check if content outside markers is empty/whitespace)
- **Old slash command directories** (`.claude/commands/pastelsdd/`): Delete entire directory (ours)
- **`pastelsdd/AGENTS.md`**: Delete (ours)
- **Root `AGENTS.md`**: Only remove Pastelsdd marker block, preserve rest

### Decision 6: Preserve project.md with migration hint

**Choice**: Do NOT auto-delete `pastelsdd/project.md`. Preserve it and show a message directing users to manually migrate content to `config.yaml`'s `context:` field.

**Rationale**:
- `project.md` may contain valuable user-written project documentation
- The new workflow uses `config.yaml.context` for the same purpose (auto-injected into artifacts)
- Auto-deleting would lose user content; auto-migrating is complex (needs LLM to compress)
- Users can migrate manually or use `/pastel:explore` to get AI assistance

**Migration path**:
1. During legacy cleanup, detect `pastelsdd/project.md` but do not delete
2. Show in output: "pastelsdd/project.md still exists - migrate content to config.yaml's context: field, then delete"
3. User migrates manually or asks Claude in explore mode: "help me migrate project.md to config.yaml"
4. User deletes project.md when ready

**Why not auto-migrate?**
- `project.md` is verbose (sections, headers, placeholders)
- `config.yaml.context` should be concise and dense
- LLM compression would be ideal but adds complexity and non-determinism to init
- Manual migration lets users decide what's actually important

### Decision 4: Hidden alias for experimental

**Choice**: Keep `pastelsdd experimental` as a hidden command that delegates to `init`.

**Rationale**: Users who learned `experimental` can still use it during transition. Hidden means it won't show in help.

### Decision 5: Reuse existing infrastructure

**Choice**: Reuse skill templates, command adapters, welcome screen, and multi-select from experimental.

**Rationale**: Already built and working. Just needs to be called from init instead of experimental.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users with custom `/pastelsdd:*` commands lose them | Document in release notes; old commands are in git history |
| Mixed-content detection might be imperfect | Conservative approach: if unsure, preserve the file and warn |
| Users confused by missing config files | Clear messaging in init output about what changed |
| `pastelsdd update` might break | Review and update `update` command to work with new structure |

## Architecture

### What init creates (after merge)

```
pastelsdd/
  ├── config.yaml           # Schema settings (from experimental)
  ├── specs/                # Empty, for user's specs
  └── changes/              # Empty, for user's changes
      └── archive/

.<tool>/skills/             # 9 skills per selected tool
  ├── pastelsdd-explore/SKILL.md
  ├── pastelsdd-new-change/SKILL.md
  ├── pastelsdd-continue-change/SKILL.md
  ├── pastelsdd-apply-change/SKILL.md
  ├── pastelsdd-ff-change/SKILL.md
  ├── pastelsdd-verify-change/SKILL.md
  ├── pastelsdd-sync-specs/SKILL.md
  ├── pastelsdd-archive-change/SKILL.md
  └── pastelsdd-bulk-archive-change/SKILL.md

.<tool>/commands/pastel/      # 9 slash commands per selected tool
  ├── explore.md
  ├── new.md
  ├── continue.md
  ├── apply.md
  ├── ff.md
  ├── verify.md
  ├── sync.md
  ├── archive.md
  └── bulk-archive.md
```

### What init no longer creates

- `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, etc. (config files)
- `pastelsdd/AGENTS.md`
- `pastelsdd/project.md`
- Root `AGENTS.md` stub
- `.claude/commands/pastelsdd/` (old slash commands)

### Legacy detection targets

| Artifact Type | Detection Method | Removal Method |
|--------------|------------------|----------------|
| Config files (CLAUDE.md, etc.) | File exists AND contains Pastelsdd markers | Remove marker block; delete file if empty after |
| Old slash command dirs | Directory exists at `.<tool>/commands/pastelsdd/` | Delete entire directory |
| pastelsdd/AGENTS.md | File exists at `pastelsdd/AGENTS.md` | Delete file |
| pastelsdd/project.md | File exists at `pastelsdd/project.md` | **Preserve** - show migration hint only |
| Root AGENTS.md | File exists at `AGENTS.md` AND contains Pastelsdd markers | Remove marker block; delete file if empty after |

### Code to remove

- `src/core/configurators/` - entire directory (ToolRegistry, all config generators)
- `src/core/configurators/slash/` - entire directory (SlashCommandRegistry, old command generators)
- `src/core/templates/slash-command-templates.ts` - old `/pastelsdd:*` content
- `src/core/templates/claude-template.ts`
- `src/core/templates/cline-template.ts`
- `src/core/templates/costrict-template.ts`
- `src/core/templates/agents-template.ts`
- `src/core/templates/agents-root-stub.ts`
- `src/core/templates/project-template.ts`
- `src/commands/experimental/` - entire directory (merged into init)
- Related test files

### Code to migrate into init

- Animated welcome screen (`src/ui/welcome-screen.ts`) - keep, call from init
- Searchable multi-select (`src/prompts/searchable-multi-select.ts`) - keep, call from init
- Skill templates (`src/core/templates/skill-templates.ts`) - keep
- Command generation (`src/core/command-generation/`) - keep
- Tool states detection (from `experimental/setup.ts`) - move to init

## Open Questions

1. **What happens to `pastelsdd update`?** - RESOLVED

   **Current behavior**: Updates `pastelsdd/AGENTS.md`, config files (`CLAUDE.md`, etc.) via `ToolRegistry`, and old slash commands (`/pastelsdd:*`) via `SlashCommandRegistry`.

   **New behavior**: Rewrite to refresh skills and pastel commands instead:
   - Detect which tools have skills installed (check for `.claude/skills/pastelsdd-*/`, etc.)
   - Refresh all 9 skill files per installed tool using `skill-templates.ts`
   - Refresh all 9 pastel command files per installed tool using `command-generation/` adapters
   - Remove imports of `ToolRegistry`, `SlashCommandRegistry`, `agentsTemplate`
   - Update output messaging to reflect skills/commands instead of config files

   **Key principle**: Same as current update - only refresh existing tools, don't add new ones.

2. **Should we keep `pastelsdd schemas` and other experimental subcommands?** - RESOLVED

   **Decision**: Yes, keep them. Remove "[Experimental]" label from all subcommands (status, instructions, schemas, etc.). See task 4.3.
