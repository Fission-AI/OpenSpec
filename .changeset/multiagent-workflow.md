---
"@fission-ai/openspec": minor
---

Add multi-agent orchestration workflow with dispec-driven schema

- New `dispec-driven` schema for distributing work across multiple AI agents
- `/opsx:multiagent` workflow: plans and distributes a change into agent-assignable tasks
- `/opsx:multiagent-apply` workflow: orchestrates a Claude Code agent team to implement tasks in parallel
- New artifact types: `dependencies.md` (dependency analysis) and `distribution.md` (agent work packages)
- Schema templates for all new artifact types
- Support for GitHub-based npm dependency installation in `build.js`
