---
"@fission-ai/openspec": patch
---

### Features

- **Auto-approve the OpenSpec CLI in generated skills and commands** — every generated `SKILL.md` (all tools) and every Claude Code `/opsx:*` slash command now carries `allowed-tools: Bash(openspec:*)` in its frontmatter, so agents that honor the Agent Skills standard run `openspec` commands without prompting for approval on each call; tools that don't recognize the field ignore it. Scope is limited to the `openspec` CLI; because `allowed-tools` pre-approves rather than restricts, every other tool a skill or command uses stays available under your normal permission settings.
