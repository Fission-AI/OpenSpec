# Upgrade to 2.0

> What changes in OpenSpec 2.0, and how to move a project over.

To upgrade, update the CLI, then run `openspec update` in each project. Your skills move into one shared folder and the old command files go. Old command files and old skill copies you edited are kept.

> [!WARNING]
> `update` replaces an edit you made inside a skill OpenSpec installs in `.agents/skills/`, and keeps no copy. Save those edits first: [Skills you customized](#skills-you-customized).

## What changes

| | 1.x | 2.0 |
|---|---|---|
| Where skills live | A copy in each tool's own folder | One copy in `.agents/skills/`, with links for tools that need them |
| Command files (`/opsx:propose`) | Installed beside the skills | Gone. Use the skills, which do the same work |
| The `delivery` setting | Skills, commands, or both | Retired: everything is skills |
| Amazon Q Developer | Prompt files and skills | Retired: it can't load skills. `update` removes its OpenSpec files; use Kiro |

[Supported tools](../reference/supported-tools.md#where-skills-go) shows the new layout and which tools get links.

## Upgrade a project

Commit your work first, so you can go back to it. That commit is also the only copy of any edit you made inside a skill in `.agents/skills/`. `git stash` can't hold the upgrade itself, because git can't stash a folder that became a link.

**1. Update the CLI** the way you installed it ([Updating](../start/installation.md#updating)).

**2. Run update in each project.** In your terminal:

```bash
openspec update
```

**3. Commit the result.** The links are committed like any other file.

Running `update` again changes nothing.

## What update does

- **Skills**: written once to `.agents/skills/`, with a link from a tool's own folder where the tool needs one (`.claude/skills/`, for example).
- **Old skill copies**: the copies earlier versions wrote into each tool's folder are removed.
- **Command files**: the command files earlier versions generated are removed.
- **Old files you edited**: an edited command file, or an edited skill copy in a tool's own folder, is kept and listed. The next sections show what to do with them.
- **Skills OpenSpec installs**: refreshed in place, as every 1.x update did. An edit inside one is replaced. `update` names each skill where that happened.
- **Links**: never followed out of the project.
- **Outside the project**: `update` changes only your global config, `~/.minimax/skills/` for MiniMax Code, and old OpenSpec prompts in `~/.codex/prompts/`. It removes those prompts only with `--force` or after you confirm.

## Old commands and their skills

Each 1.x command has a skill with the same instructions:

| 1.x command | 2.0 skill |
|---|---|
| `/opsx:propose` | `openspec-propose` |
| `/opsx:explore` | `openspec-explore` |
| `/opsx:apply` | `openspec-apply-change` |
| `/opsx:update` | `openspec-update-change` |
| `/opsx:sync` | `openspec-sync-specs` |
| `/opsx:archive` | `openspec-archive-change` |
| `/opsx:new` | `openspec-new-change` |
| `/opsx:continue` | `openspec-continue-change` |
| `/opsx:ff` | `openspec-ff-change` |
| `/opsx:verify` | `openspec-verify-change` |
| `/opsx:bulk-archive` | `openspec-bulk-archive-change` |
| `/opsx:onboard` | `openspec-onboard` |

You can also ask for the work ("propose a change to add dark mode"). To invoke a skill by name, type `/openspec-propose` in Claude Code and most other tools, or `$openspec-propose` in Codex. [Supported tools](../reference/supported-tools.md#support-matrix) lists the spelling for each tool.

## Command files you edited

`update` removes only command files that match what OpenSpec generated. It keeps one you changed and lists it:

```
Kept 1 command file that does not match what OpenSpec generated (likely edited):
  .claude/commands/opsx/apply.md
Move anything worth keeping into the skill, then delete by hand.
```

Your tool may still show a kept file as a command. Delete it once you've moved what you need.

A project set up before 1.0 has older files, such as `.claude/commands/openspec/`. When they're unchanged from an earlier release, `update` removes them without asking. Otherwise it asks first, and a non-interactive run leaves them alone. With `--force` it removes them without asking, edited or not, so back them up first.

## Skill folders you edited

`update` also keeps an old skill copy you edited in a tool's own folder. A tool that reads both its own folder and `.agents/skills/` may then load that skill twice. Delete the kept folder once you've moved what you need.

MiniMax Code keeps its skills in `~/.minimax/skills/`. When `update` refreshes a skill you edited there, it first saves your copy beside it as `SKILL.md.bak`.

## Skills you customized

`update` rewrites every skill OpenSpec installs in `.agents/skills/`, such as `.agents/skills/openspec-propose/SKILL.md`. It did the same in 1.x. If you edited one, your edit is replaced and no backup is made. `update` tells you which skills this happened to:

```
Replaced your edits in 1 skill OpenSpec installs: .agents/skills/openspec-propose/SKILL.md. OpenSpec refreshes this skill on every update and keeps no copy. Recover your text from git, and keep lasting changes in a skill of your own under another name.
```

To see which skills are affected before anything changes, run `openspec update --dry-run`. It prints a note naming them.

To keep a customization across updates, put it somewhere `update` doesn't write:

- **Project instructions**: `context` and `rules` in `openspec/config.yaml` give the agent your instructions without editing a skill ([Project config](../customize/project-config.md)).
- **A skill of your own**: a skill under a name that doesn't start with `openspec-`, such as `.agents/skills/team-propose/`. `update` never touches it.

## Set up Windows for committed links

The links are committed like any other file. A teammate on Windows needs two settings to check them out as links:

**1. Turn on links in git.** In your terminal:

```bash
git config --global core.symlinks true
```

Or clone with `git clone -c core.symlinks=true <url>`.

**2. Turn on Developer Mode** in Windows settings, so links can be created.

Without these, each link checks out as a small text file. `openspec update` replaces it with a plain copy of the skill.

## Link a tool that OpenSpec doesn't

Most tools read `.agents/skills/` directly. If yours reads only its own folder, [Link another tool](../reference/supported-tools.md#link-another-tool) shows the one command to point it at the shared copy.

## Teams on mixed versions

From 2.1 on, an installed skill carries no `generatedBy` line and the project gains a `skills-lock.json`. A teammate still on 2.0 can keep working in the same project, with one thing to know: their `openspec update` reads those skills as edited, says "Replaced your edits", and writes its own copies back. Nothing is lost, and the next update from a newer CLI puts them right, but the files change back and forth until everyone is on the same version. Upgrade together where you can, and move a shared project to the global skills only once everyone on it has 2.1 or later: an older CLI doesn't know the global skills and would put the project's own back.

## Many projects: install the skills once

If you use OpenSpec in many projects, you don't have to upgrade each one's skills by hand. Install them once for the machine, then move each project when you next work in it. In your terminal:

```bash
openspec init --scope global --tools claude
```

Then, inside a project that still has its own skills:

```bash
openspec init --scope global
```

That removes the project's copies, and stops first if you edited one. From then on, `openspec update` in any folder refreshes the one global copy, and names the projects it knows of that still have their own skills, so you can see which are left. It knows a project once `openspec init` or `openspec update` from 2.1 or later has run in it.

If you already installed the skills with `npx skills add Fission-AI/OpenSpec`, for a project or with `--global`, there is nothing to undo. `openspec update` takes them over: it brings them to your CLI's version, keeps the ones in your [workflow profile](../reference/cli.md#openspec-config-profile), and removes the rest.

One case is left to you. If you installed them globally for a single tool, with `--agent claude-code` for example, that tool has its own copies and OpenSpec leaves them as they are. Remove them with `npx skills remove --global`, then run `openspec init --scope global --tools <id>`. [Install the skills once for every project](../start/setup.md#install-the-skills-once-for-every-project) has the details. A project you leave alone keeps its own skills and works as before.

## Stay on 1.x

You don't have to upgrade yet. 1.x keeps working as it is. Pin it the way you installed it.

On npm, in your terminal:

```npm
npm install -g @fission-ai/openspec@1
```

With the standalone install, name the release ([Install options](../start/installation.md#install-options)):

```bash
curl -fsSL https://openspec.dev/cli/install.sh | OPENSPEC_VERSION=v1.17.0 sh
```

On Windows (PowerShell):

```powershell
$env:OPENSPEC_VERSION = 'v1.17.0'
irm https://openspec.dev/cli/install.ps1 | iex
```

When `openspec update` offers to upgrade the CLI, decline. To stop the offer, set `OPENSPEC_NO_UPDATE_CHECK=1`.
