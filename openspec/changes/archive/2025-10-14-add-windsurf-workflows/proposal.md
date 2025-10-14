## Why
- Windsurf exposes "Workflows" as the vehicle for slash-like automation: saved Markdown files under `.windsurf/workflows/` that Cascade discovers across the workspace (including subdirectories and up to the git root), then executes when a user types `/workflow-name`. These files can be team-authored, must stay under 12k characters, and can call other workflows, making them the natural place to publish OpenSpec guidance for Windsurf users.\
  ([Windsurf Workflows documentation](https://docs.windsurf.com/windsurf/cascade/workflows))
- The Wave 12 changelog reiterates that workflows are invoked via slash commands and that Windsurf stores them in `.windsurf/workflows`, so the OpenSpec CLI just needs to generate Markdown there to participate in Windsurf's command palette.\
  ("Custom Workflows" section, [Windsurf changelog](https://windsurf.com/changelog))
- OpenSpec already ships shared command bodies for proposal/apply/archive and uses markers so commands stay up to date. Extending the same templates to Windsurf keeps behaviour consistent with Claude, Cursor, and OpenCode without inventing new content flows.

## What Changes
- Add Windsurf to the CLI tool picker (`openspec init`) and the slash-command registry so selecting it scaffolds `.windsurf/workflows/openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md` with marker-managed bodies.
- Shape each Windsurf workflow with a short heading/description plus the existing OpenSpec guardrails/steps wrapped in markers, ensuring the total payload remains well below the 12,000 character limit.
- Ensure `openspec update` refreshes existing Windsurf workflows (and only those that already exist) in-place, mirroring current behaviour for other editors.
- Extend unit tests for init/update to cover Windsurf generation and updates, and update the README/tooling docs to advertise Windsurf support.

## Impact
- Specs: `cli-init`, `cli-update`
- Code: `src/core/configurators/slash/*`, `src/core/templates/slash-command-templates.ts`, CLI prompts, README
- Tests: init/update integration coverage for Windsurf workflows
