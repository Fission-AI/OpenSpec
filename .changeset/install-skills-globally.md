---
"@fission-ai/openspec": minor
---

Install the skills once for every project on your machine. `openspec init --scope global --tools claude,codex` puts one copy in `~/.agents/skills/` and leaves the project with only its `openspec/` folder. After that, plain `openspec init` uses the global skills for new projects, and plain `openspec update` refreshes them from any folder.

At a terminal, your first `openspec init` asks where the skills should go and remembers the answer. Scripted runs are never asked. They install in the project as before, unless the global skills are already on the machine. A project that already has its own skills keeps them until you run `openspec init --scope global` there.

The global install is done by Vercel's `skills` package, the one behind `npx skills`. It fetches the skills published in the OpenSpec repository for your CLI's version, so it needs `git` and a connection to GitHub. Project installs go through the same package and add a `skills-lock.json` to the project; without `git` or a connection they still work, and the CLI writes the same skills itself.

Every skill now reads the same whatever workflow profile you use. Where a skill hands off to another one, it says to use that skill if it is installed and what to do otherwise.
