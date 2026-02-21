## 1. Metadata Model

- [ ] 1.1 Add optional stack metadata fields (`dependsOn`, `provides`, `requires`, `touches`, `parent`) to change metadata schema
- [ ] 1.2 Keep metadata backward compatible for existing changes without new fields
- [ ] 1.3 Add tests for valid/invalid metadata and schema evolution behavior

## 2. Stack-Aware Validation

- [ ] 2.1 Detect dependency cycles and fail validation with deterministic errors
- [ ] 2.2 Detect missing `dependsOn` targets (referenced change ID does not exist) and detect changes transitively blocked by unresolved/cyclic dependency paths
- [ ] 2.3 Add overlap warnings for active changes that touch the same capability/spec areas
- [ ] 2.4 Add tests for cycle, missing dependency, and overlap warning cases

## 3. Sequencing Commands

- [ ] 3.1 Add `openspec change graph` to display dependency order for active changes
- [ ] 3.2 Add `openspec change next` to suggest unblocked changes in recommended order
- [ ] 3.3 Add tests for topological ordering and deterministic tie-breaking (lexicographic by change ID at equal depth)

## 4. Split Scaffolding

- [ ] 4.1 Add `openspec change split <change-id>` to scaffold child slices
- [ ] 4.2 Ensure generated children include parent/dependency metadata and stub proposal/tasks files
- [ ] 4.3 Add tests for split output structure and idempotency/error behavior

## 5. Documentation

- [ ] 5.1 Document stack metadata and sequencing workflow in `docs/concepts.md`
- [ ] 5.2 Document new change commands and usage examples in `docs/cli.md`
- [ ] 5.3 Add guidance for breaking large changes into independently mergeable slices
- [ ] 5.4 Document migration guidance for `openspec/changes/IMPLEMENTATION_ORDER.md` as optional narrative, not dependency source of truth

## 6. Verification

- [ ] 6.1 Run targeted tests for change parsing, validation, and CLI commands
- [ ] 6.2 Run full test suite (`pnpm test`) and resolve regressions
