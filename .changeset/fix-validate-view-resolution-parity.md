---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **`validate` resolves changes like `status`** — `openspec validate <change>` (and `--all`/`--changes` and the interactive selector) now resolves a change by directory existence, matching `status`/`instructions`, instead of requiring `proposal.md`. A scaffolded or still-authoring change is validated rather than reported as `Unknown item`, and a resolved-but-invalid change now exits non-zero. Delta discovery also recurses the nested `specs/<area>/<capability>/spec.md` layout. (#1182)
- **Task progress reads nested/glob `tasks.md`** — `openspec view`, `list`, and the `archive` incomplete-task gate now resolve task progress through the tracked-tasks artifact's `generates` glob (the same file-resolution `status` uses), so a change whose tasks live in nested `tasks.md` files is classified correctly and can no longer archive while unfinished. (#1202)
- **SHALL/MUST body-keyword hint applies to main specs** — A main-spec requirement whose normative keyword sits only in the `### Requirement:` header now receives the same targeted "move it to the body line" remediation as a change delta, emitted exactly once. (#1156)
