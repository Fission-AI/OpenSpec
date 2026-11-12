---
"@fission-ai/openspec": minor
---

Install the skills once for every project on your machine. `openspec init --global --tools claude,codex` writes one copy to `~/.agents/skills/` and links it into the home folder of each tool that needs one, the same layout `npx skills add -g` uses. `openspec update --global` refreshes them after a CLI upgrade. No project is read or changed.

A project that still has its own skills asks once, on its next `openspec update`, whether to switch to the global ones. Yes removes its copies of OpenSpec's skills (edited ones are kept) and saves `skills: global` in `openspec/config.yaml`; no saves `skills: project`. Outside a terminal, `update` only suggests `--use-global-skills`. Skills that `npx skills` installed globally are left to it.
