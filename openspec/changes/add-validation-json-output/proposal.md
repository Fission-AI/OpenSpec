## Why
Current validation output is designed for human consumption but lacks structured data that tools and scripts can easily parse. Adding JSON output support will enable better integration with CI/CD pipelines, IDE extensions, and automated tooling.

## What Changes
- Add a `--json` flag to the `openspec validate` command that outputs validation results in structured JSON format
- Update validation logic to include detailed error information, file paths, and line numbers in JSON output
- Document the JSON output format in the CLI documentation

## Impact
- Affected specs: `specs/cli-validate`
- Affected code: `src/commands/validate.ts`, `src/cli/index.ts`, documentation