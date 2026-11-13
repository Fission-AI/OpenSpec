---
"@fission-ai/openspec": minor
---

**Heads up for scripts and CI: `openspec init --tools …` in a new project now installs the skills for the machine, not into the project.** If a pipeline or setup script expects `.agents/skills/` in the repository, keep project installs with any one of:

- `openspec init --scope project --tools …` for one run
- `OPENSPEC_SKILLS_SCOPE=project` for a CI job or a shell
- `openspec config set skillsScope project` for a machine, once

Existing projects are not affected: a project that already has its own skills keeps them. A scripted run also installs in the project on its own, and says why, when it sets up a tool the global skills don't cover, asks for the Copilot cloud files, or has no `git`.

**What's new**

Install the skills once for every project on your machine. `openspec init --scope global --tools claude,codex` puts one copy in `~/.agents/skills/` and leaves the project with only its `openspec/` folder. After that, plain `openspec init` uses the global skills for new projects, unless you saved `skillsScope` as `project` or set `OPENSPEC_SKILLS_SCOPE=project`, and plain `openspec update` refreshes them from any folder. To move a project that has its own skills, run `openspec init --scope global` there.

At a terminal, your first `openspec init` asks where the skills should go and remembers the answer.

Skills are now installed by Vercel's `skills` package, the one behind `npx skills`. It fetches the skills published in the OpenSpec repository for your CLI's version, so a machine-wide install needs `git` and a connection to GitHub. A project install goes through the same package and adds a `skills-lock.json` to the project; without `git` or a connection it still works, and the CLI writes the same skills itself.

`openspec update` replaces the skills OpenSpec installed, for a project and for the machine, and names any you had edited. Keep changes of your own in a skill under another name.

Every skill now reads the same whatever workflow profile you use. Where a skill hands off to another one, it says to use that skill if it is installed and what to do otherwise.
