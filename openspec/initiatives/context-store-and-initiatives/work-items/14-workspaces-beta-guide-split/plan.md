# Workspaces Beta Guide Split

## Status

Proposed next work item.

## Goal

Make the beta docs match how people should actually use the feature:

- humans use terminal prompts for local setup and local paths
- coding agents use explicit CLI commands for OpenSpec work

## Working Model

User-facing docs should be light on flags and heavy on agent prompts. The agent
CLI playbook should carry the exact commands, JSON surfaces, cwd rules, and
current caveats.

Manual beta clarification: after a workspace is opened, the user should ask the
agent to explore or draft from the workspace. The agent should resolve the
workspace and initiative context, identify the owning linked repo, and run
repo-local OpenSpec commands from that repo. The workspace is the conversation
surface, not the artifact home.

## Scope

- Revise `docs/workspaces-beta/user-guide.md`.
- Revise `docs/workspaces-beta/agent-cli-playbook.md`.
- Keep the docs minimal until the flow has been tried manually.
- Record command or prompt gaps found during the doc pass.

## Non-Goals

- Do not change CLI behavior in this work item.
- Do not promise sync, cloning, branching, worktrees, progress dashboards, or
  enforced edit boundaries.
