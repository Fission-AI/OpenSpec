## 1. Tool Metadata

- [x] 1.1 Add the `DeepSeek Harness` entry to `AI_TOOLS` in `src/core/config.ts` with `value: 'dsh'` and `skillsDir: '.dsh'`, using the existing directory-based detection
- [x] 1.2 Verify no other production code changes are required: init selection, `--tools` help, command surface capability, update drift, and shared-root handling must all derive from the new metadata

## 2. Detection and Path Tests

- [x] 2.1 Add `test/core/available-tools.test.ts` cases: detect `dsh` from `.dsh/skills` and from a bare `.dsh` directory; do not detect when neither exists or `.dsh` is a regular file
- [x] 2.2 Add a `test/core/shared/skill-paths.test.ts` case resolving `dsh` to `path.join(root, '.dsh', 'skills')`
- [x] 2.3 Add `test/core/shared/tool-detection.test.ts` cases: `getToolsWithSkillsDir()` includes `dsh`; skill status and configured-tool detection work for `.dsh/skills/openspec-*/SKILL.md`

## 3. Generation and Update Tests

- [x] 3.1 Add an `InitCommand` regression in `test/core/init.test.ts`: `--tools dsh` writes `.dsh/skills/openspec-explore/SKILL.md`, creates no `.dsh/commands`, logs the no-adapter skip, uses `/openspec-*` references in skill bodies and the getting-started hint, and the generated frontmatter satisfies dsh parsing (leading `---`, kebab-case name, non-empty description)
- [x] 3.2 Add an `UpdateCommand` regression in `test/core/update.test.ts`: refresh a stale dsh skill and verify a second update is idempotent
- [x] 3.3 Add `test/utils/command-references.test.ts` coverage that dsh uses the default `/openspec-*` form, and `test/core/command-generation/registry.test.ts` coverage that dsh has no command adapter

## 4. Documentation

- [x] 4.1 Update `docs/supported-tools.md`: add the dsh tool row, add dsh to the skills-only invocation row and the `--tools` id list, and explain that dsh reads `.dsh/skills` at higher priority than `.agents/skills`
- [x] 4.2 Update the supported `--tools` id list in `docs/cli.md`
- [x] 4.3 Update the skills-only syntax tables in `docs/commands.md` and `docs/how-commands-work.md`, and the skills-only tool list in `docs/troubleshooting.md`

## 5. Release and Validation

- [x] 5.1 Add `.changeset/add-dsh-support.md` with a minor bump describing `openspec init --tools dsh`
- [x] 5.2 Run `pnpm run lint`, `pnpm run build`, and the targeted vitest files for detection, paths, init, update, and command references
- [x] 5.3 Run the full test suite (`pnpm test`) and confirm cross-platform path assertions pass on Windows (no hardcoded separators in new tests)
- [x] 5.4 Run `openspec validate` for this change and fix any spec or change validation issues
- [x] 5.5 Manual smoke test in a temporary git project: `openspec init --tools dsh`, confirm `.dsh/skills/openspec-*/SKILL.md` files, start a dsh session and confirm the skills appear in the catalog and load via the skill tool or `/openspec-propose`
