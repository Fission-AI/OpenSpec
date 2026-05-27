# Change: Add Spec Commands with JSON Output

## Why

Currently, Pastelsdd specs can only be viewed as markdown files. This makes programmatic access difficult and prevents integration with CI/CD pipelines, external tools, and automated processing.

## What Changes

- Add new `pastelsdd spec` command with three subcommands: `show`, `list`, and `validate`
- Implement JSON output capability for specs using heading-based parsing
- Add Zod schemas for spec structure validation
- Enable content filtering options (requirements only, no scenarios, specific requirement)

## Impact

- **Affected specs**: None (new capability)
- **Affected code**: 
  - src/cli/index.ts (register new command)
  - package.json (add zod dependency)
