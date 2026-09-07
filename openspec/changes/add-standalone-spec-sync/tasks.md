## 1. Lifecycle field

- [x] 1.1 Add optional `status: proposed | shipped` to `ChangeMetadataSchema`
- [x] 1.2 Add `readChangeStatus`, failing closed on metadata it cannot honor
- [x] 1.3 Add `writeChangeStatus`, preserving comments and key order

## 2. Sync command

- [x] 2.1 Add `src/core/sync.ts` with the fold and the `--check` predicate
- [x] 2.2 Run archive's guards before writing: validation, task completion,
      rebuilt-spec validation
- [x] 2.3 Refuse retirements and name `openspec archive` instead
- [x] 2.4 Re-evaluate after writing so a non-convergent pair is named, not looped on
- [x] 2.5 Register the CLI command and its completion entry

## 3. List filter

- [x] 3.1 Add `--status <state>`, counting an undeclared change as `proposed`
- [x] 3.2 Render the lifecycle column and the JSON `lifecycle` key only when declared

## 4. Docs and verification

- [x] 4.1 Document `openspec sync` and `list --status`
- [x] 4.2 Add the CI section to the team workflow guide
- [x] 4.3 Tests covering the gate, the guards, and the archive interaction
