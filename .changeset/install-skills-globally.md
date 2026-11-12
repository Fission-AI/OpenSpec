---
"@fission-ai/openspec": minor
---

Install the skills once for every project on your machine. `openspec init --scope global --tools claude,codex` puts one copy in `~/.agents/skills/` and leaves the project with only its `openspec/` folder. After that, plain `openspec init` uses the global skills for new projects, and plain `openspec update` refreshes them from any folder.

At a terminal, your first `openspec init` asks where the skills should go and remembers the answer. Scripted runs are never asked and work as before. A project that already has its own skills keeps them until you run `openspec init --scope global` there.

The global install is done by Vercel's `skills` package, the one behind `npx skills`, so the layout and lock file are the ones that tool uses. OpenSpec still writes the skill text, so it follows your workflow profile.
