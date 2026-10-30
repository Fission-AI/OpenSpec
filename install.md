# openspec

> OpenSpec gives you and your coding agent a shared, reviewable plan before code is written. This file installs its CLI and sets up your project.

I want you to install OpenSpec and set up my project. Follow the steps below in order, and stop where a step tells you to stop.

OBJECTIVE: Install the OpenSpec CLI globally and initialize the user's project.

DONE WHEN:

- `openspec --version` prints a version number
- the project the user confirmed has an `openspec/` folder created or refreshed by `openspec init`
- the user has been told the exact spelling to invoke OpenSpec in their AI coding tool

TODO:

- [ ] Install the standalone CLI, with the user's confirmation (npm only as a fallback)
- [ ] Verify `openspec` is on PATH
- [ ] Confirm which folder to set up, then run `openspec init --tools <ids>` there
- [ ] Report what init actually created and how to invoke it

## 1. Install

Run `openspec --version` first. If it already prints a version, the CLI is installed: say so, run `openspec version --check` (it prints the update command for how OpenSpec was installed when it can tell; otherwise update it the way it was installed, e.g. `brew upgrade openspec`), offer to run that command, and skip ahead to step 3. If it was installed with npm or another package manager, mention once that `openspec install` switches to the standalone install. Only offer it: the user may have chosen npm on purpose, so don't repeat it or switch unless they ask. Never switch an install to a different method on your own; that leaves two copies competing on PATH.

Install the standalone OpenSpec binary (on Alpine Linux, `apk add libstdc++ libgcc` first). Show the command for the user's OS and run it only once they confirm, then skip to step 3:

```bash
# macOS / Linux
curl -fsSL https://openspec.dev/cli/install.sh | sh
```

```powershell
# Windows (PowerShell)
irm https://openspec.dev/cli/install.ps1 | iex
```

If the user would rather use a package manager, or the installer fails, continue with step 2.

## 2. Package manager (only if step 1 did not install it)

Run `node --version`. Installing with a package manager needs Node.js 22.12.0 or higher. If Node is missing or older, don't install Node, switch versions, or reconfigure the user's version manager yourself; stop and leave them with their next move: https://nodejs.org, or, if they use a version manager like nvm, the command that would switch to a newer version.

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

Run `openspec --version`. If the command isn't found, it may only be missing from this shell: say where it was installed (the standalone installer prints the folder, `~/.local/bin` by default; a package manager has its own global bin folder) and how to add that folder to PATH for the user's shell and OS, then stop until they confirm. On Windows the standalone installer adds its folder to the user PATH itself; a new terminal picks it up. If it prints an older version than the one the install just reported, an earlier copy is shadowing it on PATH; report both versions instead of continuing. If the user uses a version manager, say so rather than editing PATH around it: with nvm or fnm the CLI is tied to the Node version that was active at install time, and with asdf or volta a shim may need regenerating.

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
