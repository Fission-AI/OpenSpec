## 1. Setup and Command Structure

- [ ] 1.1 Create `src/commands/schema.ts` with `registerSchemaCommand(program: Command)` function
- [ ] 1.2 Register schema command in `src/cli/index.ts` (import and call `registerSchemaCommand`)
- [ ] 1.3 Add schema command group with description: "Manage workflow schemas"

## 2. Schema Which Command

- [ ] 2.1 Add `schema which <name>` subcommand with `--json` and `--all` options
- [ ] 2.2 Implement resolution lookup using `getSchemaDir()` with project root
- [ ] 2.3 Implement shadow detection by checking all three locations (project, user, package)
- [ ] 2.4 Add text output: show source, path, and shadowing info
- [ ] 2.5 Add JSON output: `{ name, source, path, shadows: [] }`
- [ ] 2.6 Add `--all` mode to list all schemas with their resolution sources

## 3. Schema Validate Command

- [ ] 3.1 Add `schema validate [name]` subcommand with `--json` and `--verbose` options
- [ ] 3.2 Implement single-schema validation using existing `parseSchema()` from `schema.ts`
- [ ] 3.3 Add template existence check for each artifact's template file
- [ ] 3.4 Add dependency graph cycle detection (reuse topological sort logic)
- [ ] 3.5 Add validate-all mode when no name provided (scan `openspec/schemas/`)
- [ ] 3.6 Add text output with pass/fail indicators and error messages
- [ ] 3.7 Add JSON output matching existing `openspec validate` format: `{ valid, issues: [] }`
- [ ] 3.8 Add verbose mode showing each validation step

## 4. Schema Fork Command

- [ ] 4.1 Add `schema fork <source> [name]` subcommand with `--json` and `--force` options
- [ ] 4.2 Implement source resolution using `getSchemaDir()` with project root
- [ ] 4.3 Implement default destination naming: `<source>-custom`
- [ ] 4.4 Implement directory copy with recursive file copy
- [ ] 4.5 Update `name` field in copied `schema.yaml`
- [ ] 4.6 Add overwrite protection: check destination exists, require `--force` or confirmation
- [ ] 4.7 Add text output with source/destination paths
- [ ] 4.8 Add JSON output: `{ forked, source, destination, sourceLocation }`

## 5. Schema Init Command

- [ ] 5.1 Add `schema init <name>` subcommand with `--json`, `--description`, `--artifacts`, `--default`, `--no-default`, `--force` options
- [ ] 5.2 Implement schema name validation (kebab-case, no spaces)
- [ ] 5.3 Implement interactive prompts for description using `@inquirer/prompts`
- [ ] 5.4 Implement interactive artifact selection with descriptions (multi-select)
- [ ] 5.5 Create schema directory and `schema.yaml` with selected configuration
- [ ] 5.6 Create default template files for selected artifacts
- [ ] 5.7 Add `--default` flag to update `openspec/config.yaml` with new schema as default
- [ ] 5.8 Add overwrite protection: check if schema exists, require `--force`
- [ ] 5.9 Add text output with created path and next steps
- [ ] 5.10 Add JSON output: `{ created, path, schema }`
- [ ] 5.11 Add non-interactive mode with `--description` and `--artifacts` flags

## 6. Testing

- [ ] 6.1 Add unit tests for `schema which` command in `test/commands/schema.test.ts`
- [ ] 6.2 Add unit tests for `schema validate` command
- [ ] 6.3 Add unit tests for `schema fork` command
- [ ] 6.4 Add unit tests for `schema init` command
- [ ] 6.5 Test interactive mode mocking with `@inquirer/prompts`
- [ ] 6.6 Test JSON output format for all commands
- [ ] 6.7 Test error cases: invalid name, not found, already exists, cycle detection

## 7. Documentation and Polish

- [ ] 7.1 Add CLI help text for all schema subcommands
- [ ] 7.2 Update shell completion to include schema commands
- [ ] 7.3 Run linting and fix any issues (`npm run lint`)
- [ ] 7.4 Run full test suite (`npm test`)
