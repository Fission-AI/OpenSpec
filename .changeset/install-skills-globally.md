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
  Switch to global       Install the skills globally, for every project on this machine.
```

Nothing changes until you choose. In CI or from an agent there is no question: update refreshes the skills where they are.

### Keep in this project

Press Enter. The skills stay in your repo.

1. Commit `openspec/config.yaml`. It records your choice, so your teammates aren’t asked.

Choose this if GitHub’s hosted Copilot agent reads the skills from the repo. You can switch later with `openspec init --scope global`.

### Switch to global

We recommend this for most teams. The skills are installed globally on your machine, and the copies in the repo are removed.

1. Commit the removed files.
2. Each teammate pulls, runs `openspec update`, and answers **Yes** when it offers to set up skills on their machine.

In a script, run `openspec init --tools <ids>` in place of step 2. Upgrade everyone’s CLI before you switch a repo: earlier versions only know project skills.

## If a script sets up your repos

In 2.0, `openspec init --tools claude` in a new repo wrote the skills into that repo. It now installs them globally. To keep them in your project repo, add `--scope project`:

```sh
openspec init --scope project --tools claude
```

Existing repos don’t change until someone answers the question above.

## Before you update

- **Edited a built-in skill?** Update replaces the built-in skill folders. Save your edits first, along with any file you added inside one. `openspec update --dry-run` shows what will change.
- **Git.** Installing or refreshing skills needs Git and access to GitHub.
- **Node.** An npm install needs Node 22.20.0 or newer. The standalone executable needs nothing.
- **Already ran `npx skills add`?** Keep that install and run `openspec update`.

The [upgrade guide](https://openspec.dev/docs/upgrade-2-1) has the same steps on one page.
