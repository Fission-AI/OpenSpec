## Why

OpenSpec ships 11 agent skills (`openspec-explore`, `-new-change`, `-continue-change`, `-apply-change`, `-ff-change`, `-sync-specs`, `-archive-change`, `-bulk-archive-change`, `-verify-change`, `-onboard`, `-propose`) plus a feedback skill. They are the primary surface through which agents drive the OpenSpec workflow, so their wording directly determines whether agents trigger the right skill, follow the right steps, and stop at the right place.

An audit of all 11 skill instruction strings surfaced consistent, fixable gaps that mirror what mature agent-skill practice treats as table stakes:

- **Weak trigger disambiguation.** Every description has a "Use when…" clause, but several siblings overlap heavily (`new-change` vs `propose` vs `ff-change` vs `continue-change`). Nothing tells an agent which to pick when more than one fits, so selection is a coin flip.
- **Implicit success criteria.** `explore`, `onboard`, and `feedback` never state an observable "done" condition. An agent cannot tell when the skill has succeeded versus when it has stalled.
- **Failure states without recovery.** `apply-change`, `archive-change`, and `verify-change` describe pause/blocked/error states but not how to resume from them, leaving the agent stranded.
- **Duplication instead of reuse.** Every skill carries a second `CommandTemplate` whose body is 89–100% identical to the skill body for nine of the eleven workflows (`explore` and `archive-change` are the only ones that diverge meaningfully, at 64% and 77%), so each instruction is maintained in two places and drifts. Separately, `propose`'s 78-line body shares 68 lines (87%) verbatim with `ff-change` — the same artifact-creation loop pasted into two skills.
- **Unbounded always-on context.** `onboard` (543 instruction lines), `bulk-archive-change` (237), `verify-change` (160), and `explore` (278) load deep reference material into context every time the skill is read, even when only the core procedure is needed.
- **Inconsistent structure and navigation.** Section taxonomy varies (Steps vs Process vs Stance), and skills rarely point to the next/related skill, so multi-step journeys lack handoffs.
- **Spec-authoring guidance missing from the skills.** The docs state plainly what belongs in a spec — observable behavior, inputs/outputs/error conditions, testable scenarios — and what to keep out — internal class/function names, library choices, step-by-step implementation (`docs/concepts.md`, "What a Spec Is (and Is Not)"). None of that reaches the skills that actually draft specs (`propose`, `ff-change`, `continue-change`, `sync-specs`), so an agent following them writes implementation-laden specs unless a human separately pastes the rules in (#1289).

These are not behavioral bugs in any single skill; they are quality-bar gaps that recur across the whole set. This change establishes that quality bar as a written contract and rewrites every skill to meet it.

Beyond internal quality, OpenSpec's skills should be first-class citizens of the **Agent Skills open standard** — the `SKILL.md` format that 30+ agent products now read. OpenSpec already emits one `SKILL.md` per skill folder under `<tool>/skills/<name>/`, and all 11 skill names already satisfy the standard's naming rules (lowercase, hyphenated, no consecutive hyphens, folder name equal to `name`). Three things still stand between OpenSpec and a clean public listing:

- **Body-size budget.** The standard recommends a `SKILL.md` body under 500 lines / ~5000 tokens, with overflow moved to `references/` files loaded on demand. `onboard` (543 lines) exceeds this; others crowd it.
- **No conformance check.** Nothing validates the generated skills against the standard, so a malformed frontmatter or an over-budget body would ship silently.
- **No publishable, listable bundle.** There is no validated skill collection an agent-skill directory could index, and no listing path.

The unifying goal: every agent — whether it loads `SKILL.md` skills or only reads project-level `AGENTS.md` — is steered onto OpenSpec's deterministic CLI (`openspec status/instructions/validate …`) and away from guesswork. This change makes the skills conform to the standard, validates them, prepares a listable bundle, and ensures the always-on project instructions advertise the same workflow.

## What Changes

This change introduces a `skill-authoring-conventions` capability — the contract every generated skill must satisfy — and brings all 11 workflow skills (plus the feedback skill) up to it. **No CLI behavior, skill name, command name, or per-skill behavioral contract changes.** The edits are to instruction wording, structure, and the generation plumbing that emits them.

### 1. Trigger-disambiguated descriptions

Every skill description gains an explicit boundary clause that distinguishes it from its closest siblings (e.g. `propose` = one-shot all-artifacts; `ff-change` = fast-forward to apply-ready; `new-change` = scaffold only, stop; `continue-change` = advance one artifact). The feedback skill gains an explicit "Use when…" trigger.

### 2. Canonical instruction structure

A documented section taxonomy — **Use when / Inputs / Steps / Success / Failure & recovery / Guardrails / Related** — applies to all procedural skills. Two documented variants are preserved: a **stance** shape for `explore` and a **tutorial** shape for `onboard`, which are intentionally non-procedural.

### 3. Explicit success criteria and failure recovery

Each skill states an observable "done when…" condition and, for each named pause/blocked/error state, a concrete "resume by…" path.

### 4. Single-source instruction generation

Each workflow's instruction text is authored once and consumed by both its skill and its command template, eliminating the skill↔command duplication. Shared guidance blocks — store selection (already shared), the change-selection prompt, the artifact-creation loop, the "context and rules are constraints for YOU" guardrail, and the spec-content guidance (item 12) — are defined once and reused, the way `STORE_SELECTION_GUIDANCE` already is.

### 5. Lean always-loaded body

Deep reference material (conflict-resolution worked examples, the full delta-format reference, the 11-phase onboarding script) is separated from the core procedure so the always-read body stays lean, while the detail remains available where the skill actually needs it.

### 6. Cross-skill navigation

Each skill ends with a Related line pointing to the natural next or sibling skill (e.g. `propose` → `apply`; `verify` → `archive`).

### 7. Agent Skills standard conformance

Every generated skill is brought to full conformance with the Agent Skills open standard: valid `SKILL.md` frontmatter (`name` 1–64 chars and equal to the folder; `description` ≤ 1024 chars stating what + when; `compatibility` ≤ 500 chars), and a body within the recommended size budget. `onboard`'s phase script, `bulk-archive-change`'s conflict-resolution examples, `sync-specs`'s delta-format reference, and `verify-change`'s dimension detail move into per-skill `references/` files that the body links to one level deep. This is the standard's own mechanism for the "lean always-on body" of item 5 — the two are the same requirement, now anchored to a published budget.

Scope: conformance, `allowed-tools`, and the publishable bundle (items 7–9, 11) apply to the **11 generated `SKILL.md` skills**. The feedback skill is held to the authoring quality bar (items 1–6) but is not emitted to disk as a distributed `SKILL.md`, so the conformance/distribution requirements do not target it.

### 8. Conformance validation gate

Skill generation and `openspec update` validate each emitted skill against the standard (frontmatter validity, name/description/compatibility limits, `name` == folder, body within budget) and fail on violation, so a non-conformant skill cannot ship. The same check runs in CI.

### 9. Publishable, listable skill bundle

Produce a standard-conformant, validated collection of the OpenSpec skills suitable for submission to a public Agent Skills directory, with a documented listing checklist (validation pass, license, metadata, submission steps). This makes OpenSpec discoverable to agents that install skills from a directory rather than via the CLI.

### 10. Always-on agent guidance

Ensure the project-level agent instructions (`openspec/AGENTS.md`, governed by `docs-agent-instructions`) name the skills and the core deterministic CLI commands and say when to use each — so agents that read only `AGENTS.md` (no skill loading) still drive the OpenSpec workflow correctly.

### 11. Pre-approved tools (`allowed-tools`)

Each skill declares the tools it uses and emits the standard's `allowed-tools` frontmatter, so supporting agents pre-approve the deterministic CLI and stop prompting on every `openspec` call — the single biggest friction point today. The field is generated from one declared toolset per skill (not hand-written), `Bash` is scoped to `Bash(openspec:*)` for skills that only invoke the CLI, and the declared set is the complete superset of what the body uses so that agents which enforce `allowed-tools` as a strict allowlist never block a needed tool. `apply-change` (and `onboard`'s live demo), which run arbitrary build/test commands, keep unrestricted `Bash` by design. Agents that ignore the field are unaffected, so adoption is pure upside.

### 12. Embedded spec-content guidance

Every skill that drafts or updates spec deltas (`propose`, `ff-change`, `continue-change`, `sync-specs`) embeds a concise "what belongs in a spec vs. what to keep out" block, sourced once from the "What a Spec Is (and Is Not)" guidance in `docs/concepts.md` and reused as a shared snippet. An agent following these skills then writes behavior contracts — observable behavior, inputs/outputs/error conditions, testable scenarios — and keeps implementation detail (class/function names, library choices, execution plans) out of the spec, without a human having to restate the rules (#1289). Sourcing it from one snippet keeps the skills and the docs from drifting.

## Capabilities

### New Capabilities

- `skill-authoring-conventions`: The quality and conformance contract for generated agent skills — trigger disambiguation, canonical structure, explicit success criteria, named failure recovery, single-source generation, shared-snippet reuse (including embedded spec-content guidance for the spec-authoring skills), lean always-on body, cross-skill navigation, Agent Skills standard conformance, declared pre-approved tools (`allowed-tools`), and a conformance validation gate.
- `skill-distribution`: A standard-conformant, validated, publishable bundle of the OpenSpec skills plus the readiness contract for listing them in a public Agent Skills directory.

### Modified Capabilities

- `docs-agent-instructions`: The maintained project agent instructions (`openspec/AGENTS.md`) name the skills and core deterministic CLI commands and state when to use each, so non-skill-loading agents follow the same workflow.

Per-skill behavioral specs (`opsx-verify-skill`, `opsx-onboard-skill`, `opsx-archive-skill`, `specs-sync-skill`) keep their existing contracts; this change tightens how the instructions are written and packaged, not what the skills do.

## Impact

- `src/core/templates/workflows/*.ts` — rewrite the 11 workflow instruction strings (and feedback) to the new conventions; collapse each skill/command pair onto one instruction source; split over-budget bodies so the deep material can be emitted as `references/` files.
- `src/core/templates/workflows/store-selection.ts` (and likely new sibling snippet modules) — house the shared change-selection, artifact-loop, and context/rules guardrail blocks.
- `src/core/shared/skill-generation.ts` / `src/core/templates/skill-templates.ts` — single-source skill/command assembly; emit any per-skill `references/` files alongside `SKILL.md`.
- `src/core/shared/tool-detection.ts` / `src/core/update.ts` — run the conformance validation gate during generation/update without changing directory layout or delivery behavior.
- `openspec/AGENTS.md` — populate with skill + CLI guidance per `docs-agent-instructions`.
- `openspec/specs/skill-authoring-conventions/` and `openspec/specs/skill-distribution/` — new capability specs created on archive.
- `test/` and CI — assert every generated skill carries the required sections, passes standard conformance, and that skill/command shared regions stay in sync; regression coverage for `init`/`update` skill generation across platforms.

## Sequencing notes

- **`add-tool-command-surface-capabilities`** (in flight) makes skill generation/removal delivery-aware (`adapter` / `skills-invocable` / `none`). This change is deliberately orthogonal: it changes skill *content, format conformance, and validation* — not directory layout, not which tools get skills, not delivery behavior. The conformance gate validates whatever skills that change decides to emit. If it merges first, this change rebases and validates the capability-aware output; if this merges first, that change inherits the gate unchanged.
- **`simplify-skill-installation`** (profile/delivery UX) does not touch skill content or layout; no expected collision.

## Non-Goals

- Renaming, adding, or removing skills or commands.
- Changing any CLI command, flag, JSON output, skill directory layout, or delivery behavior.
- Changing the behavioral contract of any individual skill.
- Automating directory submission (the listing step is a documented manual checklist; directories apply their own curation/security review).
