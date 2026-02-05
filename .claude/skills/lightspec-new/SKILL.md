---
name: lightspec-new
description: Create a new change proposal for tracking work
---

Create a new change proposal to track development work.

## Usage

Use this skill when starting a new feature, bug fix, or any tracked work.

## What This Does

1. Creates a new change directory under `openspec/changes/<name>/`
2. Creates a `.openspec.yaml` metadata file with schema info
3. Optionally adds a README.md with description

## Implementation

Use the CLI command:
```bash
lightspec new change <name> [options]
```

### Options

- `--description <text>`: Description to add to README.md
- `--schema <name>`: Workflow schema to use (default: spec-driven)

### Example

```bash
# Create a new change
lightspec new change add-user-authentication --description "Add OAuth2 authentication"

# Or use default description
lightspec new change refactor-database
```

This creates the change structure and makes it ready for artifact creation.
