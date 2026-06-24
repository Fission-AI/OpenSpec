# OpenSpec Documentation

Welcome. This is the home for everything OpenSpec.

OpenSpec helps you and your AI coding assistant **agree on what to build before any code is written.** You describe the change, the AI drafts a short spec and a task list, you both look at the same plan, and then the work happens. No more discovering halfway through that the AI built the wrong thing.

If you read nothing else, read these two pages:

1. [Getting Started](getting-started.md): install, initialize, and ship your first change.
2. [How Commands Work](how-commands-work.md): where you actually type `/opsx:propose` (hint: in your AI chat, not the terminal). This trips up almost everyone once.

That second one matters more than it looks. OpenSpec has two halves: a command line tool you run in your terminal, and slash commands you give to your AI assistant. Knowing which is which saves you the most common moment of confusion.

> **The best habit to build first: when you're not sure what to build, start with `/opsx:explore`.** It's a no-stakes thinking partner that reads your code, weighs options, and sharpens a fuzzy idea into a concrete plan before any artifact or code exists. The [Explore First](explore.md) guide makes the case.

## Pick your path

**I'm brand new.** Start with [Getting Started](getting-started.md), then skim the [Core Concepts at a Glance](overview.md). When something feels mysterious, the [FAQ](faq.md) and [Glossary](glossary.md) are nearby.

**I have a problem but not a plan.** This is the common case, and it has a dedicated answer: [Explore First](explore.md). Use `/opsx:explore` to think it through with the AI before committing to anything.

**I have a big existing codebase.** You don't document all of it. [Using OpenSpec in an Existing Project](existing-projects.md) shows how to start on real, brownfield code without boiling the ocean.

**I just want to get it working.** [Install](installation.md), run `openspec init`, then read [How Commands Work](how-commands-work.md) so your first slash command lands in the right place.

**I learn by example.** The [Examples & Recipes](examples.md) page walks through real changes start to finish: a small feature, a bug fix, a refactor, an exploration.

**I'm coming from the old workflow.** The [Migration Guide](migration-guide.md) explains what changed and why, and promises your existing work is safe.

**I want to bend it to my team's process.** [Customization](customization.md) covers project config, custom schemas, and shared context.

**Something's broken.** [Troubleshooting](troubleshooting.md) collects the failures people actually hit, with fixes.

## The whole map

### Start here

| Doc | What it gives you |
|-----|-------------------|
| [Getting Started](getting-started.md) | Install, initialize, and run your first change end to end |
| [Explore First](explore.md) | Use `/opsx:explore` to think through an idea before you commit |
| [How Commands Work](how-commands-work.md) | Where slash commands run, what "interactive mode" means, terminal vs chat |
| [Core Concepts at a Glance](overview.md) | The whole mental model on one page: specs, changes, deltas, archive |
| [Installation](installation.md) | npm, pnpm, yarn, bun, Nix, and how to verify it worked |

### Use it day to day

| Doc | What it gives you |
|-----|-------------------|
| [Workflows](workflows.md) | Common patterns and when to reach for each command |
| [Examples & Recipes](examples.md) | Full walkthroughs of real changes, copy-pasteable |
| [Using OpenSpec in an Existing Project](existing-projects.md) | Adopting OpenSpec on a large brownfield codebase |
| [Editing & Iterating on a Change](editing-changes.md) | Update artifacts, go back, reconcile manual edits |
| [Commands](commands.md) | Reference for every `/opsx:*` slash command |
| [CLI](cli.md) | Reference for every `openspec` terminal command |

### Understand it deeply

| Doc | What it gives you |
|-----|-------------------|
| [Concepts](concepts.md) | The long-form explanation of specs, changes, artifacts, schemas, and archive |
| [OPSX Workflow](opsx.md) | Why the workflow is fluid instead of phase-locked, plus an architecture deep dive |
| [Glossary](glossary.md) | Every term defined in one place |

### Make it yours

| Doc | What it gives you |
|-----|-------------------|
| [Customization](customization.md) | Project config, custom schemas, shared context |
| [Multi-Language](multi-language.md) | Generate artifacts in languages other than English |
| [Supported Tools](supported-tools.md) | The 25+ AI tools OpenSpec integrates with, and where files land |

### When you need help

| Doc | What it gives you |
|-----|-------------------|
| [FAQ](faq.md) | Quick answers to the questions people ask most |
| [Troubleshooting](troubleshooting.md) | Concrete fixes for concrete failures |
| [Migration Guide](migration-guide.md) | Moving from the legacy workflow to OPSX |

### Coordinate across repos (beta)

| Doc | What it gives you |
|-----|-------------------|
| [Stores: User Guide](stores-beta/user-guide.md) | Plan in its own repo when your work spans repos or teams |
| [Agent Contract](agent-contract.md) | The machine-readable CLI surfaces agents drive |

## The thirty-second version

```text
1. Install        npm install -g @fission-ai/openspec@latest
2. Initialize     cd your-project && openspec init
3. Explore        (in your AI chat)  /opsx:explore           ← optional, but a great habit
4. Propose        (in your AI chat)  /opsx:propose add-dark-mode
5. Build          (in your AI chat)  /opsx:apply
6. Archive        (in your AI chat)  /opsx:archive
```

Steps 1 and 2 happen in your terminal. The rest happen in your AI assistant's chat. That split is the one thing worth memorizing, and [How Commands Work](how-commands-work.md) explains exactly why. Step 3 is optional, but starting with `/opsx:explore` when you're unsure is the habit most worth forming.

## Where else to get help

- **Discord:** [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC) for questions, ideas, and help.
- **GitHub Issues:** [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues) for bugs and feature requests.
- **`openspec feedback "your message"`** sends feedback straight from your terminal (it opens a GitHub issue).

Found something in these docs that's wrong, stale, or confusing? That's a bug. Open an issue or a PR. Documentation improvements are some of the most valuable contributions you can make.
