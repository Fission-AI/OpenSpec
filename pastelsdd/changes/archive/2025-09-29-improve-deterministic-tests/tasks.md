# Implementation Tasks

## 1. Test Isolation
- [x] 1.1 Create temp fixture roots per suite (pastelsdd/changes, pastelsdd/specs)
- [x] 1.2 Use process.chdir to temp root within tests
- [x] 1.3 Restore original cwd and clean temp dirs after each

## 2. Deterministic Discovery
- [x] 2.1 Implement getActiveChangeIds(root?) to only include dirs with proposal.md
- [x] 2.2 Implement getSpecIds(root?) to only include dirs with spec.md
- [x] 2.3 Return sorted results to avoid fs.readdir ordering variance

## 3. Command Integration
- [x] 3.1 Ensure change/show/validate rely on cwd and discovery helpers
- [x] 3.2 Keep runtime behavior unchanged for end users

## 4. Validation
- [x] 4.1 Convert affected command tests (show, spec, validate, change) to isolated fixtures
- [x] 4.2 Verify tests pass consistently across environments
- [x] 4.3 Confirm no reads from real repo state during tests

## 5. Optional (Not Needed Now)
- [x] 5.1 Add optional root param to discovery helpers (default process.cwd())


