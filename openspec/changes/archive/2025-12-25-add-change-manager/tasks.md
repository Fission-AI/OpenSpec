## Phase 1: Implement Name Validation

- [x] 1.1 Create `src/utils/change-utils.ts`
- [x] 1.2 Implement `validateChangeName()` with kebab-case pattern
- [x] 1.3 Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- [x] 1.4 Return `{ valid: boolean; error?: string }`
- [x] 1.5 Add test: valid names accepted (`add-auth`, `refactor`, `add-feature-2`)
- [x] 1.6 Add test: uppercase rejected
- [x] 1.7 Add test: spaces rejected
- [x] 1.8 Add test: underscores rejected
- [x] 1.9 Add test: special characters rejected
- [x] 1.10 Add test: leading/trailing hyphens rejected
- [x] 1.11 Add test: consecutive hyphens rejected

## Phase 2: Implement Change Creation

- [x] 2.1 Implement `createChange(projectRoot, name)`
- [x] 2.2 Validate name before creating
- [x] 2.3 Create parent directories if needed (`openspec/changes/`)
- [x] 2.4 Throw if change already exists
- [x] 2.5 Add test: creates directory
- [x] 2.6 Add test: duplicate change throws error
- [x] 2.7 Add test: invalid name throws validation error
- [x] 2.8 Add test: creates parent directories if needed

## Phase 3: Integration

- [x] 3.1 Export functions from `src/utils/index.ts`
- [x] 3.2 Add JSDoc comments
- [x] 3.3 Run all tests to verify no regressions
