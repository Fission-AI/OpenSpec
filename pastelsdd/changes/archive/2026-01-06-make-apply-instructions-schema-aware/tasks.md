## Prerequisites

- [x] 0.1 Implement `add-per-change-schema-metadata` first (to auto-detect schema)

## 1. Schema Format

- [x] 1.1 Add `ApplyPhaseSchema` Zod schema to `src/core/artifact-graph/types.ts`
- [x] 1.2 Update `SchemaYamlSchema` to include optional `apply` field
- [x] 1.3 Export `ApplyPhase` type

## 2. Update Existing Schemas

- [x] 2.1 Add `apply` block to `schemas/spec-driven/schema.yaml`
- [x] 2.2 Add `apply` block to `schemas/tdd/schema.yaml`

## 3. Refactor generateApplyInstructions

- [x] 3.1 Load schema via `resolveSchema(schemaName)`
- [x] 3.2 Read `apply.requires` to determine required artifacts
- [x] 3.3 Check artifact existence dynamically (not hardcoded paths)
- [x] 3.4 Use `apply.tracks` for progress tracking (or skip if null)
- [x] 3.5 Use `apply.instruction` for the instruction text
- [x] 3.6 Build `contextFiles` from all existing artifacts in schema

## 4. Handle Fallback

- [x] 4.1 If schema has no `apply` block, require all artifacts to exist
- [x] 4.2 Default instruction: "All artifacts complete. Proceed with implementation."

## 5. Tests

- [x] 5.1 Test apply instructions with spec-driven schema
- [x] 5.2 Test apply instructions with tdd schema
- [x] 5.3 Test fallback when schema has no apply block
- [x] 5.4 Test blocked state when required artifacts missing
