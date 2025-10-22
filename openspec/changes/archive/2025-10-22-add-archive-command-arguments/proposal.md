# Add Archive Command Arguments

## Why
The `/openspec:archive` slash command currently lacks argument support, forcing the AI to infer which change to archive from conversation context or by listing all changes. This creates a safety risk where the wrong proposal could be archived if the context is ambiguous or multiple changes exist. Users expect to specify the change ID explicitly, matching the behavior of the CLI command `openspec archive <id>`.

## What Changes
- Add `$ARGUMENTS` placeholder to the OpenCode archive slash command frontmatter (matching existing pattern for proposal command)
- Update archive command template steps to validate the specific change ID argument when provided
- Note: Codex, GitHub Copilot, and Amazon Q already have `$ARGUMENTS` for archive; Claude/Cursor/Windsurf/Kilocode don't support arguments

## Impact
- Affected specs: `cli-update` (slash command generation logic)
- Affected code:
  - `src/core/configurators/slash/opencode.ts` (add `$ARGUMENTS` to archive frontmatter)
  - `src/core/templates/slash-command-templates.ts` (archive template steps for argument validation)
- Breaking: No - this is additive functionality that makes the command safer
- User-facing: Yes - OpenCode users will be able to pass the change ID as an argument: `/openspec:archive <change-id>`
