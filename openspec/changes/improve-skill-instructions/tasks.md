# Tasks

> **Implementation status (in this PR).** Built out and test-green. All 11 skills (plus `feedback`) rewritten to the conventions; the authoring-conventions reference authored + emitted on disk; `allowed-tools` frontmatter generated from a declared per-skill toolset; the conformance validation gate wired into `init`/`update` and covered in CI; the distribution bundle validated with a listing checklist. **Measured efficacy: convention checks passing rose 33/81 → 80/81** (the one miss is `onboard`'s over-budget body — a documented warning, see 3.2/5.x). Full suite green except a pre-existing, environment-specific `zsh-installer` failure (fails identically on the baseline).
>
> **Deliberately NOT built — needs maintainer decision (§9).** The codebase has *removed* `openspec/AGENTS.md` generation (`src/core/templates/index.ts` says the AGENTS.md templates were deleted; `legacy-cleanup.ts` actively deletes `openspec/AGENTS.md` as an "obsolete workflow file"). Re-introducing an AGENTS.md generator would fight that direction, so `docs-agent-instructions` / item 10 is left unbuilt and flagged for rework.
>
> **Remaining, lower-risk follow-ups:** command-template rewrites (kept unchanged — self-contained/independently rewritable), and moving deep material (`onboard` phase script, `bulk-archive` examples, `sync-specs` delta reference, `verify` dimension detail) out of bodies into `references/` (the emission plumbing is done; the content moves are not). Marked `[~]` below.

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
- [~] 2.6 `sync-specs` (skill) — convention sections + delta conventions via the reference added; moving the full inline delta-format reference into a `references/` file still pending
- [x] 2.7 `archive-change` (skill) — added recovery paths (incomplete tasks → apply, unsynced specs → sync) + Use when/Success/Related
- [x] 2.8 `bulk-archive-change` (skill) — added convention sections incl. spec-conflict recovery (moving worked examples into `references/` still pending — see 5.2)
- [x] 2.9 `verify-change` (skill) — made success criteria explicit + recovery + Related (moving the three-dimension detail into `references/` still pending — see 5.2)
- [x] 2.10 `feedback` (skill) — added an explicit "use when" trigger + Success/Failure/Related
- [x] 2.11 Link the artifact-drafting skills to the authoring-conventions reference (`propose`/`ff-change`/`continue-change` for spec content + rigor + requirement/scenario conventions; `sync-specs` for the delta conventions), so agents draft conformant specs without external instruction (#1289)

## 3. Apply documented variants

- [x] 3.1 `explore` (stance) — kept stance structure; added an explicit exit condition, Failure & recovery, and a Related reference
- [~] 3.2 `onboard` (tutorial) — kept phase walkthrough; added Use when + explicit completion condition + recovery + Related. Body still 543 lines (over the 500 budget) — the gate treats budget as a WARNING; moving the phase script into `references/` to get under budget is pending

## 4. Cross-skill navigation

- [x] 4.1 Added a Related line to every skill pointing to its natural next/sibling (e.g. `propose` → `apply`, `verify` → `archive`, `new-change` → `continue`)

## 5. Agent Skills standard conformance

- [x] 5.1 Audited all 11 generated `SKILL.md` bodies against the < 500-line budget; only `onboard` exceeds it (543) — surfaced as a gate warning in `validateSkillConformance`
- [~] 5.2 Emit per-skill `references/` files from the generator (plumbing done: `getSkillReferenceFiles` + init/update emit exactly the references a skill links, verified end-to-end); moving `onboard`'s phase script, `bulk-archive`'s conflict examples, `sync-specs`'s delta-format reference, and `verify`'s dimension detail out of the body still pending
- [x] 5.3 Confirm frontmatter conforms: `name` ≤64 / valid charset / equals folder, `description` ≤1024, `compatibility` ≤500 — enforced by `validateSkillConformance` (hard errors)
- [x] 5.4 Confirm `references/` links resolve to emitted files — enforced by the gate + `skill-conformance.test.ts`

## 6. Pre-approved tools (`allowed-tools`)

- [x] 6.1 Declared toolset per skill (`src/core/templates/workflows/skill-tools.ts`); `generateSkillContent` emits `allowed-tools` from it
- [x] 6.2 Scoped Bash to `Bash(openspec:*)` for CLI-only skills; unrestricted `Bash` only for `apply-change` and `onboard` (asserted in `skill-conformance.test.ts`)
- [ ] 6.3 Add a check that the declared `tools` set is a superset of every tool the skill body references (fail on gap) — not implemented (reliable body-usage tool detection deferred; declared sets are hand-verified supersets for now)

## 7. Conformance validation gate

- [x] 7.1 Added a thin internal skill conformance validator (`validateSkillConformance` in `src/core/shared/skill-conformance.ts`)
- [x] 7.2 Wired the validator into `init`/`update` generation so a non-conformant skill fails the operation with a clear per-skill error — no directory-layout or delivery change
- [x] 7.3 CI check: `test/core/shared/skill-conformance.test.ts` validates every generated skill against the gate

## 8. Distribution and listing

- [x] 8.1 The validated set of skill folders (`SKILL.md` + `references/`) is the bundle — regenerable from templates, blocked at generation if any skill fails conformance; a test asserts the whole bundle passes
- [x] 8.2 Each skill carries `license` + `metadata.author` and a keyword-rich what+when `description` (the rewritten descriptions)
- [x] 8.3 Wrote the listing checklist (`docs/skill-distribution.md`): validate → confirm license/metadata → submit; notes external curation/security review is out of OpenSpec's control

## 9. Always-on agent guidance — BLOCKED, needs maintainer decision

- [ ] 9.1 `openspec/AGENTS.md` skills + CLI guidance — **blocked**: the codebase removed AGENTS.md generation and `legacy-cleanup.ts` deletes `openspec/AGENTS.md` as obsolete. Re-introducing it contradicts that direction; `docs-agent-instructions` needs rework (or a different always-on surface) before this can be built.
- [ ] 9.2 Carry the authoring conventions on `AGENTS.md` — blocked by 9.1.

## 10. Validation

- [x] 10.1 / 10.2 The conformance scorer + `skill-conformance.test.ts` assert every skill has a "use when" trigger, a boundary, success criteria, failure & recovery, guardrails, and a related-skills line (the canonical sections), and print the scorecard
- [x] 10.3 Test asserts each artifact-drafting skill links the authoring-conventions reference and the link resolves to an emitted file; plus the conformance scorer
- [x] 10.4 Test asserts every generated skill passes standard conformance (frontmatter, name==folder, resolvable references, declared tools); body-budget is a warning
- [x] 10.5 Full suite run confirms the per-skill behavioral spec tests (`opsx-verify`/`opsx-onboard`/`opsx-archive`/`specs-sync`) still pass — behavior preserved; command templates left byte-identical
- [~] 10.6 `init`/`update` skill-generation tests pass locally with the new `references/` files; multi-OS CI matrix not run here
- [ ] 10.7 Add a test asserting the authoring-conventions reference still lists the same items as its `docs/concepts.md` source — not yet (link/emission asserted; docs-drift assertion pending)
- [x] 10.8 `openspec validate improve-skill-instructions --strict` passes
