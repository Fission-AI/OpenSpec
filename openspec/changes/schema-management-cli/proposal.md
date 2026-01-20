## Why

Creating and managing project-local schemas currently requires manual directory creation, copying files, and hoping the structure is correct. Users only discover structural errors at runtime when commands fail. This friction discourages schema customization and makes it harder to tailor OpenSpec workflows to specific project needs.

Key pain points:
- **Manual scaffolding**: Users must manually create `openspec/schemas/<name>/` with correct structure
- **No validation feedback**: Schema errors aren't caught until a command tries to use the schema
- **Starting from scratch is hard**: No easy way to base a custom schema on an existing one
- **Debugging resolution**: When a schema doesn't resolve as expected, there's no way to see the resolution path

## What Changes

Add a new `openspec schema` command group with subcommands for creating, forking, validating, and inspecting schemas.

### Commands

1. **`openspec schema init <name>`** - Interactive wizard to scaffold a new project schema
   - Prompts for schema description
   - Prompts for artifacts to include (with explanations)
   - Creates valid directory structure with `schema.yaml` and template files
   - Optionally sets as project default in `openspec/config.yaml`

2. **`openspec schema fork <source> [name]`** - Copy an existing schema as a starting point
   - Copies from user override or package built-in
   - Allows renaming (defaults to `<source>-custom`)
   - Preserves all templates and configuration

3. **`openspec schema validate [name]`** - Validate schema structure and templates
   - Checks `schema.yaml` is valid
   - Verifies all referenced templates exist
   - Reports missing or malformed files
   - Run without name to validate all project schemas

4. **`openspec schema which <name>`** - Show schema resolution path
   - Displays which location the schema resolves from (project/user/package)
   - Shows full path to schema directory
   - Useful for debugging shadowing issues

## Capabilities

### New Capabilities
- `schema-init-command`: Interactive wizard for creating new project schemas with guided prompts
- `schema-fork-command`: Copy existing schemas to project for customization
- `schema-validate-command`: Validate schema structure and report errors before runtime
- `schema-which-command`: Debug schema resolution by showing which location is used

### Modified Capabilities
<!-- None - these are additive commands -->

## Impact

- **Code**: New command implementations in `src/commands/` using existing resolver infrastructure
- **CLI**: New `schema` command group with 4 subcommands
- **Dependencies**: May use `enquirer` or similar for interactive prompts in `schema init`
- **Documentation**: Need to update CLI reference and schema customization guide
