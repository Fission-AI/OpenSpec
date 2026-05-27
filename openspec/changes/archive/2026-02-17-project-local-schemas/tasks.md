## 1. Update Resolver Types and Helpers

- [x] 1.1 Update `SchemaInfo.source` type to include `'project'` in `src/core/artifact-graph/resolver.ts`
- [x] 1.2 Add `getProjectSchemasDir(projectRoot: string): string` function

## 2. Update Schema Resolution Functions

- [x] 2.1 Update `getSchemaDir(name, projectRoot?)` to check project-local first when projectRoot provided
- [x] 2.2 Update `resolveSchema(name, projectRoot?)` to pass projectRoot to getSchemaDir
- [x] 2.3 Update `listSchemas(projectRoot?)` to include project-local schemas
- [x] 2.4 Update `listSchemasWithInfo(projectRoot?)` to include project schemas with `source: 'project'`

## 3. Update CLI Commands

- [x] 3.1 Update `schemasCommand` to pass projectRoot and display source labels in output

## 4. Update Call Sites

- [x] 4.1 Review and update call sites that need project-local schema support to pass projectRoot

## 5. Testing

- [x] 5.1 Add unit tests for `getProjectSchemasDir()`
- [x] 5.2 Add unit tests for project-local schema resolution priority
- [x] 5.3 Add unit tests for backward compatibility (no projectRoot = user + package only)
- [x] 5.4 Add unit tests for `listSchemas()` including project schemas
- [x] 5.5 Add unit tests for `listSchemasWithInfo()` with `source: 'project'`
- [x] 5.6 Add integration test with temp project containing local schema
