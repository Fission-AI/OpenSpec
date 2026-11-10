# Upgrade to 2.0

> What changes in OpenSpec 2.0, and how to move a project over.

**In short:** update the CLI, then run `openspec update` in each project. Your skills move into one shared folder, the old command files go, and nothing you edited is deleted.

## What changes

| | 1.x | 2.0 |
|---|---|---|
| Where skills live | A copy in each tool's own folder | One copy in `.agents/skills/`, with links for tools that need them |
| Command files (`/opsx:propose`) | Installed beside the skills | Gone. Use the skills, which do the same work |
| The `delivery` setting | Skills, commands, or both | Retired: everything is skills |
| Amazon Q Developer | Prompt files | No longer supported: it can't load skills. Use Kiro |

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
- never touches files outside the project, even through a linked folder.

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

## Windows and committed links

The links are committed like any file. A teammate on Windows needs `git config core.symlinks true` (and permission to create links) before cloning; otherwise each link checks out as a small text file. `openspec update` replaces those with plain copies of the skills, so the tools still work.

## A tool that OpenSpec doesn't link

Most tools read `.agents/skills/` directly. If yours reads only its own folder, [Link another tool](../reference/supported-tools.md#link-another-tool) shows the one command to point it at the shared copy.

## Staying on 1.x for now

Nobody has to upgrade yet. 1.x keeps working as it is. On npm, pin it with:

```bash
npm install -g @fission-ai/openspec@1
```
