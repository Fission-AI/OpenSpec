## Why
Tie OpenSpec proposals and lifecycle updates directly to Linear so teams can pick backlog work, track status changes, and keep source-of-truth specs represented as epics in a single project view.

## What Changes
- Detect when Linear MCP is available by confirming the MCP is connected and can list teams, and load preferred team/project IDs from an OpenSpec-local config, updating `openspec/project.md` with those preferences.
- Keep OpenSpec workflows operating as usual when Linear MCP is not available, skipping Linear-specific prompts and updates.
- Ensure each source-of-truth spec in `openspec/specs/` has a matching Linear epic issue in the preferred project.
- Proposal workflow lists top backlog stories from the Linear project, prompts for selection, writes the selected story ID into `proposal.md` frontmatter, and moves the story from Backlog to Todo.
- Apply workflow updates the Linear story with proposal content and moves it to In Progress.
- Archive workflow updates the Linear story with proposal content, moves it to Done, and refreshes spec epics.

## Impact
- Affected specs: linear-mcp-workflow (new)
- Affected code: src/core/templates/slash-command-templates.ts, src/core/templates/slash-command-templates.ts consumers (init/update)
