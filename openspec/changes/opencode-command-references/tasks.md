## 1. Implementation

- [ ] 1.1 Create `src/utils/command-references.ts` with `transformToHyphenCommands()` function
- [ ] 1.2 Export `transformToHyphenCommands` from `src/utils/index.ts`
- [ ] 1.3 Update `generateSkillContent()` in `src/core/shared/skill-generation.ts` to accept optional `transformInstructions` callback
- [ ] 1.4 Update OpenCode adapter in `src/core/command-generation/adapters/opencode.ts` to use `transformToHyphenCommands()` for body text
- [ ] 1.5 Update `init.ts` to pass transformer when generating skills for OpenCode
- [ ] 1.6 Update `update.ts` to pass transformer when generating skills for OpenCode

## 2. Testing

- [ ] 2.1 Create `test/utils/command-references.test.ts` with unit tests for `transformToHyphenCommands()`
- [ ] 2.2 Add test to `test/core/command-generation/adapters.test.ts` for OpenCode body transformation
- [ ] 2.3 Add test to `test/core/shared/skill-generation.test.ts` for transformer callback

## 3. Verification

- [ ] 3.1 Run `npx vitest run test/utils/command-references.test.ts test/core/command-generation/adapters.test.ts test/core/shared/skill-generation.test.ts` to ensure tests pass
- [ ] 3.2 Run `pnpm run build` to ensure no TypeScript errors
- [ ] 3.3 Run `openspec init --tools opencode` in a temp directory and verify:
  - Command files in `.opencode/command/` contain `/opsx-` references (not `/opsx:`)
  - Skill files in `.opencode/skills/` contain `/opsx-` references (not `/opsx:`)
