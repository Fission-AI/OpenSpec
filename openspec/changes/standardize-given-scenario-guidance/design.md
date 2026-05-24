## Context

OpenSpec's conventions already name `GIVEN` as a scenario keyword, but the default spec template and schema instructions use `WHEN`/`THEN` examples. That means newly generated specs can drift away from the richer Given/When/Then shape even when docs describe it.

## Goals / Non-Goals

**Goals:**
- Make `GIVEN` visible in the default spec-writing path.
- Keep this change limited to templates, generated instructions, and guidance examples.
- Preserve compatibility with existing specs that omit `GIVEN`.

**Non-Goals:**
- Do not parse scenario steps into structured fields.
- Do not add validation warnings or errors for missing `GIVEN`.
- Do not rewrite the existing spec corpus.

## Decisions

- Update guidance before enforcement. This aligns generated content with the convention without causing noise in existing projects.
- Keep `GIVEN` non-breaking. The convention should encourage precondition clarity, but not require artificial preconditions where none exist.
- Update built-in schema templates and workflow examples that generate spec guidance so repo-local, workspace-planning, and sync flows teach the same structure.

## Risks / Trade-offs

- Existing examples remain mixed until separate cleanup work updates the full corpus. Mitigation: update the source templates and validation guidance first so new artifacts improve immediately.
- Agents may add vague `GIVEN` steps for simple scenarios. Mitigation: phrase guidance as initial state or preconditions rather than forcing a redundant placeholder.
