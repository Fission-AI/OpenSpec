---
"@fission-ai/openspec": patch
---

Amazon Q Developer now keeps its prompts under every delivery setting, including `skills`. Amazon Q reads prompts from `.amazonq/prompts/` but no skills folder, so the skills OpenSpec wrote to `.amazonq/skills/` never loaded, and switching to skills-only delivery would have left Amazon Q with no working workflow. OpenSpec no longer writes those skills. Existing ones are left in place under `both` and `skills` delivery and can be deleted by hand; `commands` delivery still removes them, as it does for every tool. Two side effects are handled: leftover skill files no longer make `openspec update` report Amazon Q as needing an update on every run, and a project where only Amazon Q is configured no longer saves `delivery: commands` to your global config on first run, which would have removed skills from your other projects.
