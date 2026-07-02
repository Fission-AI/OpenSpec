---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Requirement reading fidelity** — The requirement reader used by `validate <change>`, `validate <spec>`, and `archive` is now unified into one fence-, metadata-, and multi-line-aware extraction, closing the known divergences between the change-delta path and the main-spec path (the remaining ones are documented in the change's design doc):
  - A `SHALL`/`MUST` keyword that wraps onto a later body line is detected instead of dropped (#361).
  - Metadata lines (`**ID**:`, `**Priority**:`) before the description are skipped on the spec path, matching the change path (#418). A requirement written entirely as metadata (e.g. `**Constraint**: The system MUST ...`) keeps that line as its text instead of being emptied.
  - A fenced code block before the prose line no longer becomes the requirement text (#312).
  - A `#### Scenario:` inside a fenced example no longer counts as a real scenario in `validate <change>`, matching `validate <spec>`.
  - `SHALL`/`MUST` detection uses one whole-word predicate across all readers, and a requirement with no body text falls back to its header title on both paths.

  Displayed requirement text (e.g. in JSON output and delta descriptions) now reflects the full requirement body rather than only its first line. Archived spec content is unchanged — the archive rebuild reads raw `### Requirement:` blocks, not the parsed text.

- **Surface non-canonical delta headers** — `validate <change>` now emits an INFO note when an `## ADDED`/`## MODIFIED Requirements` section contains a level-3 header that is not a canonical `### Requirement:` header (one the delta reader silently skips, such as a stray `### Documentation Requirements` divider). The note never changes the `valid` result, including under `--strict` (#498).
