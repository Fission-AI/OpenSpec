## Why

OpenSpec writes the same skills once per tool. A project set up for four tools holds four copies of every skill, and tools that read both `.agents/skills` and their own folder load some of them twice (#2022). Most tools now read the shared `.agents/skills` folder, and `npx skills` already installs this way: one real copy, plus links for the tools that look elsewhere.

This is step 2 of the plan in #2022 and ships in 2.0. Step 1 (#2213) made `update` safe from any earlier release, which this change relies on to move existing projects.

## What Changes

- **One copy.** Project skills are written once, to `.agents/skills/<skill>/`, for every tool that has project skills.
- **Links for 14 tools** that don't (or may not) read `.agents/skills`: Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio and Hermes. Each gets one link per skill in its own `skills/` folder, pointing at the shared copy. Where a link can't be made, a plain copy.
- **One wording.** Skills mention other workflows by skill name in plain language, so the shared copy reads correctly in every tool.
- **A list of tools.** `.agents/skills/.openspec-target` lists every tool set up in the project (it used to name one owner), so `update` still knows which tools to keep.
- **Moving existing projects.** `update` moves each tool's old `<tool>/skills/openspec-*` copies into the shared folder: untouched copies are removed (or replaced by a link), edited ones are kept and reported.
- **Unchanged:** command files, MiniMax Code's global skills, Amazon Q, and projects with commands-only delivery.
- **BREAKING:** skills move out of tool folders. A tool not in the linked list that does not read `.agents/skills` would need a link added by hand; the docs show how.

## Impact

- `src/core/shared/skill-paths.ts`, `shared-skill-target.ts`, `init.ts`, `update.ts`, `migration.ts`, `shared/tool-detection.ts`, `available-tools.ts`, `profile-sync-drift.ts`, `released-output-sweep.ts`, `update-plan.ts`, `utils/command-references.ts`.
- Specs: `ai-tool-paths`, `cli-init`, `cli-update`.
- Docs: `docs-lab/reference/supported-tools.md` and setup pages.
