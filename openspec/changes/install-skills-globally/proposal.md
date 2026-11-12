## Why

OpenSpec 2.0 writes one copy of its skills into each project's `.agents/skills/`. Someone who uses OpenSpec in many repositories has to run `openspec update` in every one of them after each CLI upgrade, and a project they haven't set up has no skills at all. `npx skills add -g` already solves this for other skills: one copy in the home folder, used by every project.

This is step 4 of the plan in #2022. It replaces the older `add-global-install-scope` change, which predates 2.0 (it still installed command files and added an `installScope` setting).

## What Changes

- **`openspec init --global`** installs the skills once for this machine, in `~/.agents/skills/`, with the same layout `npx skills add -g` uses: one real copy, and a link in the home folder of each selected tool that doesn't read `~/.agents/skills/` (for example `~/.claude/skills/`). It doesn't need or touch a project.
- **`openspec update --global`** refreshes those skills after a CLI upgrade.
- **The global profile decides the workflows**, as it does for projects, so one copy serves every project.
- **No duplicate skills.** In a project that still has its own skills, `openspec update` asks once whether to switch to the global ones. On yes it removes the project's unedited OpenSpec skills and links, keeps and lists edited ones, and saves `skills: global` in `openspec/config.yaml` so later updates don't write them back. Non-interactive runs never switch; they print a note and the flag that does it, `--use-global-skills`.
- **Teammates are never surprised.** OpenSpec writes to a home folder only when that person runs `--global`. In a project that uses global skills, a teammate without them is told to run `openspec init --global`.
- **Unchanged:** projects that don't switch, MiniMax Code (already per machine), and every 2.0 command without `--global`.

## Impact

- New: `src/core/global-skills.ts` (layout, tool paths, install).
- Changed: `shared/shared-skill-install.ts` (takes a layout), `init.ts`, `update.ts`, `project-config.ts` (`skills: global`), `cli/index.ts` (`--global`, `--use-global-skills`).
- Specs: `cli-init`, `cli-update`, `ai-tool-paths`.
- Docs: setup, supported tools, CLI reference, project config.
- Release: minor (2.1.0).
