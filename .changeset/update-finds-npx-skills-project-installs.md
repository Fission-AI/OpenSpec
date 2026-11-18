---
"@fission-ai/openspec": patch
---

`openspec update` now finds OpenSpec skills that `npx skills add Fission-AI/OpenSpec` put in a project's `.agents/skills`, asks whether to keep them in the project or switch to global, and never changes them. When a project really has no skills of its own, `update` now says it uses the skills for this machine. `openspec init` also tells you when it adds no skills to a project because they are already installed on your machine, and how to keep them in the project instead.
