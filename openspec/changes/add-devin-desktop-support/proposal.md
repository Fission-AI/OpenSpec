## Why

- Windsurf has been [rebranded to **Devin Desktop**](https://docs.devin.ai/desktop/devin-desktop-faq) as of June 2, 2026. Same IDE, same editor, new brand.
- The rebrand moved the config directory: `.devin/` is now the preferred read + write location and `.windsurf/` is the legacy read-only fallback. That applies to `rules/`, `workflows/`, `skills/`, and `plans/`. OpenSpec writes only `.windsurf/`, so every new Devin install lands in the deprecated path.
- Devin ships two agents. Devin Desktop (Cascade) reads workflows; the [Devin Local agent does not](https://docs.devin.ai/desktop/devin-local) — its docs say to migrate workflows to skills. Devin therefore needs both surfaces, with skill bodies that stay usable on the agent that has no workflows.
- The adapter pattern is already established and proven with Windsurf; extending it to Devin Desktop is straightforward and maintains consistency across the tool ecosystem.

## What Changes

- Add **Devin Desktop** (`devin`) to the CLI tool picker (`openspec init`) so users can select it during setup.
- Create a new **Devin adapter** (`src/core/command-generation/adapters/devin.ts`) that writes workflows to `.devin/workflows/opsx-<id>.md` with the same frontmatter structure as Windsurf, rewriting `/opsx:<id>` references to the `/opsx-<id>` form a workflow filename registers.
- Register the Devin adapter in the command adapter registry (`src/core/command-generation/registry.ts`) and export it from the adapters index.
- Route Devin's **skill** bodies and the getting-started hint through the skill-reference transformer so they say `/openspec-*`, the one invocation both Devin agents accept.
- Update the tool reference and command-syntax tables in `docs/` to include Devin Desktop.
- Ensure `openspec update` refreshes existing Devin workflows in-place, mirroring current behavior for other editors.
- Extend unit tests for init/update to cover Devin Desktop generation and updates.

## Impact

- **Specs:** `ai-tool-paths`, `cli-init`, `cli-update`
- **Code:**
  - `src/core/command-generation/adapters/devin.ts` (new adapter)
  - `src/core/command-generation/registry.ts` (register adapter)
  - `src/core/command-generation/adapters/index.ts` (export adapter)
  - `src/core/config.ts` (`AI_TOOLS` entry, `skillsDir: '.devin'`)
  - `src/utils/command-references.ts` (Devin's skill-reference transformer)
- **Docs:** `docs/supported-tools.md`, `docs/cli.md`, `docs/commands.md`, `docs/how-commands-work.md`
- **Tests:** adapter, registry, tool detection, and init/update coverage for both Devin surfaces

## Notes

- This is a **migration enabler** for existing Windsurf users transitioning to Devin Desktop.
- Windsurf support stays in place. `.windsurf/` remains a valid read fallback for Devin, and OpenSpec keeps writing it for users who have not moved.
- The implementation closely mirrors the existing Windsurf adapter, reducing complexity and risk.
