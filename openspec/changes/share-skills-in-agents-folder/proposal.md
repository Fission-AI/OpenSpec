## Why

OpenSpec writes the same skills once per tool. A project set up for four tools holds four copies of every skill, and tools that read both `.agents/skills` and their own folder load some of them twice (#2022). Most tools now read the shared `.agents/skills` folder, and `npx skills` already installs this way: one real copy, plus links for the tools that look elsewhere.

This is the 2.0 step of the plan in #2022: one shared folder, and skills only. v1.17.0 (#2213) made `update` safe from any earlier release and announced that commands go away in 2.0; this change relies on both.

## What Changes

- **One copy.** Project skills are written once, to `.agents/skills/<skill>/`, for every tool that has project skills.
- **Links for 14 tools** that don't (or may not) read `.agents/skills`: Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio and Hermes. Each gets one link per skill in its own `skills/` folder, pointing at the shared copy. Where a link can't be made, a plain copy.
- **One wording.** Skills mention other workflows by skill name in plain language, so the shared copy reads correctly in every tool.
- **A list of tools.** `.agents/skills/.openspec-target` lists every tool set up in the project (it used to name one owner), so `update` still knows which tools to keep.
- **Moving existing projects.** `update` moves each tool's old `<tool>/skills/openspec-*` copies into the shared folder: untouched copies are removed (or replaced by a link), edited ones are kept and reported.
- **Skills only.** No command files are generated for any tool or `delivery` setting. `init` and `update` remove the command files earlier versions generated and keep (and list) any the user edited. A commands-only 1.x project gets its skills.
- **`delivery` retired.** Still read and accepted, so older configs and scripts keep working, but it changes nothing; the default is `skills`, and the profile picker asks only about workflows.
- **Unchanged:** MiniMax Code's global skills, and the command adapters, which cleanup still uses to find old command files.
- **BREAKING:** skills move out of tool folders. A tool not in the linked list that does not read `.agents/skills` would need a link added by hand; the docs show how.
- **BREAKING:** `/opsx:*` commands are gone; each has a skill with the same instructions (`/opsx:propose` → `openspec-propose`). Amazon Q Developer, which cannot load skills, no longer gets workflows.

## Impact

- `src/core/shared/skill-paths.ts`, `shared-skill-target.ts`, `init.ts`, `update.ts`, `migration.ts`, `shared/tool-detection.ts`, `available-tools.ts`, `profile-sync-drift.ts`, `released-output-sweep.ts`, `update-plan.ts`, `utils/command-references.ts`.
- Specs: `ai-tool-paths`, `cli-init`, `cli-update`, `cli-config`.
- Code also: `command-surface.ts` (the skills-only switch), `commands/config.ts`, `global-config.ts`, `config-schema.ts`.
- Docs: `docs-lab/reference/supported-tools.md`, setup, profiles, CLI and config pages, and a new `docs-lab/help/upgrade-to-2.md`.
