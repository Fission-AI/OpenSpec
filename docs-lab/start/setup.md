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

The first time, init asks where the skills should go: on this machine, for every project, or in this project only. It remembers the answer. Then it asks which AI tools you use and reports what you got.

With the skills on this machine, which is the default:

```
OpenSpec Setup Complete

Created: Claude Code
6 skills in ~/.agents/skills/ for every project on this machine
Config: openspec/config.yaml (schema: spec-driven)
```

With the skills in this project:

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

Every project gets an `openspec/` folder at the repo root. Where the skills go depends on the choice you made:

| | On this machine | In this project |
|---|---|---|
| Skills | `~/.agents/skills/` in your home folder | `.agents/skills/` in the project |
| Links for tools that read their own folder | `~/.claude/skills/`, for example | `.claude/skills/`, for example |
| Record of what is installed | `~/.agents/.skill-lock.json` | `skills-lock.json` at the repo root |
| What you commit | `openspec/` | `openspec/`, the skills, the links and `skills-lock.json` |

The rest of this section describes a project install. [Install the skills once for every project](#install-the-skills-once-for-every-project) covers the machine-wide one.

The skills are fetched from the OpenSpec repository by [`skills`](https://github.com/vercel-labs/skills), the package behind `npx skills`, which also keeps `skills-lock.json`. If `git` is missing or GitHub can't be reached, OpenSpec writes the same skills itself and says so. Nothing else changes, and there is no lock file until an `openspec update --force` can fetch them.

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

### Install the skills once for every project

One copy of the skills for the whole machine is the default: it is the first answer when init asks, and what a scripted `openspec init --tools …` does when nothing says otherwise. To choose it without being asked, in your terminal:

```bash
openspec init --scope global --tools claude,codex
```

The project gets its `openspec/` folder and nothing else. The skills go to `~/.agents/skills/` in your home folder, with a link for each tool that reads its own folder, such as `~/.claude/skills/`.

- **The next project**: plain `openspec init` uses the global skills, so there is nothing to install again.
- **Asked once**: at a terminal, your first `openspec init` asks where the skills should go and remembers the answer.
- **Scripts and agents**: a run that passes `--tools` is never asked. With nothing saved it installs for the machine. To keep a script installing in the project, pass `--scope project`, set `OPENSPEC_SKILLS_SCOPE=project`, or save the choice once with `openspec config set skillsScope project`.
- **When the default can't work**: a scripted run installs in the project instead, and says why, if it sets up a tool the global skills don't cover, asks for the Copilot cloud files, or has no `git` to fetch the skills with.
- **Updating**: `openspec update` brings the global skills up to date from any folder, and fetches nothing when they already are. In a project with its own skills it updates both.
- **Projects that still have their own skills**: `openspec init` and `openspec update` note each project they run in, in `projects.json` in OpenSpec's data folder (`~/.local/share/openspec/`, or `%LOCALAPPDATA%\openspec\` on Windows). Once the global skills are installed, `openspec update` and `openspec init --scope global` name the noted projects that still carry their own copy, so you know which ones are left to move. The list stays on your machine and is safe to delete.
- **Another tool**: run `openspec init --scope global --tools <id>` again. It adds the tool and keeps the ones you have.
- **One project with its own skills**: `openspec init --scope project --tools <id>` installs them there, whatever the machine uses.
- **Edits**: if you edit a global skill, `openspec update` replaces it and keeps no copy, the same as for a project. It names each skill where that happened, and `openspec update --dry-run` warns first. Keep changes of your own in a skill under another name. A skill with an OpenSpec name that you put in your home folder yourself is left alone.
- **Not in your home folder**: run `openspec init` inside a project. The home folder is where the global skills live, so it can't also be a project that uses them.

OpenSpec hands the install to [`skills`](https://github.com/vercel-labs/skills), the package behind `npx skills`. It fetches the skills published in the OpenSpec repository for your CLI's version, so the files, the layout and the lock file (`~/.agents/.skill-lock.json`) are the same ones `npx skills add Fission-AI/OpenSpec --global` gives you. Fetching them needs `git` and a connection to GitHub. A project install falls back to writing the skills itself; the global install stops and tells you. To remove the global skills, run `npx skills remove --global` and pick the `openspec-` ones.

#### Move an existing project to the global skills

In a project that already has its own skills, in your terminal:

```bash
openspec init --scope global
```

This removes the project's copies and installs the global ones. Only that project changes. Init stops before removing anything, and says why, if you edited one of its skills, if the project is set up for a tool the global skills don't cover, or if it has the GitHub Copilot cloud files, which need the skills in the project (`--no-copilot-cloud` turns those off and moves it). The project's tools come along: each one gets the skills on this machine. Commit the removal like any other change. A teammate who doesn't have the global skills yet runs `openspec init --scope global --tools <id>` once.

Ten tools are not covered by the global skills and keep the setup a project install gives them. [Supported tools](../reference/supported-tools.md#where-skills-go) lists them.

Setup is done. The [Quickstart](quickstart.md) takes your first change from here.
