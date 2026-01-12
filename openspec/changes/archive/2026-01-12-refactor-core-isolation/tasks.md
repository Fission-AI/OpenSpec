# Tasks: Complete Core Logic Isolation

## 1. Move Init Command
- [x] 1.1 Move `src/core/init.ts` (CLI implementation) to `src/commands/init.ts`.
- [x] 1.2 Update imports in `src/commands/init.ts` to point to `../core/init-logic.js` and other core modules.
- [x] 1.3 Ensure `src/core/init-logic.ts` is the only export from `src/core` related to initialization.

## 2. Move Update Command
- [x] 2.1 Move `src/core/update.ts` (CLI implementation) to `src/commands/update.ts`.
- [x] 2.2 Update imports in `src/commands/update.ts` to point to `../core/update-logic.js`.

## 3. Move Archive Command
- [x] 3.1 Move `src/core/archive.ts` (CLI implementation) to `src/commands/archive.ts`.
- [x] 3.2 Update imports in `src/commands/archive.ts` to point to `../core/archive-logic.js`.

## 4. Move View Command
- [x] 4.1 Move `src/core/view.ts` (CLI implementation) to `src/commands/view.ts`.
- [x] 4.2 Update imports in `src/commands/view.ts` to point to `../core/view-logic.js`.

## 5. Move List Command
- [x] 5.1 Extract `ListCommand` class from `src/core/list.ts` and move it to `src/commands/list.ts`.
- [x] 5.2 Keep `listChanges` and `listSpecs` pure functions in `src/core/list.ts` (or rename to `src/core/list-logic.ts` if preferred, but `list.ts` is fine if pure).
- [x] 5.3 Update imports in `src/commands/list.ts` to use `src/core/list.js`.

## 6. Update CLI Entry Point
- [x] 6.1 Update `src/cli/index.ts` to import all commands from `src/commands/*.js`.

## 7. Enhance Validate Command
- [x] 7.1 Update `src/commands/validate.ts` to display "Next steps" (e.g., `openspec show <id>`) when validation succeeds.

## 8. Verification
- [x] 8.1 Run `pnpm build` to ensure no circular dependencies or missing types.
- [x] 8.2 Run `bin/openspec.js list` to verify basic CLI functionality.
- [x] 8.3 Verify that `openspec validate <valid-change>` suggests next steps.
