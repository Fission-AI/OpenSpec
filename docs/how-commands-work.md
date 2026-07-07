# How Commands Work

**The one thing to know: OpenSpec has two kinds of commands, and they run in two different places.**

- `openspec ...` commands run in your **terminal**. (Example: `openspec init`.)
- `/opsx:...` commands run in your **AI assistant's chat**. (Example: `/opsx:propose`.)

If you ever type `/opsx:propose` into your terminal and nothing happens, this page is why. You are talking to the wrong half of OpenSpec. Slash commands are not terminal commands. They are instructions you give to your AI coding assistant, in the same chat box where you'd normally type "add a login form."

That single distinction is the most common stumbling block for new users, so let's make it crystal clear.

## The two halves

OpenSpec is one project wearing two hats.

**The CLI (terminal half).** A program named `openspec` that you install and run from your shell. It sets up your project, lists and validates changes, shows a dashboard, and archives finished work. You type these into iTerm, the VS Code terminal, PowerShell, anywhere you'd run `git` or `npm`.

```bash
openspec init        # set up OpenSpec in this project
openspec list        # see active changes
openspec view        # open the interactive dashboard
```

**The slash commands (chat half).** Short commands like `/opsx:propose` and `/opsx:apply` that you type into your AI assistant. These tell the AI to follow the OpenSpec workflow: draft a proposal, write specs, build from the task list, archive when done. You type these into Claude Code, Cursor, Windsurf, Copilot, or whichever assistant you use.

```text
/opsx:propose add-dark-mode    (typed in your AI chat)
/opsx:apply                    (typed in your AI chat)
/opsx:archive                  (typed in your AI chat)
```

Here's the mental model in one picture:

```text
        YOUR TERMINAL                         YOUR AI ASSISTANT'S CHAT
   ┌──────────────────────┐               ┌──────────────────────────────┐
   │  $ openspec init     │   installs    │  /opsx:propose add-dark-mode  │
   │  $ openspec list     │  ──────────►  │  /opsx:apply                  │
   │  $ openspec view     │   commands    │  /opsx:archive                │
   └──────────────────────┘    & skills   └──────────────────────────────┘
        run openspec here                       run /opsx:* here
```

Notice the arrow. Running `openspec init` in your terminal is what *installs* the slash commands into your AI tool. The terminal half sets up the chat half. After that, day-to-day driving mostly happens in chat.

## "How do I start interactive mode?"

**There is no separate interactive mode to start.** This question comes up a lot, so it deserves a plain answer.

You don't enter a special OpenSpec mode. You just open your AI coding assistant like you always do, and type a slash command into the chat. The slash command *is* how you "enter" OpenSpec. Your assistant recognizes it, loads the matching OpenSpec skill, and starts following the workflow.

So the real instructions are:

1. Open your AI coding assistant (Claude Code, Cursor, Windsurf, and so on) in your project.
2. Type `/opsx:propose` in its chat, the same place you type any other request.
3. Watch the autocomplete: if OpenSpec is installed, you'll see `/opsx:propose`, `/opsx:apply`, and friends appear as you type the slash.

That's it. No mode to toggle, no daemon to launch, no separate window.

One thing that *is* genuinely interactive lives in the terminal: `openspec view`. It opens a dashboard for browsing your specs and changes. But that's a viewer, not the thing you propose and build with. The building happens through slash commands in chat.

## Why this split exists

It's worth understanding, because it explains why OpenSpec works with 25+ different AI tools.

The CLI is the **engine**. It knows the rules: what a change folder looks like, which artifacts depend on which, how to merge a delta spec into your source of truth. It's the same everywhere.

The slash commands are the **steering wheel**, and every AI tool has a slightly different one. Claude Code calls them commands. Cursor and Windsurf have their own formats. Some tools call them skills. When you run `openspec init`, OpenSpec generates the right kind of file for each tool you selected, so the same `/opsx:propose` intent works no matter which assistant you prefer.

The strength of this design: you learn the workflow once and carry it across tools. The tradeoff: the exact syntax of a command can differ slightly between tools, which is the next section.

## Slash command syntax by tool

The intent is identical everywhere. The punctuation differs. Use the form that matches your assistant.

| Tool | How you type it |
|------|-----------------|
| Claude Code | `/opsx:propose`, `/opsx:apply` |
| Cursor | `/opsx-propose`, `/opsx-apply` |
| Windsurf | `/opsx-propose`, `/opsx-apply` |
| GitHub Copilot (IDE) | `/opsx-propose`, `/opsx-apply` |
| Oh My Pi | `/opsx-propose`, `/opsx-apply` |
| Kimi CLI | skill-style, e.g. `/skill:openspec-propose` |
| Trae | `/opsx-propose`, `/opsx-apply` |

Most tools use either the colon form (`/opsx:propose`) or the dash form (`/opsx-propose`). A few tools surface OpenSpec as named skills instead of slash commands; for those you invoke the skill by name. The full per-tool list, including exactly which files get written where, lives in [Supported Tools](supported-tools.md).

When in doubt, type a slash in your AI chat and look at the autocomplete. Your tool will show you the form it expects.

## How the commands got there: skills and commands

When you run `openspec init` (or `openspec update`), OpenSpec writes small files into your project so your AI tool can find the workflow. Depending on your tool and settings, these are **skills**, **commands**, or both.

- **Skills** live in places like `.claude/skills/openspec-*/SKILL.md`. They're the emerging cross-tool standard: a folder of instructions your assistant auto-detects.
- **Commands** live in places like `.claude/commands/opsx/<id>.md`. They're the older per-tool slash command files.

You don't have to care which one your tool uses. You just type the slash command and it works. But knowing these files exist helps when something goes wrong: if your commands vanish, it usually means these files are missing or stale, and `openspec update` regenerates them.

See [Supported Tools](supported-tools.md) for the exact paths per tool, and [Migration Guide](migration-guide.md) for how skills replaced the older command-only approach.

## Confirming it's installed

Quick checks, fastest first:

1. **Type a slash in your AI chat.** Start typing `/opsx` and watch for autocomplete suggestions. If they appear, you're set.
2. **Look for the files.** For Claude Code, check that `.claude/skills/` contains `openspec-*` folders. Other tools use their own directories ([Supported Tools](supported-tools.md) lists them).
3. **Re-run setup.** From your project root, run `openspec update`. This regenerates the skill and command files for whatever tools you configured.
4. **Restart your assistant.** Many tools scan for skills and commands at startup, so a fresh window can be the missing step.

## Which commands do I even have?

By default, OpenSpec installs the **core** set of slash commands:

- `/opsx:explore`: think through an idea with the AI before committing to a change (great first step when you're unsure)
- `/opsx:propose`: create a change and draft all its planning artifacts in one step
- `/opsx:apply`: build the change by working through its task list
- `/opsx:sync`: merge a change's spec updates into your main specs (usually automatic)
- `/opsx:archive`: finish a change and file it away

A good default rhythm: `explore` when you're figuring out what to do, then `propose`, `apply`, `archive`. The [Explore First](explore.md) guide explains why that opening step pays off.

There's also an **expanded** set for people who want finer control (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive`, `/opsx:onboard`). You turn it on with `openspec config profile`, then apply it with `openspec update`.

New to all of this? `/opsx:onboard` (in the expanded set) walks you through a complete change on your own codebase, narrating each step. It's the friendliest possible introduction.

For what each command does in detail, see [Commands](commands.md). For when to reach for which, see [Workflows](workflows.md).

## A clean first run

Putting it together, here is the whole sequence with each step labeled by where it happens.

```text
TERMINAL   $ npm install -g @fission-ai/openspec@latest
TERMINAL   $ cd your-project
TERMINAL   $ openspec init
              (installs slash commands into your AI tool)

AI CHAT      /opsx:explore
              (optional: think the idea through with the AI first)

AI CHAT      /opsx:propose add-dark-mode
              (AI drafts proposal, specs, design, tasks)

AI CHAT      /opsx:apply
              (AI builds it, checking off tasks)

AI CHAT      /opsx:archive
              (change is merged into your specs and filed away)
```

Two terminal steps to set up. Then you live in chat. That's the rhythm.

## Related

- [Getting Started](getting-started.md): the full first-change walkthrough
- [Commands](commands.md): every slash command in detail
- [CLI](cli.md): every terminal command in detail
- [Supported Tools](supported-tools.md): per-tool syntax and file locations
- [FAQ](faq.md): more quick answers
- [Troubleshooting](troubleshooting.md): fixes when commands don't show up
