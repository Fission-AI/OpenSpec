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

**Keep in this project.** Press Enter to keep the skill files in the repo. OpenSpec saves the choice as `skillsScope: project` in `openspec/config.yaml`. Commit that file with the skills. After pulling, teammates can run `openspec update` without seeing the migration prompt again. To switch later, run `openspec init --scope global`. Choose this if GitHub’s hosted Copilot agent needs to read them from the repo.

**Switch to global.** We recommend this for most teams. OpenSpec installs your selected skills on your machine before removing the repo copies. Commit those removals. **After pulling that commit, each teammate runs `openspec update` in a terminal, answers Yes to setting up skills on their machine, and picks their tools.** In a script or from an agent, run `openspec init --tools <ids>` instead. Your team can then use the skills across projects without committing skill files or adding them to `.gitignore` in every repo.

## Breaking change for setup scripts

In 2.0, a script that ran `openspec init --tools claude` in a new repo wrote the skills into that repo. The same command now installs them on the machine by default. A teammate who clones the repo won’t get those skills through Git.

To keep the old behavior, update the script:

```sh
openspec init --scope project --tools claude
```

Existing repos with project skills switch only when you choose to. Your workflow profile still controls which skills get installed.

A repo set up with `--scope project` is still asked the Keep or Switch question the first time someone runs `openspec update` in a terminal. Press Enter and commit `openspec/config.yaml`, or add `skillsScope: project` to that file yourself to skip the question.

## Before you update

- **Edited a built-in skill?** Both choices replace each built-in skill folder whole, without a message. Save edits you want to keep first, and move out any file you added inside one. `openspec update --dry-run` lists what would change. Put team guidance in `openspec/config.yaml` under `rules` or `context`, or give a custom skill its own name.

- **Installing or refreshing skills?** You’ll need Git and access to GitHub. OpenSpec fetches the skills from the release tag for your CLI version. An error that starts `Failed to clone` means Git is missing from your `PATH` (`spawn git ENOENT`) or this machine can’t reach github.com.

- **Upgrading the CLI?** `openspec update` can offer to upgrade it and continue. If it prints an upgrade command instead, run that command, then run `openspec update` again. Package installs require Node 22.20.0 or newer. The standalone executable includes its own runtime.

- **Already installed the official skills globally with `npx skills add`?** Keep that install and run `openspec update`.
