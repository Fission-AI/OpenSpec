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
- Self-contained skills that can be rewritten independently, with shared *conventions* (not procedure) living in a `references/` file the skills link to.
- Guidance-first instructions: behavior and decision criteria in the body, deep or exact steps in `references/`.
- Leaner always-on context without losing the depth skills like `verify` and `bulk-archive` rely on.
- Zero change to observable skill behavior, names, or CLI surface.

## Authoring principles

Drawn from established agent-skill practice, restated as rules this codebase can enforce:

1. **Disambiguate at the trigger.** A description that says when to use a skill but not how it differs from its neighbors forces a guess. Each description names the boundary against its closest siblings.
2. **State done explicitly.** Procedures must carry an observable completion check, not an implied one. "Done when all `applyRequires` artifacts report `done`" beats "continue until finished."
3. **Pair every failure with a recovery.** A named pause/blocked/error state is only useful if the agent knows the move that clears it.
4. **Self-contained, conventions by reference.** Each skill reads and rewrites on its own; cross-skill duplication is intentional (the cost of independence), so skills are not coupled to a shared instruction source. Shared *conventions* (how to write a proposal, what belongs in a spec) live in a `references/` file the skills link to — consistency from a reference agents read, not from DRY interpolation.
5. **Guidance over choreography.** Skills express behavior and decision criteria, not long "if this then that" step trees. Exact or deep procedure moves into `references/`.
6. **Progressive disclosure.** The always-read body holds the core guidance; worked examples and long reference tables sit in clearly separated `references/` files the agent consults on demand.
7. **Navigable.** Each skill points to the next/related skill so multi-step journeys have explicit handoffs.

## Canonical structure

Procedural skills (`new-change`, `continue-change`, `apply-change`, `ff-change`, `sync-specs`, `archive-change`, `bulk-archive-change`, `verify-change`, `propose`, `feedback`) follow:

```
Use when     — one line; includes the sibling boundary
Inputs       — what the skill expects (and the no-input fallback)
Guidance     — behavior and decision criteria (deep/exact steps → references)
Success      — observable "done when…" condition
Failure & recovery — each named failure state + how to resume
Guardrails   — anti-patterns ("Do NOT …")
Related      — next/sibling skill
```

The Guidance section favors decision criteria over long "if this then that" trees: it tells the agent what outcome to reach and how to decide, and links to a `references/` file for any exact or lengthy procedure. This keeps the always-on body short and the skill easy to rewrite.

Two intentional variants are preserved rather than forced into the procedural shape:

- **Stance** (`explore`): keeps Stance / What You Might Do / OpenSpec Awareness / Guardrails. Its "Success" is reframed as a clear exit condition ("when the thinking has produced a decision or a next step"), satisfying the explicit-completion rule without imposing steps on a non-procedural skill.
- **Tutorial** (`onboard`): keeps its phase walkthrough. Its phase script is the deep-reference material moved out of the always-on body (principle 5); the lean body is the phase list plus the EXPLAIN → DO → SHOW → PAUSE contract.

## Self-contained skills and shared references

Skills are deliberately **self-contained**: each is meant to be read and rewritten on its own, so the skill↔command overlap the audit measured (89–100% for nine of eleven pairs) and `propose` repeating 87% of `ff-change`'s loop are intentional, not defects. This change does **not** couple skills to a shared instruction source or extract their procedure into DRY string constants — that coupling would make every skill harder to rewrite in isolation. The existing `STORE_SELECTION_GUIDANCE` block is left as-is; it is not a precedent this change extends.

What *is* shared is **conventions**, and they live in a `references/` file rather than inline in each skill:

- **Authoring-conventions reference (the proposal-writing reference).** One reference file captures how to write a proposal and its spec deltas; the artifact-drafting skills (`propose`, `ff-change`, `continue-change`, `sync-specs`) link to it instead of each re-encoding the rules. A self-contained skill body stays short — it points the agent to the reference for the conventions and keeps only its own decision guidance inline.

This is the same mechanism as items 5–7 (progressive disclosure into `references/`), applied to authoring conventions: shared where it should be shared (a reference agents read), self-contained where it should be self-contained (each skill's own body).

## Authoring-conventions reference (docs → skills)

#1289 is one instance of a broader gap: guidance that shapes *artifact quality* lives only in `docs/` and never reaches the skills that draft artifacts, so an agent following a skill can't apply it. A doc-vs-skill audit (docs `concepts.md`/`agent-contract.md`/`workflows.md`/`editing-changes.md`/`explore.md` against the workflow templates, gaps confirmed by grep) surfaced these doc-only rules, all now captured in the authoring-conventions reference:

| Doc-only guidance | Documented in | In the skills today |
|---|---|---|
| Spec is a behavior contract, not implementation (belongs/avoid) | concepts.md "What a Spec Is (and Is Not)" | No (#1289) |
| Right-sized rigor — Lite by default, Full for higher-risk | concepts.md "Keep It Lightweight: Progressive Rigor" | No |
| RFC-2119 keyword *meanings* (SHOULD/MAY, not just SHALL) | concepts.md "Spec Format" | Skills say "write SHALL"; meanings absent |
| Scenario quality — ≥1 per requirement, testable, edge cases + happy path | concepts.md "Spec Structure" | Format (`WHEN/THEN`) shown; coverage bar absent |
| Delta conventions — MODIFIED shows prior value, REMOVED says why | concepts.md "Delta Specs" | `sync-specs` shows headers; conventions absent, and `propose`/`ff`/`continue` carry no delta guidance |

The reference is the compact form of these `concepts.md` sections, and a test asserts it still lists the same items the docs do, so the skills and the docs cannot drift. The same conventions are carried on `AGENTS.md` (per `docs-agent-instructions`), so non-skill-loading agents get them too. `sync-specs` leans on the delta conventions; `propose`/`ff-change`/`continue-change` lean on spec content, rigor, and requirement/scenario conventions — all from the one reference.

**Deliberately out of scope (found by the same audit, not fixed here):**

- **Enabler-graph vs. gate wording.** `concepts.md` frames artifact dependencies as "what becomes *possible* next," while `continue-change` says "never skip or reorder." That is a behavioral/UX stance, not missing authoring guidance — changing it would touch behavior, which this change forbids.
- **"Update vs. start fresh" heuristics** (`workflows.md`/`editing-changes.md`) belong to the update workflow, owned by the in-flight `add-update-workflow` change; embedding them here would duplicate that surface.

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

## Agent Skills standard conformance

The Agent Skills open standard defines a skill as a folder containing `SKILL.md` (YAML frontmatter + Markdown body), with `references/`, `scripts/`, and `assets/` as optional on-demand directories. OpenSpec already emits exactly this shape — `<tool>/skills/<name>/SKILL.md` — so conformance is mostly a matter of staying inside the standard's constraints, not restructuring.

Current alignment, measured against the standard:

| Standard rule | OpenSpec today | Action |
|---|---|---|
| Folder contains `SKILL.md` | Yes — file is `SKILL.md` | none |
| `name` == folder name | Yes for all 11 | keep; assert in validation |
| `name`: ≤64, lowercase/hyphen, no leading/trailing/consecutive hyphen | All 11 valid | assert in validation |
| `description`: ≤1024, what + when | Short "Use when…" lines | item 1 strengthens; assert length |
| `compatibility`: ≤500 | "Requires openspec CLI." | keep; assert length |
| Body < 500 lines / ~5000 tokens | `onboard` 543 (over); others under | split deep material into `references/` |
| Deep material in `references/`, linked one level deep | All inline today | emit `references/` files; link from body |

The body budget is the one hard violation (`onboard`) and the reason items 5 and 7 are the same requirement: "lean always-on body" *is* the standard's progressive-disclosure rule. Splitting moves `onboard`'s phase script, `bulk-archive`'s conflict examples, `sync-specs`'s delta-format reference, and `verify`'s dimension detail into `references/*.md`, leaving each `SKILL.md` body as the core procedure with a relative link.

Validation reuses the standard's own checks (the published reference validator, `skills-ref validate`, or an equivalent internal check): frontmatter validity, name/description/compatibility limits, `name` == folder, body budget. It runs at generation time inside `init`/`update` (fail rather than write a bad skill) and again in CI. This is additive to the existing `generatedBy` version-drift mechanism in `update.ts`; it does not change directory layout or delivery behavior, which keeps it orthogonal to `add-tool-command-surface-capabilities`.

## Pre-approved tools (`allowed-tools`)

`allowed-tools` is the standard's experimental field for pre-approving the tools a skill may run. Adoption has an asymmetric risk: on agents that enforce it as a strict allowlist, an **under**-specified list breaks the skill (a needed tool is blocked); on agents that ignore it, it is a no-op. An **over**-specified list never breaks anything — it just pre-approves more. So the happy path biases toward completeness, generated correct-by-construction.

Decision:

- **Declare once, generate the field.** Each skill template carries an explicit `tools` list — its real toolset. The generator emits `allowed-tools` from it; nobody hand-writes the frontmatter string. A check fails if the body references a tool not in the list, so the declared set stays a superset of actual usage and enforcing agents never block a needed tool.
- **Scope Bash to the binary where possible.** The headline win is pre-approving `Bash(openspec:*)` so agents stop prompting on every deterministic CLI call — the main friction today. CLI-only skills (explore, new, continue, ff, sync, archive, bulk-archive, verify, propose) get the scoped form.
- **Unrestricted Bash only where earned.** `apply-change` implements tasks (runs tests, builds, arbitrary commands) and `onboard` runs a live codebase demo, so they declare unrestricted `Bash`. This is honest about what they do; a directory's review can see it.
- **Forward-compatible.** Because the field is omitted-safe (ignoring agents are unaffected) and complete (enforcing agents don't break), turning it on is pure upside.

Observed toolset across the skills (from the templates): every skill drives `openspec` via Bash; the common non-Bash tools are AskUserQuestion, TodoWrite, Read, Write, Edit, Skill, and Task, with Grep/Glob for the search-heavy skills (`explore`, `verify`). The per-skill `tools` declaration captures exactly each skill's subset.

## Distribution and listing

Conformance makes the skills *portable*; distribution makes them *discoverable*. The publishable bundle is just the validated set of skill folders gathered as a unit — no new format, since each folder is already standard-conformant. Listing in a public Agent Skills directory is then a documented, repeatable checklist rather than code:

1. Regenerate skills from current templates (stamps the OpenSpec version into metadata).
2. Run conformance validation across the bundle; a single failure blocks it.
3. Confirm license and author metadata on every skill.
4. Submit per the target directory's process.

The checklist explicitly notes that directories apply their own curation and security review (ranging from none to an audited verification), which OpenSpec does not control. Automating submission is a non-goal; the value here is a bundle that passes validation and a path a maintainer can follow.

## Always-on guidance (AGENTS.md)

Skills cover agents that load `SKILL.md`. A large set of agents read only project-level `AGENTS.md`. To meet the goal — every agent steered onto the deterministic CLI — the generated `openspec/AGENTS.md` (governed by `docs-agent-instructions`) advertises the same workflow: which skill applies when, the core read-and-validate commands (`openspec list/status/instructions/validate`), the instruction to trust their JSON over assumed paths, and the fact that generated skill/command files are managed by `openspec update` and must not be hand-edited. This is a content addition to an existing surface, composed via a `docs-agent-instructions` requirement rather than a new mechanism.

## Decisions

- **New capability, not modifications to per-skill specs.** The improvements are about how instructions are written, which is a cross-cutting contract. Only 4 of 11 skills have specs today, so editing those four would leave the bar unstated for the rest. A single `skill-authoring-conventions` capability states the bar once, for all skills, and is verifiable against generated output.
- **Behavior-first requirements.** Requirements assert observable properties of generated skills (a description disambiguates; a body declares success; a skill links to the conventions reference), per `openspec/config.yaml`. The mechanics — which file holds the reference — live here in design, not in the spec.
- **Self-contained over DRY.** Skills are kept independently rewritable rather than deduplicated into a shared instruction source; the resulting cross-skill duplication is an accepted, intentional cost. Only *conventions* are shared, and only through a `references/` file the skills link to — not through interpolated string constants. This is the maintainer-set direction for the skills architecture.
- **No behavioral drift.** Because per-skill contracts are unchanged, existing per-skill spec tests remain the guardrail that the rewrites did not alter behavior.
- **Conformance folded into authoring, distribution kept separate.** Standard conformance and the validation gate live in `skill-authoring-conventions` because they constrain how each skill is written. Packaging-and-listing is a distinct concern (a bundle, a checklist, an external directory), so it gets its own `skill-distribution` capability rather than overloading the authoring contract.
- **One change, not three PRs.** Conformance, distribution, and AGENTS.md guidance all serve the single goal of agents driving the deterministic CLI, and they share the same templates and validation. Splitting them would duplicate the validation plumbing and sequencing overhead for no reviewer benefit.

## Alternatives considered

- **Edit each skill independently, no shared contract.** Rejected: the gaps recur, so the fix would drift again without a stated bar and a test that enforces it.
- **Modify each per-skill spec to add success/failure language.** Rejected: leaves the 7 unspecced skills uncovered and scatters one contract across many files.
- **Aggressively DRY the skills (single instruction source, extracted procedure constants).** Rejected: it conflicts with self-contained skills, which are meant to be rewritten independently. Cross-skill duplication is accepted; only conventions are shared, via a reference.
- **Collapse skill and command into a single artifact.** Out of scope: they are distinct delivery surfaces (`tool-command-surface`), and each stays self-contained; this change does not merge or couple them.
- **A separate proposal for standard conformance / listing.** Rejected: it would re-derive the same body-budget and validation work this change already does, and the listing payoff depends on conformance landing first.
- **Build our own skill validator from scratch.** Prefer the standard's published reference validator (`skills-ref`) or a thin internal equivalent, so OpenSpec tracks the standard rather than a private interpretation of it.

## Cross-platform

Instruction content is platform-neutral prose. The code touched that writes files is the generation assembly (now also emitting per-skill `references/` files), which already uses `path` utilities. Tasks include a regression pass of `init`/`update` skill generation so the shared-source refactor and the new `references/` files do not change emitted paths or contents across macOS, Linux, and Windows — and the conformance gate's `name` == folder check must use path-basename comparison, not string slicing.

## Risks

- **Over-trimming verbose skills** could drop guidance an agent relies on. Mitigation: move detail to separated sections (progressive disclosure), do not delete it; per-skill behavioral specs catch regressions.
- **The authoring-conventions reference drifting from the docs, or a skill forgetting to link it.** Mitigation: a test asserts the reference still lists the same items as `docs/concepts.md`, and another asserts each artifact-drafting skill links to it and the link resolves.
- **The standard evolves.** The Agent Skills spec is young (`allowed-tools` is still experimental). Mitigation: validate against the published reference rather than a hand-copied rule set, and pin the validator version so a spec change is a deliberate update.
- **Splitting bodies into `references/` could orphan a link.** Mitigation: the conformance gate checks that every relative reference link resolves to a bundled file.
- **A directory may reject or delay a listing.** Mitigation: listing is a checklist, not a release blocker; conformance and the bundle stand on their own value regardless of any single directory's curation.
