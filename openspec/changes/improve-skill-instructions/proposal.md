## Why

OpenSpec ships 11 agent skills (`openspec-explore`, `-new-change`, `-continue-change`, `-apply-change`, `-ff-change`, `-sync-specs`, `-archive-change`, `-bulk-archive-change`, `-verify-change`, `-onboard`, `-propose`) plus a feedback skill. They are the primary surface through which agents drive the OpenSpec workflow, so their wording directly determines whether agents trigger the right skill, follow the right steps, and stop at the right place.

An audit of all 11 skill instruction strings surfaced consistent, fixable gaps that mirror what mature agent-skill practice treats as table stakes:

- **Weak trigger disambiguation.** Every description has a "Use when…" clause, but several siblings overlap heavily (`new-change` vs `propose` vs `ff-change` vs `continue-change`). Nothing tells an agent which to pick when more than one fits, so selection is a coin flip.
- **Implicit success criteria.** `explore`, `onboard`, and `feedback` never state an observable "done" condition. An agent cannot tell when the skill has succeeded versus when it has stalled.
- **Failure states without recovery.** `apply-change`, `archive-change`, and `verify-change` describe pause/blocked/error states but not how to resume from them, leaving the agent stranded.
- **Duplication instead of reuse.** Every skill carries a second `CommandTemplate` whose body is 89–100% identical to the skill body for nine of the eleven workflows (`explore` and `archive-change` are the only ones that diverge meaningfully, at 64% and 77%), so each instruction is maintained in two places and drifts. Separately, `propose`'s 78-line body shares 68 lines (87%) verbatim with `ff-change` — the same artifact-creation loop pasted into two skills.
- **Unbounded always-on context.** `onboard` (543 instruction lines), `bulk-archive-change` (237), `verify-change` (160), and `explore` (278) load deep reference material into context every time the skill is read, even when only the core procedure is needed.
- **Inconsistent structure and navigation.** Section taxonomy varies (Steps vs Process vs Stance), and skills rarely point to the next/related skill, so multi-step journeys lack handoffs.

These are not behavioral bugs in any single skill; they are quality-bar gaps that recur across the whole set. This change establishes that quality bar as a written contract and rewrites every skill to meet it.

## What Changes

This change introduces a `skill-authoring-conventions` capability — the contract every generated skill must satisfy — and brings all 11 workflow skills (plus the feedback skill) up to it. **No CLI behavior, skill name, command name, or per-skill behavioral contract changes.** The edits are to instruction wording, structure, and the generation plumbing that emits them.

### 1. Trigger-disambiguated descriptions

Every skill description gains an explicit boundary clause that distinguishes it from its closest siblings (e.g. `propose` = one-shot all-artifacts; `ff-change` = fast-forward to apply-ready; `new-change` = scaffold only, stop; `continue-change` = advance one artifact). The feedback skill gains an explicit "Use when…" trigger.

### 2. Canonical instruction structure

A documented section taxonomy — **Use when / Inputs / Steps / Success / Failure & recovery / Guardrails / Related** — applies to all procedural skills. Two documented variants are preserved: a **stance** shape for `explore` and a **tutorial** shape for `onboard`, which are intentionally non-procedural.

### 3. Explicit success criteria and failure recovery

Each skill states an observable "done when…" condition and, for each named pause/blocked/error state, a concrete "resume by…" path.

### 4. Single-source instruction generation

Each workflow's instruction text is authored once and consumed by both its skill and its command template, eliminating the skill↔command duplication. Shared guidance blocks — store selection (already shared), the change-selection prompt, the artifact-creation loop, and the "context and rules are constraints for YOU" guardrail — are defined once and reused, the way `STORE_SELECTION_GUIDANCE` already is.

### 5. Lean always-loaded body

Deep reference material (conflict-resolution worked examples, the full delta-format reference, the 11-phase onboarding script) is separated from the core procedure so the always-read body stays lean, while the detail remains available where the skill actually needs it.

### 6. Cross-skill navigation

Each skill ends with a Related line pointing to the natural next or sibling skill (e.g. `propose` → `apply`; `verify` → `archive`).

## Capabilities

### New Capabilities

- `skill-authoring-conventions`: The quality contract for generated agent skills — trigger disambiguation, canonical structure, explicit success criteria, named failure recovery, single-source generation, shared-snippet reuse, lean always-on body, and cross-skill navigation.

### Modified Capabilities

None. Per-skill behavioral specs (`opsx-verify-skill`, `opsx-onboard-skill`, `opsx-archive-skill`, `specs-sync-skill`) keep their existing contracts; this change tightens how the instructions are written, not what the skills do.

## Impact

- `src/core/templates/workflows/*.ts` — rewrite the 11 workflow instruction strings (and feedback) to the new conventions; collapse each skill/command pair onto one instruction source.
- `src/core/templates/workflows/store-selection.ts` (and likely new sibling snippet modules) — house the shared change-selection, artifact-loop, and context/rules guardrail blocks.
- `src/core/shared/skill-generation.ts` / `src/core/templates/skill-templates.ts` — adjust the assembly so skill and command derive from one source.
- `openspec/specs/skill-authoring-conventions/` — new capability spec created on archive.
- `test/` — assertions that every generated skill carries the required sections and that skill/command shared regions stay in sync; regression coverage for `init`/`update` skill generation across platforms.

## Non-Goals

- Renaming, adding, or removing skills or commands.
- Changing any CLI command, flag, or JSON output.
- Changing the behavioral contract of any individual skill.
