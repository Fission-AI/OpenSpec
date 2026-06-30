# Design

## Context

The 11 workflow skills live in `src/core/templates/workflows/*.ts`. Each module exports two builders: `get<Workflow>SkillTemplate()` returning a `SkillTemplate` (used to write the on-disk skill with YAML frontmatter via `generateSkillContent`) and `get<Workflow>CommandTemplate()` returning a `CommandTemplate` (used for slash-command files). Today the two share most of their prose by copy, not by reference. `STORE_SELECTION_GUIDANCE` (in `store-selection.ts`) is the one block already factored out and interpolated into every skill — it is the proven pattern this change extends.

The skill is read into the agent's context whenever it is selected, so instruction wording is a runtime cost and a correctness lever at the same time. The audit findings are quality-bar gaps, not isolated bugs, which is why the fix is a single shared contract applied uniformly rather than 11 independent edits.

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

- **Skill ↔ command.** Author one instruction string per workflow; the command builder reuses it, applying only command-specific framing (the `/opsx:<name>` invocation note and command metadata). This removes the ~98% (and `propose`'s ~90%) byte duplication.
- **Cross-skill snippets.** Promote three repeated blocks to shared constants beside `STORE_SELECTION_GUIDANCE`:
  - `CHANGE_SELECTION_GUIDANCE` — the "list → prompt with AskUserQuestion → never auto-select → mark most-recent as Recommended" pattern used by six skills.
  - `ARTIFACT_LOOP_GUIDANCE` — the read-instructions / read-dependencies / write-to-`resolvedOutputPath` / verify loop used by the artifact-creating skills.
  - `CONTEXT_RULES_GUARDRAIL` — the "context and rules are constraints for YOU, not content for the file" block.

`propose` stops duplicating `ff-change`'s loop and references `ARTIFACT_LOOP_GUIDANCE` instead; the two stay distinct only in which artifacts they target.

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
