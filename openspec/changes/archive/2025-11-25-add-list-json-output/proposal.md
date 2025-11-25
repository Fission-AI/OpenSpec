## Why
Human-readable tables from `openspec list` force brittle parsing for CI, dashboards, and scripts needing change progress and spec requirement counts. A native JSON output flag provides structured data for automation without breaking existing usage.

## What Changes
- Extend `cli-list` spec: add Output Format requirement for machine-readable JSON.
- Add `--json` flag to `openspec list` returning arrays of objects instead of table.
- Changes mode JSON item: `{ name, completedTasks, totalTasks }`.
- Specs mode JSON item: `{ id, requirementCount }`.
- Empty results with `--json` produce `[]` (no error) to simplify scripting.
- Document flag usage (README + agent guidance quick examples).
- Add tests for both modes ensuring structure + counts.

## Impact
- Affected spec: `cli-list` (new requirement section + scenarios).
- Affected code: `src/cli/index.ts`, `src/core/list.ts`, test additions.
- Backwards compatible (default table unchanged).
