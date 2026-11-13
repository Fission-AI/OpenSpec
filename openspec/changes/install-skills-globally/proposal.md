## Why

OpenSpec 2.0 writes one copy of its skills into each project's `.agents/skills/`. Someone who uses OpenSpec in many repositories runs `openspec update` in every one of them after each CLI upgrade, and a project they haven't set up has no skills at all. `npx skills add -g` already solves this for other skills: one copy in the home folder, used by every project.

OpenSpec also maintains its own installer. Vercel's `skills` package, the one behind `npx skills`, has an API that does the same job. This change uses it for the global install instead of writing a second installer.

This is step 4 of the plan in #2022. It replaces the older `add-global-install-scope` change, which predates 2.0.

## What Changes

- **`openspec init --scope global`** installs the skills once for this machine, in `~/.agents/skills/`, and gives the project only its `openspec/` folder. The `skills` package places the files, the links each tool needs, and its lock file.
- **No flag to remember afterwards.** Once the global skills exist, plain `openspec init` uses them for new projects, and plain `openspec update` refreshes them, from any folder.
- **Asked once.** At a terminal, the first `openspec init` in a project without skills asks where they should go and saves the answer as `skillsScope` in the global config. Scripted runs are never asked and behave as they do in 2.0.
- **Existing projects keep their own skills** until someone runs `openspec init --scope global` there, which removes the project's copies. An edited skill stops the switch before anything is removed.
- **The skills come from the repository.** The `skills` package clones `Fission-AI/OpenSpec` at the CLI's version and installs the published `skills/` folder, so the CLI writes no skill text for a global install. This needs git; init says so plainly when it is missing.
- **One skill text for every profile.** Skills no longer read differently depending on which other workflows are installed, so the published files are exactly what gets installed. The profile only picks which skills.
- **Unchanged:** everything a project install does. It still uses 2.0's installer in this change.

## Impact

- New: `src/core/global-skills.ts`, the only code that calls the `skills` package.
- Changed: the workflow templates (one wording where there were two) and the published `skills/` folder. Removed: the profile-switching code in `templates/optional-workflow.ts`.
- Changed: `init.ts` (`--scope`, the one question), `update.ts` (refresh the global skills), `cli/index.ts`, global config (`skillsScope`).
- New dependency: `skills` ^1.8.1.
- Specs: `cli-init`, `cli-update`.
- Docs: setup, CLI reference, global config, supported tools.
- Release: minor (2.1.0).
