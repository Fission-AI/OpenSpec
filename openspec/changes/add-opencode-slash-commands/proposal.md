# Add OpenCode Slash Command Support

## Summary
- Extend OpenSpec's slash command scaffolding to support OpenCode's `.opencode/command/` markdown commands alongside Claude and Cursor.
- Generate and refresh three workflow-aligned commands (`openspec-proposal`, `openspec-apply`, `openspec-archive`) using the shared templates already used by other agents.
- Ensure OpenCode appears in the CLI tool selection flow so teams can opt into slash command automation during `init` and keep them updated via `update`.

## Motivation
Teams adopting OpenSpec increasingly rely on OpenCode's slash command system to standardize how collaborators invoke AI helpers. We already provide purpose-built commands for Claude and Cursor to guide proposal, implementation, and archiving flows. Without equivalent commands in OpenCode, mixed-tool teams must recreate these instructions manually, leading to drift and inconsistent workflows. Adding first-class OpenCode support keeps multi-agent teams aligned and reduces setup friction for users migrating between tools.

## Proposal
1. **Tool selection**
   - Add OpenCode as an available configurator in the interactive `openspec init` flow (and any non-interactive selection plumbing).
   - Describe the option as creating `.opencode/command/*.md` slash commands so users understand the outcome.
2. **Slash command generation**
   - Reuse the shared slash command template bodies and produce three files under `.opencode/command/`: `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`.
   - Wrap command content in OpenSpec markers placed after any YAML frontmatter so future updates remain idempotent.
   - Populate frontmatter with at minimum a `description` summarizing the workflow stage; allow optional OpenCode-specific keys (`agent`, `model`) to remain user-editable outside the markers.
3. **Slash command updates**
   - During `openspec update`, detect existing `.opencode/command/openspec-*.md` files and refresh only the managed sections using the same templates.
   - Skip creation if the files are missing, mirroring current behavior for other tools.
4. **User feedback & documentation**
   - Reflect OpenCode updates in CLI logging alongside Claude and Cursor so users see which commands changed.
   - Update any user-facing success messaging or docs snippets that enumerate supported slash-command tools.

## Open Questions
- Should we scaffold default `agent` and `model` values in the frontmatter, or leave them blank so teams can decide which OpenCode agent executes each command?
- Do we need a migration strategy if existing OpenCode commands already exist with different filenames or markers?

## Out of Scope
- Adding additional OpenSpec commands beyond the core proposal/apply/archive trio.
- Building a standalone command to regenerate slash commands outside of `init`/`update`.

## Dependencies
- Shares the slash command template system introduced in `add-slash-command-support`; confirm the templates can emit OpenCode-specific wrappers without duplication.
