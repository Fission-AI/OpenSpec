## Why

- Windsurf has been rebranded to **Devin Desktop**, the new flagship AI coding assistant from Cognition. Users who previously used Windsurf are now transitioning to Devin Desktop.
- Devin Desktop uses the same workflow system as Windsurf (Cascade workflows stored in `.devin/workflows/`), making it a natural migration path for existing OpenSpec users.
- OpenSpec currently supports Windsurf but not Devin Desktop. Adding Devin Desktop support ensures users can continue using OpenSpec with their new tool without manual migration.
- The adapter pattern is already established and proven with Windsurf; extending it to Devin Desktop is straightforward and maintains consistency across the tool ecosystem.

## What Changes

- Add **Devin Desktop** (`devin`) to the CLI tool picker (`openspec init`) so users can select it during setup.
- Create a new **Devin adapter** (`src/core/command-generation/adapters/devin.ts`) that generates commands in `.devin/workflows/opsx-<id>.md` with the same frontmatter structure as Windsurf.
- Register the Devin adapter in the command adapter registry (`src/core/command-generation/registry.ts`) and export it from the adapters index.
- Update `docs/supported-tools.md` to include Devin Desktop in the tool reference table.
- Ensure `openspec update` refreshes existing Devin workflows in-place, mirroring current behavior for other editors.
- Extend unit tests for init/update to cover Devin Desktop generation and updates.
- Update CLI prompts and documentation to advertise Devin Desktop support.

## Impact

- **Specs:** `cli-init`, `cli-update`, `command-generation`
- **Code:** 
  - `src/core/command-generation/adapters/devin.ts` (new adapter)
  - `src/core/command-generation/registry.ts` (register adapter)
  - `src/core/command-generation/adapters/index.ts` (export adapter)
  - CLI tool selection logic
- **Docs:** `docs/supported-tools.md`
- **Tests:** init/update integration coverage for Devin Desktop workflows

## Notes

- This is a **migration enabler** for existing Windsurf users transitioning to Devin Desktop.
- Windsurf support can remain in place for backward compatibility with users still on Windsurf.
- The implementation closely mirrors the existing Windsurf adapter, reducing complexity and risk.
