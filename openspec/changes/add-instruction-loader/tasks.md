## 1. Template Loading

- [ ] 1.1 Create `src/core/artifact-graph/template.ts`
- [ ] 1.2 Implement `loadTemplate(schemaName, templatePath)` using schema directory structure
- [ ] 1.3 Add tests for template loading from schema directory
- [ ] 1.4 Add tests for error when template not found

## 2. Change Context

- [ ] 2.1 Create `src/core/artifact-graph/context.ts`
- [ ] 2.2 Define `ChangeContext` interface
- [ ] 2.3 Implement `loadChangeContext()` function
- [ ] 2.4 Add tests for context loading with existing change
- [ ] 2.5 Add tests for context loading with missing change directory

## 3. Instruction Enrichment

- [ ] 3.1 Create `src/core/artifact-graph/instructions.ts`
- [ ] 3.2 Implement `getInstructions()` with header injection
- [ ] 3.3 Add dependency status formatting (done/missing)
- [ ] 3.4 Add next steps calculation
- [ ] 3.5 Add tests for enrichment output

## 4. Status Formatting

- [ ] 4.1 Implement `formatStatus()` function in instructions.ts
- [ ] 4.2 Format as markdown table with status and output path
- [ ] 4.3 Show blocked dependencies
- [ ] 4.4 Add tests for status formatting

## 5. Integration

- [ ] 5.1 Export new functions from `src/core/artifact-graph/index.ts`
- [ ] 5.2 Ensure all tests pass
