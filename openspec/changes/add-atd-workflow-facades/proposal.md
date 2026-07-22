# Add ATD Workflow Façades

## Why

`atd-change-triage` gives ATD developers a named entry point, but everything after it speaks a different vocabulary: the journey continues through generic `openspec-*` skills (`continue`, `apply`, `verify`, `archive`) whose names say nothing about the ATD journey — and two of them (`continue`, `verify`) are not even in the core profile, so a default install cannot complete the documented journey at all. The generic skills are schema-aware and work correctly; the problem is UX and profile composition, not machinery. The fix is a set of thin ATD-named façades over the existing schema-aware workflows, completing the vocabulary triage started: triage → continue → apply → verify → close.

Depends on `add-atd-sdlc-schema` and `add-atd-sdlc-lite-triage` (the schemas and triage entry point the façades navigate).

## What Changes

- Add four workflow façades alongside the existing `atd-triage`, forming the five-step ATD journey. Each names its position in the journey and composes the corresponding generic workflow from a shared instruction-body builder, adding only ATD schema validation, policy, and hand-off wording. Copied generic workflow bodies are prohibited:
  - `atd-continue` (skill `atd-change-continue`, command `/opsx:atd-continue`): create the next artifact according to the change's selected ATD schema, via the same `openspec status`/`openspec instructions` machinery the generic continue workflow uses.
  - `atd-apply` (skill `atd-change-apply`, command `/opsx:atd-apply`): load the applicable ATD standards and execute the tracked tasks, façade over the generic apply workflow.
  - `atd-verify` (skill `atd-change-verify`, command `/opsx:atd-verify`): verify tests, acceptance criteria, standards conformance, documentation, and closure readiness, façade over the generic verify workflow.
  - `atd-close` (skill `atd-change-close`, command `/opsx:atd-close`): require every tracked task to be complete, including the ATD closure tasks, then run the archive workflow with its delta-spec sync assessment intact. Close is a hard gate, never a second home for closure logic: it surfaces incomplete work and returns to `atd-change-apply`; it never performs publication or Jira closure itself and never offers the generic archive workflow's incomplete-task override.
- Reject non-ATD changes at every façade: only `atd-sdlc` and `atd-sdlc-lite` are accepted; other schemas are directed to the corresponding generic workflow.
- Recompose the fork's CORE_WORKFLOWS as the five `atd-*` workflows plus `explore` and `update` (developers need exploration and artifact revision mid-journey). Generic `propose`, `sync`, `archive`, `continue`, `apply`, and `verify` ids leave core — their ATD façades replace them as the default user-facing vocabulary.
- Generic `openspec-*` workflows remain fully available through the custom profile for maintainers and non-ATD schemas; nothing is removed from ALL_WORKFLOWS.
- Keep the existing `atd-triage` id and `atd-change-triage` skill directory as-is (no rename, no migration); update only its hand-off wording to name `atd-change-continue` as the next step.
- Register every new workflow across the complete registry surface: workflow template module, skill-templates façade export, both generation registries (skills and commands), ALL_WORKFLOWS, CORE_WORKFLOWS, WORKFLOW_TO_SKILL_DIR, and — explicitly, because it was missed once and caught in review — SKILL_NAMES and COMMAND_IDS in tool-detection. Regenerate the committed `skills/` distribution; verify project-local skill and command generation through init/update tests rather than committing ignored `.claude/` output.

## Capabilities

### New Capabilities

- `atd-workflow-facades`: the five-façade ATD journey vocabulary, the thin-façade and close-gate constraints, the core-profile composition, and the registry-completeness rules for shipping a workflow through both delivery paths.

### Modified Capabilities

- `atd-change-triage`: hand-off wording only — triage's final step names `atd-change-continue` instead of the generic continue/apply workflows. Expressed as a requirement inside `atd-workflow-facades` because the `atd-change-triage` spec is itself still an in-flight delta in `add-atd-sdlc-lite-triage`, not yet in main specs.

## Impact

- New: `src/core/templates/workflows/atd-continue.ts`, `atd-apply.ts`, `atd-verify.ts`, `atd-close.ts` (skill + command template per module, following `atd-triage.ts`), each embedding the shared `STORE_SELECTION_GUIDANCE` block and rejecting non-ATD schemas.
- Modified: the generic continue/apply/verify/archive template modules expose shared, parameterized instruction-body builders. Existing generic generated content remains byte-for-byte stable under parity tests; ATD façades compose those builders instead of copying their workflow logic.
- Modified: `src/core/templates/skill-templates.ts` (exports), `src/core/shared/skill-generation.ts` (both registries: 13 → 17 entries each), `src/core/profiles.ts` (ALL_WORKFLOWS 13 → 17; CORE_WORKFLOWS recomposed), `src/core/profile-sync-drift.ts` (WORKFLOW_TO_SKILL_DIR), `src/core/shared/tool-detection.ts` (SKILL_NAMES and COMMAND_IDS 13 → 17), `src/core/templates/workflows/atd-triage.ts` (hand-off wording).
- Regenerated committed artifacts: `skills/` via `scripts/generate-skillssh.mjs`. `.claude/` remains ignored and uncommitted; init/update tests verify its generated core-profile shape (generic `apply`/`archive`/`propose`/`sync` out, `atd-*` in).
- Tests: count assertions bump in `test/core/profiles.test.ts`, `test/core/shared/tool-detection.test.ts`, `test/core/shared/skill-generation.test.ts`; template parity and skills.sh parity tests pick up the new modules; new façade tests follow `test/core/atd-triage-workflow.test.ts`.
- Coordination note (no files modified here): `add-atd-docs-site` (in flight, not yet implemented) documents the developer journey — its flow pages must use the `atd-change-*` vocabulary and five-step journey introduced here. Flagged to that change's owner; this change does not edit it.
- No artifact-graph, resolver, or CLI behavior changes; façades ride the existing instruction/template generation pipeline.
