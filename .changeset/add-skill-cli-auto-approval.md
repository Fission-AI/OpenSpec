---
"@fission-ai/openspec": patch
---

### Features

- **Auto-approve the OpenSpec CLI in generated skills** — every generated `SKILL.md` now carries `allowed-tools: Bash(openspec:*)` in its frontmatter, so agents that honor the Agent Skills standard run `openspec` commands from a skill without prompting for approval on each call. Scope is limited to the `openspec` CLI; because `allowed-tools` pre-approves rather than restricts, every other tool a skill uses stays available under your normal permission settings.
