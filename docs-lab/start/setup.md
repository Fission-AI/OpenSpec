# Set up your project

> Add OpenSpec to a project: run init, see what it wrote, and adjust it.

## Pick where OpenSpec lives

- **In your repo (the default)**: specs and changes sit next to the code they describe and are versioned with it. The rest of this page follows this path.
- **In a store**: a separate planning repo shared by the repos that use it, for multi-repo setups or keeping planning out of the repo entirely. [Stores (beta)](../multi-repo/stores.md) covers when that's worth it and how to set one up.

## Initialize your project

With the CLI installed ([Installation](installation.md)), run init at the root of your project. In your terminal:

```bash
cd <your-project>
openspec init
```

Init asks which AI tools you use, writes the workflow files for the ones you pick, and reports what you got:

```
OpenSpec Setup Complete

Created: Claude Code
6 skills in .agents/skills/ (linked from .claude/skills/)
Config: openspec/config.yaml (schema: spec-driven)
```

If your tool runs in an IDE, restart it so it picks up the new skills.

Re-running init is safe:

- Tools you already set up print `Refreshed` instead of `Created`.
- Running init again with a new tool selected adds that tool.
- The `--tools` flag skips the picker ([CLI reference](../reference/cli.md)).

### Migrate an existing `project.md`

Init does not copy legacy `openspec/project.md` into `config.yaml`. It keeps the file and prints an AI-assisted migration request.

In your AI chat:

```
Review openspec/project.md and migrate its useful content to openspec/config.yaml.
Keep context concise: include only project-wide facts needed during artifact creation, apply, and archive.
Move artifact-specific guidance into rules for the matching artifacts.
Move guidance for apply or archive into the matching operations entry.
Leave out generic, outdated, or verbose material. Do not delete project.md.
```

Review `config.yaml`, then delete `project.md` when ready.

## What init installs

Running init creates two things in your project:

- An `openspec/` folder at the repo root
- Workflow files: skills in the shared `.agents/skills/` folder, with links from a tool's own folder where it needs them (`.claude/skills/`, for example)

Commit all of it like the rest of your source.

Init also removes the command files earlier versions generated, and keeps any you edited. A project set up before 1.0 also has older leftovers: folders like `.claude/commands/openspec/`, and OpenSpec marker blocks in files like `CLAUDE.md` and `AGENTS.md`. An interactive init asks before removing them. With `--force`, with `--tools`, or in a non-interactive run, init removes them without asking, including any edits inside those blocks, so back them up first.

### The `openspec/` folder

Every OpenSpec artifact lives here, at the root of your project. Here's what that looks like:

```
openspec/
├── config.yaml     project settings and context for the AI
├── specs/          your specs (empty for now)
└── changes/        in-motion changes (empty for now)
    └── archive/    completed changes move here
```

[Project config](../customize/project-config.md) covers `config.yaml`.

### The workflow files (skills)

These are the OpenSpec workflows, the actions you'll use as you work. Here they are as installed skills, in the shared `.agents/skills/` folder:

```
.agents/skills/
├── openspec-explore/              think through an idea first
├── openspec-propose/              propose a change
├── openspec-apply-change/         implement a change's tasks
├── openspec-update-change/        revise a change's plan
├── openspec-sync-specs/           sync a change's spec updates into specs/
├── openspec-archive-change/       move a finished change to the archive
├── openspec-verify-change/        check the implementation matches the plan (not included by default)
└── openspec-bulk-archive-change/  archive several changes at once (not included by default)
```

This is the default set plus two optional workflows. [Profiles](../customize/profiles.md) lists all twelve.

Each skill is written once, here, no matter how many tools you set up. A tool that doesn't read `.agents/skills/` (Claude Code, Kiro, and others) gets a link to each skill in its own folder, such as `.claude/skills/openspec-propose`. MiniMax Code is the one exception: its skills go to `~/.minimax/skills/` in your home folder. [Supported tools](../reference/supported-tools.md#where-skills-go) shows the layout and which tools get links.

Each workflow is a **skill**: instructions your agent picks up when you ask for the work, or that you invoke by name (`/openspec-apply-change` in Claude Code, `$openspec-apply-change` in Codex). [Supported tools](../reference/supported-tools.md#support-matrix) shows the spelling for each tool.

OpenSpec 1.x also wrote a command file per workflow (`/opsx:apply`). OpenSpec 2.0 installs skills only. [Upgrade to 2.0](../help/upgrade-to-2.md) covers what changes.

#### Change what gets installed

The interactive picker changes the workflow set ([Profiles](../customize/profiles.md)). In your terminal:

```bash
openspec config profile
```

Answering yes to "Apply changes to this project now?" applies it on the spot. Other projects pick it up on their next `openspec update`. The setting is global, per machine.

#### Claude Code doesn't show the workflows

Claude Code loads OpenSpec skills from `.claude/skills/openspec-*`, which link to `.agents/skills/openspec-*`. If they are missing, refresh the project. In your terminal:

```bash
openspec update
```

Restart Claude Code, then run `/openspec-propose` in its chat. If only some workflows are missing, [change your profile](../customize/profiles.md#expanding-the-set-optional-workflows).

## Install the skills once for every project

To use the same skills in every project on your machine, install them in your home folder. In your terminal:

```bash
openspec init --global --tools claude,codex
```

This writes one copy of each skill to `~/.agents/skills/` and links it into the home folder of each tool that needs one, such as `~/.claude/skills/`. It's the same layout `npx skills add -g` uses. No project is read or changed.

After you upgrade the CLI, refresh them:

```bash
openspec update --global
```

- **Workflows**: the ones in your [profile](../customize/profiles.md), as for a project.
- **Tools**: [Supported tools](../reference/supported-tools.md#install-for-this-machine) lists where each tool's skills go. A tool with no known home folder is set up per project instead.
- **Remove**: `openspec init --global --tools none` removes OpenSpec's skills and links. A skill you edited is kept.
- **npx skills**: a skill `npx skills` installed in `~/.agents/skills/` is left to it.

### Projects that have their own skills

A project set up before keeps its skills in `.agents/skills/`, so your tools may see both copies. The next `openspec update` in that project asks:

```
Switch this project to your global skills?
```

- **Yes**: removes the project's copies of OpenSpec's skills and links, keeps any you edited, and saves `skills: global` in `openspec/config.yaml`.
- **No**: keeps the project's skills and saves `skills: project`, so it doesn't ask again.

Commit the result like any other change. Outside a terminal, update only prints the suggestion. To switch without the question, run `openspec update --use-global-skills`; add `--dry-run` to see what it removes first.

A teammate who pulls a project with `skills: global` and hasn't installed the skills globally is told the command to run. OpenSpec never writes to anyone's home folder unless they run `--global`. Ask your team to update the CLI before you switch a shared project: OpenSpec 2.0 doesn't know `skills: global` and writes the project's skills back.

Setup is done. The [Quickstart](quickstart.md) takes your first change from here.
