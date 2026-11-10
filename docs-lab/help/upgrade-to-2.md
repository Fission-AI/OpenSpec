# Upgrade to 2.0

> What changes in OpenSpec 2.0, and how to move a project over.

To upgrade, update the CLI, then run `openspec update` in each project. Your skills move into one shared folder, the old command files go, and files you edited are kept.

## What changes

| | 1.x | 2.0 |
|---|---|---|
| Where skills live | A copy in each tool's own folder | One copy in `.agents/skills/`, with links for tools that need them |
| Command files (`/opsx:propose`) | Installed beside the skills | Gone. Use the skills, which do the same work |
| The `delivery` setting | Skills, commands, or both | Retired: everything is skills |
| Amazon Q Developer | Prompt files and skills | Retired: it can't load skills. `update` removes its OpenSpec files; use Kiro |

[Supported tools](../reference/supported-tools.md#where-skills-go) shows the new layout and which tools get links.

## Upgrade a project

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
- **Files you edited**: kept and listed, never removed. The next sections show what to do with them.
- **Links**: never followed out of the project. Outside the project, `update` writes only your global config and, for MiniMax Code, `~/.minimax/skills/`.

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

A project set up before 1.0 has older files, such as `.claude/commands/openspec/`. `update` asks before removing those. With `--force` it removes them without asking, edited or not, so back them up first.

## Skill folders you edited

`update` also keeps an old skill copy you edited in a tool's own folder. A tool that reads both its own folder and `.agents/skills/` may then load that skill twice. Delete the kept folder once you've moved what you need.

MiniMax Code keeps its skills in `~/.minimax/skills/`. When `update` refreshes a skill you edited there, it first saves your copy beside it as `SKILL.md.bak`.

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
