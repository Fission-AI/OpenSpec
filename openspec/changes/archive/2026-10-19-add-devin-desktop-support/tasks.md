# Implementation Tasks

## 1. Adapter

- [x] 1.1 Add `src/core/command-generation/adapters/devin.ts`: `.devin/workflows/opsx-<id>.md`, frontmatter `name`/`description`/`category`/`tags` via the shared helpers in `command-generation/yaml.ts`.
- [x] 1.2 Keep the adapter a pure formatter: the `opsx-` filename prefix makes Devin a flat invocation, so the generator rewrites `/opsx:<id>` body references to `/opsx-<id>` — the name Devin registers for a workflow file.
- [x] 1.3 Delete `adapters/windsurf.ts` and its registry/barrel entries; register `devinAdapter` in their place.

## 2. Tool wiring

- [x] 2.1 Replace the `windsurf` row in `AI_TOOLS` with `devin` (`skillsDir: '.devin'`, `detectionPaths: ['.devin', '.windsurf']`). Detection, the init picker, `--tools` validation, update, and profile sync all derive from this row.
- [x] 2.2 Add `TOOL_ID_ALIASES` / `resolveToolIdAlias` in `src/core/config.ts` and apply it when parsing `--tools`, so `--tools windsurf` still resolves.
- [x] 2.3 Re-key the pre-opsx `.windsurf/workflows/openspec-*.md` entry in `LEGACY_SLASH_COMMAND_PATHS` to `devin` — that map's keys are tool ids.
- [x] 2.4 In `getTransformerForTool`, give `devin` the skill-reference transformer whenever skills are generated, so skill bodies and the getting-started hint say `/openspec-*` — the Devin Local agent has no workflows. Under commands-only delivery, fall through to the invocation rewrite.

## 3. Migration

- [x] 3.1 Replace `LEGACY_SKILLS_DIRS` with `LEGACY_TOOL_ROOTS`, each root carrying whether leaving it needs consent (`.kimi` no, `.windsurf` yes).
- [x] 3.2 Extend the move to command files, deriving the legacy path from the adapter's own `getFilePath` so no layout is hard-coded. Skip absolute paths.
- [x] 3.3 Split find from apply (`findLegacyToolMigrations` / `migrateLegacyToolDirs`) so a consent-gated move can be described before it happens.
- [x] 3.4 `openspec update`: explain the rebrand, prompt interactively, migrate under `--force` or non-interactively, and say plainly what declining costs.
- [x] 3.5 `openspec init`: treat selecting the tool as consent and migrate for the selected tools only.

## 4. Documentation

- [x] 4.1 `docs/supported-tools.md`: give Devin its own row in the authoritative "How To Invoke" table — the catch-all row would otherwise claim `/opsx-<id>` for both agents. Replace the Windsurf directory row and rewrite the footnote to cover the rename, the alias, and the migration.
- [x] 4.2 Drop `windsurf` from the `--tools` ID lists in `docs/cli.md` and `docs/supported-tools.md`, noting it is still accepted as an alias.
- [x] 4.3 Update the command-syntax tables in `docs/commands.md` and `docs/how-commands-work.md`, plus prose mentions in `faq.md`, `migration-guide.md`, `opsx.md`, and the website tool list.

## 5. Tests

- [x] 5.1 Adapter: tool id, `getFilePath`, and frontmatter. Hyphen rewriting is asserted end to end in the `generateCommand` flat-tool loop, and YAML escaping by the registry-derived parity matrix — both enroll Devin automatically.
- [x] 5.2 Detection: `.devin` and legacy `.windsurf` both resolve to `devin`; neither present means not detected.
- [x] 5.3 Alias: `--tools windsurf` writes `.devin/` and leaves no `.windsurf/`.
- [x] 5.4 Migration: skills and workflows move, user-authored files in `.windsurf/` survive, and a second run migrates nothing.
- [x] 5.5 `init`/`update`: both surfaces — `.devin/workflows/opsx-*.md` carry `/opsx-*`, `.devin/skills/openspec-*/SKILL.md` carry `/openspec-*`, and neither carries `/opsx:`.
- [x] 5.6 `getTransformerForTool` returns the skill transformer for Devin under `both`/`skills` delivery and the hyphen form under `commands`.

## 6. Verification

- [x] 6.1 `openspec validate add-devin-desktop-support --strict`.
- [x] 6.2 `openspec archive add-devin-desktop-support --yes` merges cleanly and additively (run on a scratch copy, then reverted).
- [x] 6.3 Full suite green.
- [x] 6.4 Manual journeys in scratch repos: legacy `.windsurf` install upgraded; both directories populated; IDE-written `.devin/rules/` preserved; `--tools windsurf` alias.
