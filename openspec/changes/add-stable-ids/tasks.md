## 1. Matching on IDs

- [x] 1.1 Read a bracketed heading ID (`headingId`) and pair scenarios by ID before name in `diffScenarioNames`, per [D1](./design.md#d1) and [D2](./design.md#d2); verify with the `headingId` and scenario cases in `test/core/specs-apply.stable-ids.test.ts`
- [x] 1.2 Let MODIFIED target a requirement by ID in `buildUpdatedSpec`, keeping its position, refusing a target another MODIFIED or a RENAMED already claimed, and use the same lookup (after REMOVED) in validate's scenario-loss check, per [D3](./design.md#d3); verify the rename, gain-an-ID, refusal and "validate agrees with archive" tests pass
- [x] 1.3 Refuse duplicate IDs in archive, report them in validate, and warn on repeated scenario IDs and on a main spec that already repeats an ID, per [D4](./design.md#d4); verify the duplicate-ID tests pass
- [x] 1.4 Prove bare look-alikes (`SHA-256`, `HTTP-2`, `UTF-8`) behave as before; verify the "ordinary names that look like IDs" tests pass

## 2. Templates and docs

- [x] 2.1 Add the ID lines to the `spec-driven` specs, design and tasks instructions and to the `spec.md` and `design.md` templates, per [D5](./design.md#d5) and [D6](./design.md#d6); verify `openspec instructions specs` and `openspec instructions design` show them
- [x] 2.2 Mirror the instruction and template text in `docs-lab/reference/schemas/spec-driven/index.md` and document IDs in `docs/concepts.md`; verify the schema docs parity test passes

## 3. Proof

- [x] 3.1 Rebuild every archived delta in OpenSpec, ai-dial-chat, OpenLore, sku and spec-ctx with the old and new builds using `evidence/compare-archives.mjs`; verify every rebuild is byte-identical
- [x] 3.2 Run the full test suite; verify the only failures are the ones main already has
