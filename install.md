# openspec

> OpenSpec gives you and your coding agent a shared, reviewable plan before code is written. This file installs its CLI and sets up your project.

I want you to install OpenSpec and set up my project. Follow the steps below in order, and stop where a step tells you to stop.

OBJECTIVE: Install the OpenSpec CLI globally and initialize the user's project.

DONE WHEN:

- `openspec --version` prints a version number
- the project the user confirmed has an `openspec/` folder created or refreshed by `openspec init`
- the user has been told the exact spelling to invoke OpenSpec in their AI coding tool

TODO:

- [ ] Check the Node.js runtime
- [ ] Install the CLI globally, with the user's confirmation
- [ ] Verify `openspec` is on PATH
- [ ] Confirm which folder to set up, then run `openspec init --tools <ids>` there
- [ ] Report what init actually created and how to invoke it

## 1. Runtime

Run `node --version`. OpenSpec needs Node.js 20.19.0 or higher. If Node is missing or older, say so and stop, but leave the user with their next move: point them at https://nodejs.org, or if they use a version manager like nvm, name the command that would switch to a newer version. Don't install Node, switch versions, or reconfigure the user's version manager yourself.

## 2. Install

Run `openspec --version` first. If it already prints a version, the CLI is installed: say so, offer to update it with the install command below, and if the user declines skip ahead to step 4.

Use whichever package manager is already on PATH, preferring npm:

```bash
npm install -g @fission-ai/openspec@latest
pnpm add -g @fission-ai/openspec@latest
bun add --global @fission-ai/openspec@latest
yarn global add @fission-ai/openspec@latest   # Yarn 1.x only
```

Don't pick based on this project's lockfile: a global install has nothing to do with how this repo's own dependencies are installed. If none of those four is available, stop and say so; don't improvise an install. (On Nix, point the user at the Nix section of https://openspec.dev/docs/installation instead.)

Show the exact command and get confirmation before running it; this installs software outside the project, and the user may want a different package manager to own it.

Stop and ask again if the install needs sudo or admin rights, fails with a permissions error, or reports that its global bin directory is missing or unconfigured. Never edit shell startup files (.bashrc, .zshrc, .profile, fish, PowerShell profile), and never run a setup command that edits them; show the change and let the user make it.

## 3. PATH

Run `openspec --version`. If the command isn't found, it may only be missing from this shell: say where the package manager installed it and how to add that directory to PATH for the user's shell and OS, then stop until they confirm. If it prints an older version than the one the install just reported, an earlier copy is shadowing it on PATH; report both versions instead of continuing. If the user uses a version manager, say so rather than editing PATH around it: with nvm or fnm the CLI is tied to the Node version that was active at install time, and with asdf or volta a shim may need regenerating.

## 4. Initialize

Work out where `openspec/` should go, and lead with your best guess rather than an open question: the root of the project the user is working in is almost always right. Name the folder you picked and let them correct it, for example "you're in ~/code/acme-api, so I'll set OpenSpec up there". Prefer the version control root over the current directory, and in a monorepo say which package you chose and why. To target a folder other than the current one, pass it: `openspec init <path> --tools <ids>`.

init creates `openspec/` wherever you point it and won't warn you when that's wrong. If the folder is a home directory, a temp directory, or holds no project at all, stop and ask where the project is.

Then work out which AI coding tools the user works with, and again lead with an inference instead of an open question: you are probably running inside one of them, so name it and ask what else they use, suggesting a few common options (Claude Code, Cursor, Copilot, Codex). Say what the answer changes: each tool named gets its own skill and command files in the project, and re-running init later adds more, so a short list now costs nothing. Map each tool to an id from `openspec init --help` (Copilot is `github-copilot`, Zoo Code is `roocode`). `--tools` takes a comma-separated list, so name all of them.

`openspec init --tools <ids>` deletes leftovers from older OpenSpec versions automatically, without asking, including `opsx-*.md` prompt files in the home directory (Codex keeps them in `~/.codex/prompts`). Before running it, look for those: `.../commands/openspec/` folders, OpenSpec marker blocks in files like CLAUDE.md or AGENTS.md, and home-directory `opsx-*.md` prompts. List whatever you find, say plainly that init will delete these, and wait for a go-ahead; if you find nothing, say so and carry on without asking. An existing `openspec/` folder is not a problem: init refreshes it and leaves specs and changes alone.

Then run: `openspec init --tools <ids>`, adding the path when it isn't the current folder.

## 5. Report

Don't assume what should exist; relay what init actually printed: how many skills and/or commands it created and where, the config file line, any "Setup required" note, and what to restart or reload. Some tools are skills-only and correctly create zero command files, so missing commands is not a failure on its own. If init said nothing was generated, relay the fix it suggested instead of retrying.

Finish by telling the user how to invoke OpenSpec in their tool, taking the exact spelling from the files init created rather than from its summary line: the punctuation differs per tool (`/opsx:propose` in some, `/opsx-propose` in others, `@opsx-propose` in Amazon Q), and tools that get skills instead of commands are invoked by skill name (`/openspec-propose`, or `$openspec-propose` in Codex, or `/skill:openspec-propose` in Kimi Code).

EXECUTE NOW: Complete the TODO list above to achieve: the OpenSpec CLI installed, this project initialized, and the user told exactly how to invoke OpenSpec in their AI coding tool.

More context for agents: https://openspec.dev/llms.txt
