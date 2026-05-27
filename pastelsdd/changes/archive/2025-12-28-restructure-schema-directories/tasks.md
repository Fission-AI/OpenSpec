## 1. Create Schema Directories

- [ ] 1.1 Create `schemas/` directory at package root
- [ ] 1.2 Create `schemas/spec-driven/schema.yaml` from `SPEC_DRIVEN_SCHEMA`
- [ ] 1.3 Create `schemas/spec-driven/templates/` with placeholder templates
- [ ] 1.4 Create `schemas/tdd/schema.yaml` from `TDD_SCHEMA`
- [ ] 1.5 Create `schemas/tdd/templates/` with placeholder templates

## 2. Update Schema Resolution

- [ ] 2.1 Add `getPackageSchemasDir()` function using `import.meta.url`
- [ ] 2.2 Add `getSchemaDir(name)` to resolve schema directory path
- [ ] 2.3 Update `resolveSchema()` to load from directory structure
- [ ] 2.4 Update `listSchemas()` to scan directories instead of object keys
- [ ] 2.5 Add tests for user override resolution
- [ ] 2.6 Add tests for built-in fallback

## 3. Cleanup

- [ ] 3.1 Remove `builtin-schemas.ts`
- [ ] 3.2 Update `index.ts` exports (remove `BUILTIN_SCHEMAS`, `SPEC_DRIVEN_SCHEMA`, `TDD_SCHEMA`)
- [ ] 3.3 Update any code that imports removed exports

## 4. Package Distribution

- [ ] 4.1 Add `schemas/` to `files` array in `package.json`
- [ ] 4.2 Verify schemas are included in built package

## 5. Fix Template Paths

- [ ] 5.1 Update `template` field in schema.yaml files (remove `templates/` prefix)
- [ ] 5.2 Ensure template paths are relative to schema's templates directory
