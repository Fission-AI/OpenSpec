# Change: Add Change Commands with JSON Output

## Why

Pastelsdd change proposals currently can only be viewed as markdown files, creating the same programmatic access limitations as specs. Additionally, the current `pastelsdd list` command only lists changes, which is inconsistent with the new resource-based command structure.

## What Changes

- **cli-change:** Add new command for managing change proposals with show, list, and validate subcommands
- **cli-list:** Add deprecation notice for legacy list command to guide users to the new change list command

## Impact

- **Affected specs**: cli-list (modify to add deprecation notice)
- **Affected code**:
  - src/cli/index.ts (register new command)
  - src/core/list.ts (add deprecation notice)