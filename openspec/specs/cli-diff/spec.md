# CLI Diff Command Specification

## Purpose

The `openspec diff` command provides developers with a visual comparison between proposed spec changes and the current deployed specs.

## Command Syntax

```bash
openspec diff [change-name]
```

## Behavior

### Without Arguments

@requirement diff-no-arguments
WHEN running `openspec diff` without arguments
THEN list all available changes in the `changes/` directory (excluding archive)
AND prompt user to select a change

### With Change Name

@requirement diff-with-change
WHEN running `openspec diff <change-name>`
THEN compare all spec files in `changes/<change-name>/specs/` with corresponding files in `specs/`

### Diff Output

FOR each spec file in the change:
- IF file exists in both locations THEN show unified diff
- IF file only exists in change THEN show as new file (all lines with +)
- IF file only exists in current specs THEN show as deleted (all lines with -)

### Display Format

@requirement diff-format
The diff SHALL use standard unified diff format:
- Lines prefixed with `-` for removed content
- Lines prefixed with `+` for added content
- Lines without prefix for unchanged context
- File headers showing the paths being compared

### Color Support

@requirement diff-colors
WHEN terminal supports colors:
- Removed lines displayed in red
- Added lines displayed in green
- File headers displayed in bold
- Context lines in default color

### Error Handling

@requirement diff-change-not-found
WHEN specified change doesn't exist THEN display error "Change '<name>' not found"
@requirement diff-no-specs
WHEN no specs directory in change THEN display "No spec changes found for '<name>'"
@requirement diff-no-changes-dir
WHEN changes directory doesn't exist THEN display "No OpenSpec changes directory found"

## Examples

```bash
# View diff for specific change
$ openspec diff add-auth-feature

--- specs/user-auth/spec.md
+++ changes/add-auth-feature/specs/user-auth/spec.md
@@ -10,6 +10,8 @@
 Users SHALL authenticate with email and password.
 
+Users MAY authenticate with OAuth providers.
+
 WHEN credentials are valid THEN issue JWT token.

# List all changes and select
$ openspec diff
Available changes:
  1. add-auth-feature
  2. update-payment-flow
  3. add-status-command
Select a change (1-3): 
```