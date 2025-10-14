## Why
Validation errors like "no deltas found" or "missing requirement text" do not tell agents how to recover, leading to repeated failures. Making error output specific about headers, required text, and next actions will help assistants fix issues in a single pass.

## What Changes
- Extend `openspec validate` error reporting so each failure names the exact header, file, and expected structure, including concrete examples of compliant Markdown.
- Tailor messages for the most common mistakes (missing delta sections, absent descriptive requirement text, missing scenarios) with actionable fixes and suggested debug commands.
- Update docs/help output so the improved messaging is discoverable (e.g., `--help`, troubleshooting section).
- Add regression coverage to lock in the richer messaging for the top validation paths.

## Impact
- Affected specs: `specs/cli-validate`
- Affected code: `src/commands/validate.ts`, `src/core/validation`, `docs/`
