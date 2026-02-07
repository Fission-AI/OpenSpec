# Change: Replace project.md with context-check skill

## Why
The current `lightspec/project.md` template file is a passive document that users must manually populate. It's referenced in instructions but not actively validated. This leads to incomplete or outdated project context that AI assistants need. A proactive skill that validates and helps populate context in the user's chosen agent instruction file (CLAUDE.md or AGENTS.md) will provide better guidance and ensure context quality.

## What Changes
- **REMOVED**: Delete `lightspec/project.md` template entirely (no backward compatibility, no migration)
- **ADDED**: New `/lightspec:context-check` skill installed at init time (as a Codex prompt in `$CODEX_HOME/prompts`)
- **MODIFIED**: Init command no longer generates `project.md`
- **MODIFIED**: AGENTS.md template no longer references `project.md` (references removed from workflow instructions)
- **MODIFIED**: Slash command templates (`/lightspec:proposal`, `/lightspec:apply`) no longer reference `project.md`

The new skill will:
1. Detect which agent file exists at project root (CLAUDE.md or AGENTS.md)
2. Validate it contains adequate descriptions for required context properties (Purpose, Domain Context, Tech Stack, Conventions, etc.)
3. Provide actionable feedback on what's missing or sub-optimal
4. Offer to launch an exploration to gather missing context and propose writing it to the file

## Impact
- Affected specs: `init-command`, `slash-commands`, `agent-instructions`
- Affected code:
  - `src/core/init.ts` - Remove project.md template generation
  - `src/core/templates/index.ts` - Remove project.md from template list
  - `src/core/templates/agents-template.ts` - Remove project.md references
  - `src/core/templates/slash-command-templates.ts` - Remove project.md references from proposal/apply steps
  - `src/core/configurators/slash/codex.ts` - Add new context-check skill configuration (new file path)
  - New file: `src/core/templates/context-check-template.ts` - Template for the new skill
