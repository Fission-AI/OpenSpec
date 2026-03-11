## Context

OpenSpec models supported assistants through a central `AI_TOOLS` registry and shared generation/update flows. New tool support is usually a registry addition plus targeted behavior in init/update detection and summaries. Mistral Vibe discovers skills from `.vibe/skills/` in the project, with optional command extensions, but command file conventions are not currently standardized in OpenSpec.

## Goals / Non-Goals

**Goals:**
- Add first-class `mistral-vibe` support to the existing supported-tools model.
- Generate OpenSpec skills into Vibe’s project-local skills directory.
- Ensure init and update treat Vibe consistently in detection, refresh, and output summaries.
- Keep behavior deterministic when a selected tool has no command adapter.

**Non-Goals:**
- Implement Vibe-specific slash command adapter formats in this change.
- Add global-only Vibe paths or user-home configuration migration logic.
- Redesign init/update UX beyond adding Vibe support to existing flows.

## Decisions

### Decision: Register Mistral Vibe in `AI_TOOLS`
Add a new available tool entry with:
- `value: mistral-vibe`
- `skillsDir: .vibe`
- user-facing labels aligned with existing tool naming conventions.

Rationale:
- `AI_TOOLS` is already the source of truth for selection menus, detection, and path wiring.
- Using `.vibe` aligns with Vibe project-local discovery for skills.

Alternatives considered:
- Inferring support from filesystem heuristics only: rejected because it bypasses explicit supported-tool metadata and weakens deterministic behavior.
- Using a generic `vibe` ID: rejected to keep vendor/tool identity explicit and avoid collisions with other “vibe” integrations.

### Decision: Keep commands adapter optional for Vibe
Treat Vibe like other tools with skill support but potentially no command adapter:
- Skills are generated when selected.
- Command generation is skipped when adapter is absent, with explicit summary messaging.

Rationale:
- Vibe skill support is enough to enable `/opsx:*` workflows through skills.
- OpenSpec already supports adapterless tools (for example, tool entries with skills but no command adapter).

Alternatives considered:
- Block tool selection until command adapter exists: rejected because it would delay useful support.
- Create a placeholder adapter with guessed format: rejected due to high risk of generating invalid command files.

### Decision: Extend update detection through explicit registry lookups
Update mode SHOULD recognize Vibe by checking expected skill locations derived from `AI_TOOLS` + known workflow IDs, then refresh only existing managed files.

Rationale:
- Existing update behavior is conservative and should remain non-destructive.
- Explicit list lookups avoid accidental modifications and match current architecture constraints.

Alternatives considered:
- Recursive pattern scans in `.vibe/`: rejected because they are less predictable and harder to validate cross-platform.

## Risks / Trade-offs

- **[Risk] Users expect Vibe command files to be generated automatically** → Mitigation: show clear output that skills were generated and command generation was skipped due to missing adapter support.
- **[Risk] Tool ID or directory mismatch causes silent non-detection in update** → Mitigation: add integration tests for init + update and configured-tool detection with `.vibe/skills/`.
- **[Risk] Cross-platform path edge cases** → Mitigation: keep path construction centralized with `path.join()` and existing helper utilities.

