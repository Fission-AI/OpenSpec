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
6 skills and 6 commands in .claude/
Config: openspec/config.yaml (schema: spec-driven)
```

Restart your IDE for the new commands to take effect.

Re-running init is safe:

- Tools you already set up print `Refreshed` instead of `Created`.
- Running init again with a new tool selected adds that tool.
- The `--tools` flag skips the picker ([CLI reference](../reference/cli.md)).

## What init installs

Running init creates two things in your project:

- An `openspec/` folder at the repo root
- Workflow files (skills and commands) added to your AI tool's folder (`.agents/`, `.claude/`, etc.)

Commit all of it like the rest of your source ([FAQ](../help/faq.md) covers why). Init changes nothing else in your repo (if it finds leftovers from an older OpenSpec version, it asks before cleaning them up).

### The `openspec/` folder

Every OpenSpec artifact lives here, at the root of your project. Here's what that looks like:

```
openspec/
├── config.yaml     project settings and context for the AI
├── specs/          your specs (empty for now)
└── changes/        in-motion changes (empty for now)
    └── archive/    completed changes move here
```

[Concepts](../guides/concepts.md) explains both artifacts; [Project config](../customize/project-config.md) covers `config.yaml`.

### The workflow files (skills and commands)

These are the OpenSpec workflows, the actions you'll use as you work. Here they are as installed skills, in the shared `.agents/` folder most tools use:

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

By default each workflow installs in two forms:

- **Skill** (`openspec-apply-change`): instructions your agent picks up on its own when you ask for the work.
- **Command** (`/opsx:apply` in Claude Code): a typed entry point for the same workflow, under a shorter name.

The two are functionally identical. A workflow's skill and its command carry the same instructions.

Why two: commands came first, and every tool spells them its own way. Skills are the newer standard shared across tools, but not every tool can invoke a skill directly, so commands stay as those tools' entry point.

Some tools install in skill form only. Where the tool runs skills directly, init skips commands and says so (`Commands skipped for: codex (uses skills)`).

We prefer skills and expect to retire commands eventually.

#### Change what gets installed

The interactive picker changes the delivery form and the workflow set ([Profiles](../customize/profiles.md)). In your terminal:

```bash
openspec config profile
```

Here's switching to skills only:

```
Current profile settings
  Delivery: both

? What do you want to configure? Delivery only
? Delivery mode (how workflows are installed): Skills only

Config changes:
  delivery: both -> skills
? Apply changes to this project now? (Y/n) y
```

Answering yes applies it to the current project on the spot. Other projects pick it up on their next `openspec update`. The setting is global, per machine.

Setup is done. The [Quickstart](quickstart.md) takes your first change from here.
