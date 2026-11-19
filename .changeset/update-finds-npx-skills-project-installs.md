---
"@fission-ai/openspec": patch
---

`openspec update` now finds OpenSpec skills that `npx skills add` put in a project, leaves them as they are, and points to `npx skills update --project`. When a project really has no skills of its own, `update` now says it uses the skills for this machine. `openspec init` also tells you when it adds no skills to a project because they are already installed on your machine, and how to keep them in the project instead.
