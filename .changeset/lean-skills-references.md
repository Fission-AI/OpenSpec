---
"@fission-ai/openspec": minor
---

Generated skills are about half the size. Each `SKILL.md` keeps the steps every run needs. Detail that only some runs need (store selection, an uninitialized project, example conversations, REMOVED and RENAMED checks, retiring a spec, the later onboarding phases) moves into a `references/` folder beside it, which the agent reads when a step sends it there. Command files carry the same text inline. Archive and bulk archive now let `openspec archive` merge, validate, and move each change instead of reproducing those steps by hand. `openspec context --json` now includes the project's validated `project_context`, so workflows no longer parse `config.yaml` themselves. Run `openspec update` to refresh installed skills.
