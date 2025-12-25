## Phase 1: Implement Name Validation

- [ ] 1.1 Create `src/utils/change-utils.ts`
- [ ] 1.2 Implement `validateChangeName()` with kebab-case pattern
- [ ] 1.3 Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- [ ] 1.4 Return `{ valid: boolean; error?: string }`
- [ ] 1.5 Add test: valid names accepted (`add-auth`, `refactor`, `add-feature-2`)
- [ ] 1.6 Add test: uppercase rejected
- [ ] 1.7 Add test: spaces rejected
- [ ] 1.8 Add test: underscores rejected
- [ ] 1.9 Add test: special characters rejected
- [ ] 1.10 Add test: leading/trailing hyphens rejected
- [ ] 1.11 Add test: consecutive hyphens rejected

## Phase 2: Implement Change Creation

- [ ] 2.1 Implement `createChange(projectRoot, name, description?)`
- [ ] 2.2 Validate name before creating
- [ ] 2.3 Create parent directories if needed (`openspec/changes/`)
- [ ] 2.4 Generate README.md with name and optional description
- [ ] 2.5 Throw if change already exists
- [ ] 2.6 Add test: creates directory and README with name only
- [ ] 2.7 Add test: creates directory and README with description
- [ ] 2.8 Add test: duplicate change throws error
- [ ] 2.9 Add test: invalid name throws validation error
- [ ] 2.10 Add test: creates parent directories if needed

## Phase 3: Integration

- [ ] 3.1 Export functions from `src/utils/index.ts`
- [ ] 3.2 Add JSDoc comments
- [ ] 3.3 Run all tests to verify no regressions
