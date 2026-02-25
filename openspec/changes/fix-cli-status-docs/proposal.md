## Why

The `docs/cli.md` documentation for the `openspec status` command shows example output (both text and JSON) that doesn't match the actual CLI output. Anyone reading the docs to understand or parse the output will encounter field names and formats that don't exist, making the documentation misleading for both users and integration developers.

## What Changes

- Fix the text output example for `openspec status` to match actual format (`[x]`/`[ ]`/`[-]` indicators, `Progress:` line, `Change:`/`Schema:` headers)
- Fix the JSON output example to use correct field names (`changeName` not `change`, `schemaName` not `schema`, `status: "done"` not `status: "complete"`, `isComplete`, `applyRequires`, `outputPath`, `missingDeps`)
- Remove the non-existent `"next"` field and `"requires"` field from the JSON example

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

_None._ This is a documentation-only fix with no behavioral changes. No spec-level requirements are affected.

## Impact

- `docs/cli.md` — status command examples (text and JSON output sections)
