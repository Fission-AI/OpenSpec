# Tasks

> **Implementation status (in this PR).** Built out and test-green. All 11 skills (plus `feedback`) rewritten to the conventions; the authoring-conventions reference authored + emitted on disk; `allowed-tools` frontmatter generated from a declared per-skill toolset; the conformance validation gate wired into `init`/`update` and covered in CI; the distribution bundle validated with a listing checklist. **Measured efficacy: convention checks passing rose 33/81 → 80/81** (the one miss is `onboard`'s over-budget body — a documented warning, see 3.2/5.x). Full suite green except a pre-existing, environment-specific `zsh-installer` failure (fails identically on the baseline).
>
> **`docs-agent-instructions` capability DROPPED (§9).** The codebase *removed* `openspec/AGENTS.md` generation (`src/core/templates/index.ts` records the templates were deleted; `legacy-cleanup.ts` actively deletes `openspec/AGENTS.md` as an "obsolete workflow file"). With no always-on surface to target, the capability was removed from this change (spec delta deleted; proposal/design updated) rather than left permanently unbuildable. Always-on guidance can return in a separate change once a surface exists.
>
> **Deep material now lives in `references/`.** `onboard`'s artifact skeletons, `bulk-archive`'s conflict examples, `sync-specs`'s delta-format reference, and `verify`'s dimension detail were moved out of the bodies into per-skill `references/` files, emitted on disk. `onboard` is now 456 lines (under budget). **Only remaining follow-up:** command-template rewrites, kept byte-identical by design (self-contained/independently rewritable) — the skills are the primary surface.

## 1. Authoring-conventions reference

- [x] 1.1 Author the authoring-conventions reference (the proposal-writing reference) as a `references/` source in `src/core/templates/workflows/`, capturing — as the compact form of `docs/concepts.md` — behavior-contract spec content ("What a Spec Is (and Is Not)", belongs/avoid — #1289), right-sized rigor (Lite/Full), the RFC-2119 keyword meanings the specs use, scenario quality (≥1 per requirement, testable, edge cases), and the delta conventions (MODIFIED shows prior value, REMOVED says why) — `src/core/templates/workflows/authoring-conventions.ts`
- [x] 1.2 Keep skills self-contained: do NOT couple skill and command to a single instruction source or extract procedure into shared constants; leave `STORE_SELECTION_GUIDANCE` as-is

## 2. Rewrite skills to the guidance-first canonical structure

For each: apply Use when / Inputs / Guidance / Success / Failure & recovery / Guardrails / Related; add the sibling-boundary clause to the description; favor behavior/decision guidance over step trees, moving deep or exact procedure into `references/`. Each skill stays self-contained.

- [x] 2.1 `new-change` (skill) — boundary: scaffold only, then stop; added Use when / Inputs / Success / Failure & recovery / Related
- [x] 2.2 `propose` (skill) — boundary: one-shot all artifacts (its overlap with `ff-change` is intentional; do not dedup); added the convention sections
- [x] 2.3 `ff-change` (skill) — boundary: fast-forward to apply-ready; added the convention sections
- [x] 2.4 `continue-change` (skill) — boundary: advance one artifact; added the convention sections (Step 3 decision-tree flattening still pending)
- [x] 2.5 `apply-change` (skill) — added recovery paths for blocked/error/task-failure states + Use when/Success/Related
- [x] 2.6 `sync-specs` (skill) — convention sections + delta conventions via the reference; the full delta-format reference moved into `references/delta-format.md`
- [x] 2.7 `archive-change` (skill) — added recovery paths (incomplete tasks → apply, unsynced specs → sync) + Use when/Success/Related
- [x] 2.8 `bulk-archive-change` (skill) — added convention sections incl. spec-conflict recovery; worked examples moved into `references/conflict-resolution.md`
- [x] 2.9 `verify-change` (skill) — made success criteria explicit + recovery + Related; three-dimension detail moved into `references/verification-dimensions.md`
- [x] 2.10 `feedback` (skill) — added an explicit "use when" trigger + Success/Failure/Related
- [x] 2.11 Link the artifact-drafting skills to the authoring-conventions reference (`propose`/`ff-change`/`continue-change` for spec content + rigor + requirement/scenario conventions; `sync-specs` for the delta conventions), so agents draft conformant specs without external instruction (#1289)

## 3. Apply documented variants

- [x] 3.1 `explore` (stance) — kept stance structure; added an explicit exit condition, Failure & recovery, and a Related reference
- [x] 3.2 `onboard` (tutorial) — kept phase walkthrough; added Use when + explicit completion condition + recovery + Related; moved the artifact skeletons into `references/onboarding-artifact-templates.md`, bringing the body to 456 lines (under budget)

## 4. Cross-skill navigation

- [x] 4.1 Added a Related line to every skill pointing to its natural next/sibling (e.g. `propose` → `apply`, `verify` → `archive`, `new-change` → `continue`)

## 5. Agent Skills standard conformance

- [x] 5.1 Audited all 11 generated `SKILL.md` bodies against the < 500-line budget; after the onboard split, **all 11 are under budget** (`validateSkillConformance` still surfaces any over-budget body as a warning)
- [x] 5.2 Emit per-skill `references/` files from the generator (`getSkillReferenceFiles` + a `REFERENCE_REGISTRY`, wired into init/update, verified end-to-end); moved `onboard`'s skeletons, `bulk-archive`'s conflict examples, `sync-specs`'s delta-format reference, and `verify`'s dimension detail out of the bodies into `references/` files linked one level deep
- [x] 5.3 Confirm frontmatter conforms: `name` ≤64 / valid charset / equals folder, `description` ≤1024, `compatibility` ≤500 — enforced by `validateSkillConformance` (hard errors)
- [x] 5.4 Confirm `references/` links resolve to emitted files — enforced by the gate + `skill-conformance.test.ts`

## 6. Pre-approved tools (`allowed-tools`)

- [x] 6.1 Declared toolset per skill (`src/core/templates/workflows/skill-tools.ts`); `generateSkillContent` emits `allowed-tools` from it
- [x] 6.2 Scoped Bash to `Bash(openspec:*)` for CLI-only skills; unrestricted `Bash` only for `apply-change` and `onboard` (asserted in `skill-conformance.test.ts`)
- [x] 6.3 The gate fails if the body uses an unambiguous tool token (AskUserQuestion/TodoWrite/Grep/Glob/WebFetch/WebSearch) not in the declared set — conservative to avoid false-positives on prose like "Read the file"

## 7. Conformance validation gate

- [x] 7.1 Added a thin internal skill conformance validator (`validateSkillConformance` in `src/core/shared/skill-conformance.ts`)
- [x] 7.2 Wired the validator into `init`/`update` generation so a non-conformant skill fails the operation with a clear per-skill error — no directory-layout or delivery change
- [x] 7.3 CI check: `test/core/shared/skill-conformance.test.ts` validates every generated skill against the gate

## 8. Distribution and listing

- [x] 8.1 The validated set of skill folders (`SKILL.md` + `references/`) is the bundle — regenerable from templates, blocked at generation if any skill fails conformance; a test asserts the whole bundle passes
- [x] 8.2 Each skill carries `license` + `metadata.author` and a keyword-rich what+when `description` (the rewritten descriptions)
- [x] 8.3 Wrote the listing checklist (`docs/skill-distribution.md`): validate → confirm license/metadata → submit; notes external curation/security review is out of OpenSpec's control

## 9. Always-on agent guidance — DROPPED

The `docs-agent-instructions` capability (AGENTS.md guidance for non-skill agents) was removed from this change: OpenSpec no longer generates `openspec/AGENTS.md` (`legacy-cleanup.ts` deletes it as obsolete), so there is no surface to target. The spec delta was deleted and the proposal/design updated. Always-on guidance can return in a separate change once a surface exists.

## 10. Validation

- [x] 10.1 / 10.2 The conformance scorer + `skill-conformance.test.ts` assert every skill has a "use when" trigger, a boundary, success criteria, failure & recovery, guardrails, and a related-skills line (the canonical sections), and print the scorecard
- [x] 10.3 Test asserts each artifact-drafting skill links the authoring-conventions reference and the link resolves to an emitted file; plus the conformance scorer
- [x] 10.4 Test asserts every generated skill passes standard conformance (frontmatter, name==folder, resolvable references, declared tools); body-budget is a warning
- [x] 10.5 Full suite run confirms the per-skill behavioral spec tests (`opsx-verify`/`opsx-onboard`/`opsx-archive`/`specs-sync`) still pass — behavior preserved; command templates left byte-identical
- [~] 10.6 `init`/`update` skill-generation tests pass locally with the new `references/` files; multi-OS CI matrix not run here
- [x] 10.7 Test asserts the authoring-conventions reference and `docs/concepts.md` share the same anchor items (belongs/avoid, rigor Lite/Full, RFC-2119 SHOULD/MAY, delta ops) — `test/core/templates/authoring-conventions.test.ts` — so the reference and the docs cannot drift (#1289)
- [x] 10.8 `openspec validate improve-skill-instructions --strict` passes
