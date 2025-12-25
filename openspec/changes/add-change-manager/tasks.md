## Phase 1: Create ChangeManager Module Structure

- [ ] 1.1 Create `src/core/change-manager/` directory
- [ ] 1.2 Create `src/core/change-manager/index.ts` with public exports
- [ ] 1.3 Create `src/core/change-manager/change-manager.ts` with class skeleton
- [ ] 1.4 Create `src/core/change-manager/validation.ts` for name validation
- [ ] 1.5 Export `ChangeManager` from `src/core/index.ts`

## Phase 2: Extract Existing Functionality

### 2.1 Extract `listChanges()`
- [ ] 2.1.1 Implement `listChanges()` matching `ListCommand` + `getActiveChanges()` behavior
- [ ] 2.1.2 Exclude `archive/` directory
- [ ] 2.1.3 Filter to directories only (ignore files)
- [ ] 2.1.4 Return sorted array
- [ ] 2.1.5 Add test: multiple changes returns sorted array
- [ ] 2.1.6 Add test: empty directory returns empty array
- [ ] 2.1.7 Add test: ignores files and archive

### 2.2 Extract `changeExists()`
- [ ] 2.2.1 Implement `changeExists(name)` checking directory existence
- [ ] 2.2.2 Add test: existing change returns true
- [ ] 2.2.3 Add test: non-existent change returns false

### 2.3 Extract `getChangePath()`
- [ ] 2.3.1 Implement `getChangePath(name)` returning absolute path
- [ ] 2.3.2 Throw error with available changes if not found
- [ ] 2.3.3 Add test: existing change returns absolute path
- [ ] 2.3.4 Add test: non-existent change throws descriptive error

### 2.4 Extract `isInitialized()`
- [ ] 2.4.1 Implement `isInitialized()` checking `openspec/changes/` exists
- [ ] 2.4.2 Add test: initialized project returns true
- [ ] 2.4.3 Add test: uninitialized project returns false

## Phase 3: Add New Functionality

### 3.1 Add Name Validation
- [ ] 3.1.1 Implement `validateName(name)` with kebab-case pattern
- [ ] 3.1.2 Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- [ ] 3.1.3 Return `{ valid: boolean; error?: string }`
- [ ] 3.1.4 Add test: valid names accepted (`add-auth`, `refactor`, `add-feature-2`)
- [ ] 3.1.5 Add test: uppercase rejected
- [ ] 3.1.6 Add test: spaces rejected
- [ ] 3.1.7 Add test: underscores rejected
- [ ] 3.1.8 Add test: special characters rejected
- [ ] 3.1.9 Add test: leading/trailing hyphens rejected
- [ ] 3.1.10 Add test: consecutive hyphens rejected

### 3.2 Add `createChange()`
- [ ] 3.2.1 Implement `createChange(name, description?)` method
- [ ] 3.2.2 Validate name before creating
- [ ] 3.2.3 Create parent directories if needed (`openspec/changes/`)
- [ ] 3.2.4 Generate README.md with name and optional description
- [ ] 3.2.5 Throw if change already exists
- [ ] 3.2.6 Add test: creates directory and README with name only
- [ ] 3.2.7 Add test: creates directory and README with description
- [ ] 3.2.8 Add test: duplicate change throws error
- [ ] 3.2.9 Add test: invalid name throws validation error
- [ ] 3.2.10 Add test: creates parent directories if needed

## Phase 4: Refactor CLI Commands

### 4.1 Refactor `ListCommand`
- [ ] 4.1.1 Import `ChangeManager` in `src/core/list.ts`
- [ ] 4.1.2 Replace inline directory scanning with `changeManager.listChanges()`
- [ ] 4.1.3 Verify existing behavior unchanged

### 4.2 Refactor `ChangeCommand`
- [ ] 4.2.1 Import `ChangeManager` in `src/commands/change.ts`
- [ ] 4.2.2 Replace `getActiveChanges()` with `changeManager.listChanges()`
- [ ] 4.2.3 Replace inline path building with `changeManager.getChangePath()`
- [ ] 4.2.4 Remove `getActiveChanges()` private method
- [ ] 4.2.5 Verify existing behavior unchanged

## Phase 5: Integration and Cleanup

- [ ] 5.1 Add JSDoc comments to all public methods
- [ ] 5.2 Run existing tests to verify no regressions
- [ ] 5.3 Add integration test: full workflow (create, list, get path, exists)
- [ ] 5.4 Update any imports in other files if needed
