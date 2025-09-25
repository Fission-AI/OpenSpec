# Update Markdown Parser CRLF Handling

## Problem
Windows users report that `openspec validate` raises “Change must have a Why section” even when the section exists (see GitHub issue #77). The CLI currently splits markdown on `\n` and compares headers without stripping `\r`, so files saved with CRLF line endings keep a trailing carriage return in the header token. As a result the parser fails to detect `## Why`/`## What Changes`, triggering false validation errors and breaking the workflow on Windows-default editors.

## Solution
- Normalize markdown content inside the parser so CRLF and lone-CR inputs are treated as `\n` before section detection, trimming any carriage returns from titles and content comparisons.
- Reuse the normalized reader everywhere `MarkdownParser` is constructed to keep behavior consistent for validation, view, spec, and list flows.
- Add regression coverage that reproduces the failure (unit test around `parseChange` and a CLI spawn/e2e test that writes a CRLF change then runs `openspec validate`).
- Update the `cli-validate` spec to codify the expectation that required sections are recognized regardless of line-ending style.

## Benefits
- Restores correct validation behavior for Windows editors without requiring manual line-ending conversion.
- Locks in the fix with targeted tests so future parser refactors keep cross-platform support.
- Clarifies the spec so downstream work (e.g., cross-shell e2e plan) understands the non-negotiable behavior.

## Risks
- Low: parser normalization touches shared code paths that parse specs and changes; need to ensure no regressions in other command consumers (mitigated by existing parser tests plus the new CRLF fixtures).

