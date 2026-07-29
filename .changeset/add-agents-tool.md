---
"@fission-ai/openspec": minor
---

Add the vendor-neutral `agents` target: `openspec init --tools agents` installs the workflow skills to `.agents/skills/openspec-*/SKILL.md`, the shared location AGENTS.md-compatible assistants read. It is skills-only, so no slash commands are generated. Because `agents` is now a real target, `--tools all` includes it and creates `.agents/skills/` where it previously did not.
