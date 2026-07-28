---
'@fission-ai/openspec': patch
---

Workflow skills and commands no longer tell agents to use the Claude Code-only AskUserQuestion tool. The same templates are generated for every supported tool, and agents without that tool (OpenCode, Factory Droid, Codex, and others) errored or stalled on the instruction. The guidance is now runtime-neutral: agents are simply told to ask the user.
