# Design

## Context

The 11 workflow skills live in `src/core/templates/workflows/*.ts`. Each module exports two builders: `get<Workflow>SkillTemplate()` returning a `SkillTemplate` (used to write the on-disk skill with YAML frontmatter via `generateSkillContent`) and `get<Workflow>CommandTemplate()` returning a `CommandTemplate` (used for slash-command files). Today the two share most of their prose by copy, not by reference. `STORE_SELECTION_GUIDANCE` (in `store-selection.ts`) is the one block already factored out and interpolated into every skill — it is the proven pattern this change extends.

The skill is read into the agent's context whenever it is selected, so instruction wording is a runtime cost and a correctness lever at the same time. The audit findings are quality-bar gaps, not isolated bugs, which is why the fix is a single shared contract applied uniformly rather than 11 independent edits.

### Audit evidence

Measured from the current instruction strings (skill body vs. its command body; instruction line counts):

| Skill | Instr. lines | Skill↔command overlap | Notable finding |
|---|---|---|---|
| onboard | 543 | shared via helper | Largest always-on body; full 11-phase script inline |
| explore | 278 | 64% | Stance shape; lowest command overlap |
| bulk-archive-change | 237 | 100% | Conflict-resolution worked examples inline |
| verify-change | 160 | 99% | Three-dimension reference inline; success implicit |
| apply-change | 148 | 96% | Pause/blocked/error states without recovery |
| sync-specs | 136 | 99% | Full delta-format reference inline |
| continue-change | 110 | 96% | Deeply nested Step 3 decision tree |
| archive-change | 106 | 77% | Nested warning logic; no recovery paths |
| propose | 102 | 96% | Body 87% identical to `ff-change` |
| feedback | 98 | n/a (skill only) | No "use when" trigger |
| ff-change | 93 | 93% | — |
| new-change | 65 | 89% | — |

The recurrence of the same gaps across rows is what motivates a single contract rather than per-skill edits.

## Goals

- One written quality bar (`skill-authoring-conventions`) that every generated skill demonstrably meets.
- Each instruction maintained in exactly one place.
- Leaner always-on context without losing the depth skills like `verify` and `bulk-archive` rely on.
- Zero change to observable skill behavior, names, or CLI surface.

## Authoring principles

Drawn from established agent-skill practice, restated as rules this codebase can enforce:

1. **Disambiguate at the trigger.** A description that says when to use a skill but not how it differs from its neighbors forces a guess. Each description names the boundary against its closest siblings.
2. **State done explicitly.** Procedures must carry an observable completion check, not an implied one. "Done when all `applyRequires` artifacts report `done`" beats "continue until finished."
3. **Pair every failure with a recovery.** A named pause/blocked/error state is only useful if the agent knows the move that clears it.
4. **Single source of truth.** Any text that appears in two artifacts (skill + command) or across skills (selection prompt, artifact loop, guardrail) is defined once and referenced.
5. **Progressive disclosure.** The always-read body holds the core procedure; worked examples and long reference tables sit in clearly separated sections the agent consults on demand.
6. **Navigable.** Each skill points to the next/related skill so multi-step journeys have explicit handoffs.

## Canonical structure

Procedural skills (`new-change`, `continue-change`, `apply-change`, `ff-change`, `sync-specs`, `archive-change`, `bulk-archive-change`, `verify-change`, `propose`, `feedback`) follow:

```
Use when     — one line; includes the sibling boundary
Inputs       — what the skill expects (and the no-input fallback)
Steps        — numbered procedure
Success      — observable "done when…" condition
Failure & recovery — each named failure state + how to resume
Guardrails   — anti-patterns ("Do NOT …")
Related      — next/sibling skill
```

Two intentional variants are preserved rather than forced into the procedural shape:

- **Stance** (`explore`): keeps Stance / What You Might Do / OpenSpec Awareness / Guardrails. Its "Success" is reframed as a clear exit condition ("when the thinking has produced a decision or a next step"), satisfying the explicit-completion rule without imposing steps on a non-procedural skill.
- **Tutorial** (`onboard`): keeps its phase walkthrough. Its phase script is the deep-reference material moved out of the always-on body (principle 5); the lean body is the phase list plus the EXPLAIN → DO → SHOW → PAUSE contract.

## Deduplication strategy

- **Skill ↔ command.** Author one instruction string per workflow; the command builder reuses it, applying only command-specific framing (the `/opsx:<name>` invocation note and command metadata). This removes the 89–100% body duplication across the nine high-overlap pairs and folds `explore` and `archive-change` onto the same single-source model.
- **Cross-skill snippets.** Promote three repeated blocks to shared constants beside `STORE_SELECTION_GUIDANCE`:
  - `CHANGE_SELECTION_GUIDANCE` — the "list → prompt with AskUserQuestion → never auto-select → mark most-recent as Recommended" pattern used by six skills.
  - `ARTIFACT_LOOP_GUIDANCE` — the read-instructions / read-dependencies / write-to-`resolvedOutputPath` / verify loop used by the artifact-creating skills.
  - `CONTEXT_RULES_GUARDRAIL` — the "context and rules are constraints for YOU, not content for the file" block.

`propose` stops duplicating `ff-change`'s loop and references `ARTIFACT_LOOP_GUIDANCE` instead; the two stay distinct only in which artifacts they target.

## Worked examples

These illustrate the contract; exact wording is settled during implementation.

**Trigger disambiguation — the create-a-change family.** Four skills currently invite the same request ("I want to build X") with no stated boundary:

- `new-change` today: "Use when the user wants to create a new feature, fix, or modification with a structured step-by-step approach."
- `propose` today: "Use when the user wants to … get a complete proposal with design, specs, and tasks ready for implementation."
- `ff-change` today: "Use when the user wants to quickly create all artifacts needed for implementation."
- `continue-change` today: "Use when the user wants to progress their change, create the next artifact, or continue their workflow."

Rewritten with explicit boundaries an agent can decide on:

- `new-change`: "Scaffold the change directory only, then stop — no artifacts. Use when the user wants to name a change before generating anything. For artifacts in one pass, use `propose`."
- `propose`: "Create the change and generate proposal, design, and tasks in one pass. Use when the user describes what to build and wants an apply-ready result without stepping through artifacts. To advance an existing change one artifact at a time, use `continue-change`."
- `ff-change`: "Fast-forward an existing change to apply-ready by generating every remaining required artifact. Use when the change exists but artifacts are missing. To create the change and artifacts together from scratch, use `propose`."
- `continue-change`: "Generate the single next artifact in dependency order, then stop for review. Use when advancing a change one deliberate step at a time."

**Explicit success criteria — `verify-change`.** Today the skill ends with a report format but no completion condition. Add: "**Success:** every requirement in the delta specs is mapped to passing/failing evidence, every task line is accounted for, and the scorecard lists each dimension with at least one CRITICAL/WARNING/SUGGESTION or an explicit pass."

**Failure & recovery — `apply-change`.** Today it names a "blocked" state but not the exit. Add: "**If blocked** (a task's requirement is ambiguous): stop, state the specific ambiguity, and use AskUserQuestion to resolve it; resume the same task once answered. **If a task fails verification:** leave it unchecked, record why, and continue to independent tasks rather than aborting the run."

## Decisions

- **New capability, not modifications to per-skill specs.** The improvements are about how instructions are written, which is a cross-cutting contract. Only 4 of 11 skills have specs today, so editing those four would leave the bar unstated for the rest. A single `skill-authoring-conventions` capability states the bar once, for all skills, and is verifiable against generated output.
- **Behavior-first requirements.** Requirements assert observable properties of generated skills (a description disambiguates; a body declares success; shared text appears once), per `openspec/config.yaml`. The mechanics — which constant holds which block — live here in design, not in the spec.
- **No behavioral drift.** Because per-skill contracts are unchanged, existing per-skill spec tests remain the guardrail that the rewrites did not alter behavior.

## Alternatives considered

- **Edit each skill independently, no shared contract.** Rejected: the gaps recur, so the fix would drift again without a stated bar and a test that enforces it.
- **Modify each per-skill spec to add success/failure language.** Rejected: leaves the 7 unspecced skills uncovered and scatters one contract across many files.
- **Collapse skill and command into a single artifact.** Out of scope: they are distinct delivery surfaces (`tool-command-surface`); this change only makes them share a source, not merge.

## Cross-platform

Instruction content is platform-neutral prose. The only code touched that writes files is the generation assembly, which already uses `path` utilities. Tasks include a regression pass of `init`/`update` skill generation so shared-source refactoring does not change emitted paths or file contents across macOS, Linux, and Windows.

## Risks

- **Over-trimming verbose skills** could drop guidance an agent relies on. Mitigation: move detail to separated sections (progressive disclosure), do not delete it; per-skill behavioral specs catch regressions.
- **Shared snippets hiding skill-specific nuance.** Mitigation: snippets cover only the genuinely identical blocks; skill-specific wording stays inline.
