---
"@fission-ai/openspec": minor
---

# OpenSpec now supports global skills for coding agents

As more teams adopt Vercel’s `skills` installer, it’s becoming a common way to install skills across coding tools. OpenSpec is adopting it too, so we can spend less time maintaining installer code and more time improving the skills themselves.

Moving to Vercel’s installer gives OpenSpec native support for **global skill installation**. Your coding agent can use the same OpenSpec skills across projects. Vercel’s installer handles the location for each supported agent, whether it reads `~/.agents/skills/` or uses its own folder.

## What you’ll see when you upgrade

With the new CLI, the next time you run `openspec update` from a repo that has its own OpenSpec skills, you’ll see this choice:

```text
Where should OpenSpec keep this project’s skills?

❯ Keep in this project   Keep the skills in this repo.
  Switch to global       Share the skills across projects on this machine.
```

**Keep in this project.** Press Enter to keep the skill files in the repo. Your team keeps getting them through Git. Choose this if GitHub’s hosted Copilot agent needs to read them from the repo.

**Switch to global.** We recommend this for most teams. OpenSpec installs your selected skills on your machine before removing the repo copies. Commit those removals. **After pulling that commit, each teammate runs `openspec update` once in their checkout.** Your team can then use the skills across projects without committing skill files or adding them to `.gitignore` in every repo.

Global skills are the default for new projects. Existing repos switch only when you choose to. Either way, `openspec config profile` still controls which workflows you install.

## Before you update

- **Edited a built-in skill?** Both choices refreshes the built-in instructions. Save edits you want to keep first. Put team guidance in `openspec/config.yaml` under `rules` or `context`, or give a custom skill its own name.

- **Upgrading the CLI?** `openspec update` can offer to upgrade it and continue. If it prints an upgrade command instead, run that command, then run `openspec update` again. Package installs require Node 22.20.0 or newer. The standalone executable includes its own runtime.

- **Already installed the official skills globally with `npx skills add`?** Keep that install and run `openspec update`.
