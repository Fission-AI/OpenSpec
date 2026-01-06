## 1. Zod Schema and Types

- [x] 1.1 Add `ChangeMetadataSchema` Zod schema to `src/core/artifact-graph/types.ts`
- [x] 1.2 Export `ChangeMetadata` type inferred from schema

## 2. Core Metadata Functions

- [x] 2.1 Create `src/utils/change-metadata.ts` with `writeChangeMetadata()` function
- [x] 2.2 Add `readChangeMetadata()` function with Zod validation
- [x] 2.3 Update `createChange()` to accept optional `schema` param and write metadata

## 3. Auto-Detection in Instruction Loader

- [x] 3.1 Modify `loadChangeContext()` to read schema from `.openspec.yaml`
- [x] 3.2 Make `schemaName` parameter optional (fall back to metadata, then default)

## 4. CLI Updates

- [x] 4.1 Add `--schema <name>` option to `openspec new change` command
- [x] 4.2 Verify existing commands (`status`, `instructions`) work with auto-detection

## 5. Tests

- [x] 5.1 Test `ChangeMetadataSchema` validates correctly (valid/invalid cases)
- [x] 5.2 Test `writeChangeMetadata()` creates valid YAML
- [x] 5.3 Test `readChangeMetadata()` parses and validates schema
- [x] 5.4 Test `loadChangeContext()` auto-detects schema from metadata
- [x] 5.5 Test fallback to default when no metadata exists
- [x] 5.6 Test `--schema` flag overrides metadata
