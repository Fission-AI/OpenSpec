## 1. Package Identity

- [x] 1.1 Update `package.json`: set `name` to the enpalspec package name (confirm with stakeholders — e.g. `@enpal/enpalspec`)
- [x] 1.2 Update `package.json`: set `description`, `homepage`, `repository.url` to enpalspec values
- [x] 1.3 Update `package.json` `bin` field: replace `{ "openspec": "./bin/openspec.js" }` with `{ "enpalspec": "./bin/openspec.js" }`
- [x] 1.4 Verify `enpalspec --version` works after build; verify `openspec` is no longer provided by this package

## 2. Default Schema

- [x] 2.1 Update `DEFAULT_SCHEMA` constant in `src/core/init.ts` from `'spec-driven'` to `'enpal-spec-driven'`
- [x] 2.2 Verify `enpalspec init` writes `schema: enpal-spec-driven` to `openspec/config.yaml`

## 3. COMMAND_NAMESPACE Constant

- [x] 3.1 Create `src/core/command-generation/namespace.ts` exporting `COMMAND_NAMESPACE = 'enpalspec'`
- [x] 3.2 Update `src/core/command-generation/adapters/claude.ts` to import and use `COMMAND_NAMESPACE` in `getFilePath` and `formatFile`
- [x] 3.3 Update `src/core/command-generation/adapters/cursor.ts` to use `COMMAND_NAMESPACE` in path, `name` frontmatter field, and `id` frontmatter field
- [x] 3.4 Update `src/core/command-generation/adapters/windsurf.ts` to use `COMMAND_NAMESPACE`
- [x] 3.5 Update all remaining adapters to use `COMMAND_NAMESPACE` (antigravity, cline, codebuddy, codex, continue, factory, gemini, github-copilot, iflow, kilocode, kiro, opencode, qoder, qwen, roocode, amazon-q, auggie, costrict, crush, pi)
- [x] 3.6 Verify no adapter file contains the literal string `'opsx'` after update

## 4. Workflow Template Body Updates

- [x] 4.1 Update `src/core/templates/workflows/explore.ts`: replace all `/opsx:*` references with `/enpalspec:*`
- [x] 4.2 Update `src/core/templates/workflows/propose.ts`: replace all `/opsx:*` references
- [x] 4.3 Update `src/core/templates/workflows/new-change.ts`: replace all `/opsx:*` references
- [x] 4.4 Update `src/core/templates/workflows/apply-change.ts`: replace all `/opsx:*` references
- [x] 4.5 Update `src/core/templates/workflows/archive-change.ts`: replace all `/opsx:*` references
- [x] 4.6 Update `src/core/templates/workflows/continue-change.ts`: replace all `/opsx:*` references
- [x] 4.7 Update `src/core/templates/workflows/ff-change.ts`: replace all `/opsx:*` references
- [x] 4.8 Update `src/core/templates/workflows/sync-specs.ts`: replace all `/opsx:*` references
- [x] 4.9 Update `src/core/templates/workflows/verify-change.ts`: replace all `/opsx:*` references
- [x] 4.10 Update `src/core/templates/workflows/onboard.ts`: replace all `/opsx:*` references
- [x] 4.11 Verify no workflow template file contains `/opsx:` after update

## 5. Verification

- [x] 5.1 Build the project (`pnpm build`) and confirm no TypeScript errors
- [x] 5.2 Run tests (`pnpm test`) and confirm all pass
- [x] 5.3 Run `enpalspec init` in a scratch directory and confirm generated command files use `enpalspec` namespace and `enpal-spec-driven` schema
- [x] 5.4 Confirm `.claude/commands/enpalspec/explore.md` exists (not `.claude/commands/opsx/`)
