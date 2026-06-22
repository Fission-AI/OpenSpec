# FAQ

Quick answers to the questions people ask most. If your question is really a "something is broken" question, [Troubleshooting](troubleshooting.md) is the better page. If you want a term defined, see the [Glossary](glossary.md).

## The basics

### What is OpenSpec, in one sentence?

A lightweight layer that gets you and your AI coding assistant to agree on what to build, in writing, before any code is written.

### Why would I want that?

Because AI assistants are confident even when they're wrong. When the requirements live only in a chat thread, the AI fills gaps with guesses, and you find out after the code exists. OpenSpec moves the agreement earlier, where mistakes are cheap to fix. See [Core Concepts at a Glance](overview.md) for the full case.

### Do I have to use it for everything?

No. Use it where agreement matters, which is most non-trivial work. For a one-character typo fix, the ceremony probably isn't worth it, and that's fine.

### Can I use it on a big existing codebase, or only new projects?

Existing codebases are the main event. OpenSpec is brownfield-first: you do not document your whole app up front. You write specs only for what each change touches, and your specs fill in over time around the work you actually do. There's a dedicated guide: [Using OpenSpec in an Existing Project](existing-projects.md).

### Is it tied to one AI tool?

No. OpenSpec works with 25+ assistants, including Claude Code, Cursor, Windsurf, GitHub Copilot, Gemini CLI, Codex, and more. The full list and per-tool details are in [Supported Tools](supported-tools.md).

## Running commands

### Where do I type `/opsx:propose`?

In your AI assistant's chat, not your terminal. This is the single most common point of confusion, so it has its own page: [How Commands Work](how-commands-work.md). Short version: `openspec ...` runs in the terminal, `/opsx:...` runs in chat.

### How do I "start interactive mode"?

There isn't a separate mode to start. You open your AI assistant like normal and type a slash command into its chat. The slash command is how you "enter" OpenSpec. (The one genuinely interactive terminal feature is `openspec view`, a dashboard for browsing specs and changes.) Full explanation in [How Commands Work](how-commands-work.md).

### I typed a slash command and nothing happened. Why?

Most likely you typed it in the terminal instead of your AI chat, or the commands aren't installed yet. Run `openspec update` in your project, restart your assistant, then try typing `/opsx` in chat and watch for autocomplete. [Troubleshooting](troubleshooting.md#commands-dont-show-up) has the full checklist.

### Why is the syntax `/opsx:propose` in one tool and `/opsx-propose` in another?

Each AI tool surfaces custom commands a little differently. The intent is identical; only the punctuation changes. Type a slash in your chat and the autocomplete shows you the form your tool expects. The per-tool table is in [How Commands Work](how-commands-work.md#slash-command-syntax-by-tool).

### What's the difference between a skill and a command?

Both are files OpenSpec writes so your assistant can run the workflow. Skills (`.../skills/openspec-*/SKILL.md`) are the newer cross-tool standard; commands (`.../commands/opsx-*`) are the older per-tool slash files. You don't need to pick. You just type the slash command, and OpenSpec installs whichever your tool uses.

## The workflow

### Where should I start if I'm not sure what to build?

With `/opsx:explore`. It's a no-stakes thinking partner that reads your codebase, lays out options, and turns a fuzzy problem into a concrete plan, all before any change or code exists. It's in the default profile, so it's always available. When the plan is clear, it hands off to `/opsx:propose`. This is the single best habit to form, because it stops an eager AI from confidently building the wrong thing. See [Explore First](explore.md).

### What's the simplest possible flow?

```text
/opsx:explore (optional)   then   /opsx:propose <what you want>   then   /opsx:apply   then   /opsx:archive
```

Explore to think it through, propose to draft the plan, apply to build it, archive to file it away. Skip explore when you already know exactly what you want.

### What's the difference between `/opsx:propose` and `/opsx:new`?

`/opsx:propose` is the default one-step command: it creates the change and drafts all the planning artifacts at once. `/opsx:new` is part of the expanded command set and only scaffolds an empty change, leaving you to create artifacts one at a time with `/opsx:continue` (or all at once with `/opsx:ff`). Use propose unless you want step-by-step control. See [Commands](commands.md).

### What are `core` and expanded profiles?

A profile decides which slash commands get installed. **Core** (the default) gives you `propose`, `explore`, `apply`, `sync`, `archive`. The **expanded** set adds `new`, `continue`, `ff`, `verify`, `bulk-archive`, and `onboard` for finer control. Switch with `openspec config profile`, then apply with `openspec update`.

### Do I need to run `/opsx:sync`?

Usually not. Sync merges a change's delta specs into your main specs, and `/opsx:archive` will offer to do it for you. Run sync manually only when you want the specs merged before archiving, for example on a long-running change. See [Commands](commands.md#opsxsync).

### How do I edit a proposal, spec, or task after I've started?

Just edit the file. Every artifact is plain Markdown in `openspec/changes/<name>/`, and there's no locked phase or special edit mode. Change it by hand, or ask your AI to revise it ("update the design to use a queue"), then keep going. The AI always works from the current file contents. Full guide: [Editing & Iterating on a Change](editing-changes.md).

### Can I go back and change the plan after implementing some of it?

Yes, at any time. The workflow is fluid, so review and editing aren't phases you get locked out of. Edit the artifact, then continue. If you want a structured check that the code still matches the plan, run `/opsx:verify`. See [Editing & Iterating on a Change](editing-changes.md#how-do-i-go-back-to-review-after-implementing).

### I edited the code by hand. How do I reconcile it with the spec?

Bring them back in sync before you archive, since archiving makes your specs the record of truth. If the code is now correct, update the delta spec to match what you shipped; if the spec is correct, keep building until the code agrees. `/opsx:verify` surfaces the mismatches. See [Editing & Iterating on a Change](editing-changes.md#i-edited-the-code-by-hand-how-do-i-reconcile-that-with-openspec).

### When should I update an existing change versus start a new one?

Update when it's the same work, refined. Start fresh when the intent fundamentally changed or the scope exploded into different work. There's a decision flowchart and examples in [Workflows](workflows.md#when-to-update-vs-start-fresh).

### What if my session runs out of context, or requirements change mid-implementation?

This is where specs earn their keep. Because the plan lives in files (not only in chat history), you can clear your context, start a fresh AI session, and pick up with `/opsx:apply`; it reads the artifacts and resumes from the first unchecked task. If requirements change, edit the artifacts to match the new reality and continue. Keeping a clean context window also produces better results; clear it before implementation.

### Should I commit the `openspec/` folder to git?

Yes. Your specs, active changes, and archive are part of your project's history. Commit them like any other source. The archive in particular becomes a durable record of why your system works the way it does.

## Specs and changes

### What goes in a spec versus a design?

A spec describes observable behavior: what the system does, its inputs, outputs, and error conditions. A design describes how you'll build it: the technical approach, architecture decisions, file changes. If implementation could change without changing externally visible behavior, it belongs in the design, not the spec. [Concepts](concepts.md#what-a-spec-is-and-is-not) goes deeper.

### What's a delta spec?

A spec that describes only what's changing, using `ADDED`, `MODIFIED`, and `REMOVED` sections, rather than restating the whole spec. It's how OpenSpec handles edits to existing systems cleanly. See [Concepts](concepts.md#delta-specs).

### Where do archived changes go?

To `openspec/changes/archive/YYYY-MM-DD-<name>/`, with all artifacts preserved. Nothing is deleted; the change just moves out of your active list.

## Configuration and customization

### How do I tell the AI about my tech stack?

Put it in `openspec/config.yaml` under `context:`. That text is injected into every planning request, so the AI always knows your stack and conventions. See [Customization](customization.md#project-configuration).

### Can I generate specs in a language other than English?

Yes. Add a language instruction to your config's `context:`. [Multi-Language](multi-language.md) has copy-paste snippets for several languages.

### Can I change the workflow itself?

Yes, with custom schemas. A schema defines which artifacts exist and how they depend on each other. Fork the default with `openspec schema fork spec-driven my-workflow`, then edit it. See [Customization](customization.md#custom-schemas).

## Models, privacy, and upgrades

### Which AI model should I use?

OpenSpec works best with high-reasoning models. The README recommends models like Codex 5.5 and Opus 4.7 for both planning and implementation. Also keep your context window clean: clear it before implementation for best results.

### Does OpenSpec collect data?

It collects anonymous usage stats: command names and version only. No arguments, paths, content, or personal data, and it's off automatically in CI. Opt out with `export OPENSPEC_TELEMETRY=0` or `export DO_NOT_TRACK=1`.

### How do I upgrade?

Two steps. Upgrade the package (`npm install -g @fission-ai/openspec@latest`), then run `openspec update` inside each project to refresh the generated skills and commands.

### How do I uninstall OpenSpec?

There's no uninstall command, because it's just a global package plus files in your project. Remove the package (`npm uninstall -g @fission-ai/openspec`), and optionally delete the `openspec/` directory and the generated tool files. Step-by-step, including what's safe to keep, is in [Installation: Uninstalling](installation.md#uninstalling).

## Getting help

### Where do I ask questions or report bugs?

- **Discord:** [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues:** [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **From your terminal:** `openspec feedback "your message"` opens a GitHub issue for you.

### These docs are wrong or confusing. What do I do?

Tell us, or fix it. Documentation PRs are welcome and valued. Open an issue or send a pull request.
