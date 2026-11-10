# Upgrade to 2.0

> What changes in OpenSpec 2.0, and how to move a project over.

**In short:** update the CLI, then run `openspec update` in each project. Your skills move into one shared folder, the old command files go, and nothing you edited is deleted.

## What changes

| | 1.x | 2.0 |
|---|---|---|
| Where skills live | A copy in each tool's own folder | One copy in `.agents/skills/`, with links for tools that need them |
| Command files (`/opsx:propose`) | Installed beside the skills | Gone. Use the skills, which do the same work |
| The `delivery` setting | Skills, commands, or both | Retired: everything is skills |
| Amazon Q Developer | Prompt files and skills | Retired: it can't load skills. `update` removes its OpenSpec files; use Kiro |

[Supported tools](../reference/supported-tools.md#where-skills-go) shows the new layout and which tools get links.

## Upgrade a project

1. Update the CLI the way you installed it ([Updating](../start/installation.md#updating)).
2. In each project, run:

   ```bash
   openspec update
   ```

3. Commit the result.

`update` then:

- writes each skill once to `.agents/skills/`, and links it from a tool's own folder where the tool needs that (`.claude/skills/`, for example);
- removes the copies earlier versions wrote into each tool's folder, and the command files they generated;
- keeps any of those files you edited, and lists them;
- never follows a link out of the project. Outside the project it only writes your global config and, for MiniMax Code, `~/.minimax/skills/`.

Running it again changes nothing.

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

You can also just ask for the work ("propose a change to add dark mode"). To invoke a skill by name, type `/openspec-propose` in Claude Code and most other tools, or `$openspec-propose` in Codex. [Supported tools](../reference/supported-tools.md#support-matrix) lists the spelling for each tool.

## Command files you edited

`update` removes only command files that match what OpenSpec generated. One you changed is kept, and `update` lists it:

```
Kept 1 command file that does not match what OpenSpec generated (likely edited):
  .claude/commands/opsx/apply.md
Move anything worth keeping into the skill, then delete by hand.
```

Your tool may still show a kept file as a command. Delete it once you've moved what you need.

## Skill folders you edited

The same goes for an old skill copy in a tool's own folder: if you edited it, `update` keeps it. A tool that reads both its own folder and `.agents/skills/` may then load that skill twice. Delete the kept folder once you've moved what you need.

## Windows and committed links

The links are committed like any file. A teammate on Windows should run `git config --global core.symlinks true` (or clone with `git clone -c core.symlinks=true <url>`) and enable Developer Mode so links can be created. Otherwise each link checks out as a small text file, which `openspec update` replaces with a plain copy of the skill.

## A tool that OpenSpec doesn't link

Most tools read `.agents/skills/` directly. If yours reads only its own folder, [Link another tool](../reference/supported-tools.md#link-another-tool) shows the one command to point it at the shared copy.

## Staying on 1.x for now

Nobody has to upgrade yet. 1.x keeps working as it is. Pin it the way you installed it.

On npm:

```bash
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
