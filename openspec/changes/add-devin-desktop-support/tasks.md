# Implementation Tasks

## 1. Adapter

- [x] 1.1 Add `src/core/command-generation/adapters/devin.ts`, modeled on the Windsurf adapter: `.devin/workflows/opsx-<id>.md`, frontmatter `name`/`description`/`category`/`tags` via the shared helpers in `command-generation/yaml.ts`.
- [x] 1.2 Rewrite `/opsx:<id>` body references to `/opsx-<id>` with `transformToHyphenCommands` — Devin registers a workflow under its filename.
- [x] 1.3 Register in `registry.ts` and re-export from `adapters/index.ts`.

## 2. Tool wiring

- [x] 2.1 Add the `devin` row to `AI_TOOLS` in `src/core/config.ts` with `skillsDir: '.devin'`. Detection, the init picker, `--tools` validation, update, and profile sync all derive from this row.
- [x] 2.2 In `getTransformerForTool`, give `devin` the skill-reference transformer whenever skills are generated, so skill bodies and the getting-started hint say `/openspec-*` — the Devin Local agent has no workflows. Under commands-only delivery, fall back to the hyphen form.

## 3. Documentation

- [x] 3.1 Add the Devin row to the tool table in `docs/supported-tools.md`, plus a footnote covering the `.windsurf/` → `.devin/` move and the Devin Local workflow gap.
- [x] 3.2 Add `devin` to the `--tools` ID lists in `docs/supported-tools.md` and `docs/cli.md` (both mirror `AI_TOOLS`).
- [x] 3.3 Add a Devin row to the command-syntax tables in `docs/commands.md` and `docs/how-commands-work.md`.

## 4. Tests

- [x] 4.1 Adapter: tool id, `getFilePath`, frontmatter, and hyphen rewriting. YAML escaping is covered by the registry-derived parity matrix, which enrolls Devin automatically.
- [x] 4.2 Registry and `available-tools` detection from `.devin/`, including the negative case.
- [x] 4.3 `init`: both surfaces — `.devin/workflows/opsx-*.md` carry `/opsx-*`, `.devin/skills/openspec-*/SKILL.md` carry `/openspec-*`, and neither carries `/opsx:`.
- [x] 4.4 `update`: workflows and skills are both refreshed, with stale content gone.
- [x] 4.5 `getTransformerForTool` returns the skill transformer for Devin under `both`/`skills` delivery and the hyphen transformer under `commands`.

## 5. Verification

- [x] 5.1 `openspec validate add-devin-desktop-support --strict`.
- [x] 5.2 `openspec archive add-devin-desktop-support --yes` merges cleanly and additively (run on a scratch copy, then reverted).
- [x] 5.3 Manual `openspec init --tools devin --force` and `openspec update --force` in a scratch repo, under `both`, `skills`, and `commands` delivery.
