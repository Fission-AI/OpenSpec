## Why

- Windsurf has been [rebranded to **Devin Desktop**](https://docs.devin.ai/desktop/devin-desktop-faq) as of June 2, 2026. Same IDE, same editor, new brand.
- The rebrand moved the config directory: `.devin/` is now the preferred read + write location and `.windsurf/` the legacy read-only fallback, for `rules/`, `workflows/`, `skills/`, and `plans/`. OpenSpec writes only `.windsurf/`, so every Devin install lands in the deprecated path.
- Devin ships two agents. Devin Desktop (Cascade) reads workflows; the [Devin Local agent does not](https://docs.devin.ai/desktop/devin-local) — its docs say to migrate workflows to skills, and it does not read `.windsurf/` at all. An existing Windsurf user's OpenSpec files are therefore invisible to Devin Local entirely.
- Adding `devin` as a *second* tool id alongside `windsurf` would list one product twice in the picker and leave existing users with two parallel installs. This follows the rename instead, matching what OpenSpec already did for Kimi CLI → Kimi Code.

## What Changes

- **Rename the tool, don't duplicate it.** `windsurf` is retired as a tool id; `devin` (Devin Desktop) takes its place with `skillsDir: '.devin'` and `detectionPaths: ['.devin', '.windsurf']`. The Windsurf adapter is replaced by a Devin adapter writing `.devin/workflows/opsx-<id>.md`.
- **Keep `--tools windsurf` working.** A `TOOL_ID_ALIASES` map resolves retired ids, so existing setup scripts and CI keep running; they now configure `.devin/`.
- **Migrate existing installs, with consent.** OpenSpec-managed skills (`openspec-*`) and command files (`opsx-*`) under `.windsurf/` move to `.devin/`. `openspec update` explains the rebrand and asks first; `--force` and non-interactive runs take the move. Selecting the tool during `openspec init` is itself consent. Files the user wrote are never touched.
- Route Devin's **skill** bodies and the getting-started hint through the skill-reference transformer so they say `/openspec-*`, the one invocation both Devin agents accept.
- Update the tool reference, invocation, and command-syntax tables in `docs/`, plus the website tool list.

## Impact

- **Specs:** `ai-tool-paths`, `cli-init`, `cli-update`, `command-generation`
- **Code:**
  - `src/core/command-generation/adapters/devin.ts` (new; `windsurf.ts` deleted)
  - `src/core/command-generation/registry.ts`, `adapters/index.ts`, `index.ts`
  - `src/core/config.ts` (`AI_TOOLS` row, `TOOL_ID_ALIASES`, `resolveToolIdAlias`)
  - `src/core/migration.ts` (`LEGACY_TOOL_ROOTS`, consent-aware migration of skills *and* command files)
  - `src/core/init.ts`, `src/core/update.ts` (alias resolution, migration prompt)
  - `src/core/legacy-cleanup.ts` (pre-opsx `.windsurf/` files now key to `devin`)
  - `src/utils/command-references.ts` (Devin's skill-reference transformer)
- **Docs:** `supported-tools.md`, `cli.md`, `commands.md`, `how-commands-work.md`, `faq.md`, `migration-guide.md`, `opsx.md`, website home page

## Notes

- **Who could be affected:** a user still on a pre-rebrand Windsurf build reads only `.windsurf/`. That is why the move is offered rather than taken — declining leaves every file where it is. Declining does mean `.windsurf/` stops being refreshed, which the prompt says plainly.
- The `.devin/` directory also covers `rules/` and `plans/`. OpenSpec writes neither, so they are out of scope and untouched.
