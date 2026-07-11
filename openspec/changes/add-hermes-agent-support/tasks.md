## 1. Change Artifacts

- [x] 1.1 Write proposal, design, and spec deltas for Hermes Agent support
- [x] 1.2 Validate change artifacts with `openspec validate`

## 2. Tool Metadata

- [x] 2.1 Add `installDir` optional field to `AIToolOption` interface in `src/core/config.ts`
- [x] 2.2 Add Hermes Agent entry to `AI_TOOLS` with `skillsDir: '.hermes'` and `installDir: '~/.hermes/skills'`

## 3. Path Resolution Helpers

- [x] 3.1 Add `resolveSkillsDir()` and `resolveMarkerDir()` to `src/core/shared/tool-detection.ts`
- [x] 3.2 Export new helpers from `src/core/shared/index.ts`

## 4. Detection Logic

- [x] 4.1 Update `getToolSkillStatus` to use marker directory for `installDir` tools
- [x] 4.2 Update `getToolVersionStatus` to read version from resolved (global) path

## 5. Installation Logic

- [x] 5.1 Update `src/core/init.ts` `generateSkillsAndCommands` to use `resolveSkillsDir`/`resolveMarkerDir` and create marker directory for `installDir` tools
- [x] 5.2 Update `src/core/update.ts` (two call sites) to use `resolveSkillsDir`/`resolveMarkerDir` and create marker directory
- [x] 5.3 Update `src/core/profile-sync-drift.ts` (two call sites) to use `resolveSkillsDir`
- [x] 5.4 Update `src/core/migration.ts` to use `resolveSkillsDir`

## 6. Documentation

- [x] 6.1 Add Hermes Agent row to `docs/supported-tools.md` table
- [x] 6.2 Add `hermes` to tool IDs list in `docs/supported-tools.md`
- [x] 6.3 Add footnote explaining global installation behavior

## 7. Tests

- [x] 7.1 Add Hermes detection test to `test/core/available-tools.test.ts`
- [x] 7.2 Add `resolveSkillsDir` and `resolveMarkerDir` tests to `test/core/shared/tool-detection.test.ts`
- [x] 7.3 Add Hermes `getToolSkillStatus` and `getToolVersionStatus` tests

## 8. Validation

- [x] 8.1 Run `pnpm run build` — confirms TypeScript compilation
- [x] 8.2 Run `pnpm run lint` — confirms zero lint errors
- [x] 8.3 Run `pnpm test` — confirms all 1887 tests pass
