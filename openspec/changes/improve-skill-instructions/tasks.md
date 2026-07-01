# Tasks

> **Implementation status (in this PR).** First increment landed and green: the conformance scorer, the authoring-conventions reference + on-disk emission, and the rewritten create-a-change family (`new`/`propose`/`ff`/`continue`) plus `sync-specs`. Measured efficacy: convention checks passing rose from **33/81 → 57/81**, and all five rewritten skills now score full marks (7/7 or 8/8). Remaining skills (`explore`, `apply`, `archive`, `bulk-archive`, `verify`, `onboard`, `feedback`), the command-template rewrites, the standard/`allowed-tools`/distribution items, and AGENTS.md are still to do — checkboxes below reflect what's actually done.

## 1. Authoring-conventions reference

- [x] 1.1 Author the authoring-conventions reference (the proposal-writing reference) as a `references/` source in `src/core/templates/workflows/`, capturing — as the compact form of `docs/concepts.md` — behavior-contract spec content ("What a Spec Is (and Is Not)", belongs/avoid — #1289), right-sized rigor (Lite/Full), the RFC-2119 keyword meanings the specs use, scenario quality (≥1 per requirement, testable, edge cases), and the delta conventions (MODIFIED shows prior value, REMOVED says why) — `src/core/templates/workflows/authoring-conventions.ts`
- [x] 1.2 Keep skills self-contained: do NOT couple skill and command to a single instruction source or extract procedure into shared constants; leave `STORE_SELECTION_GUIDANCE` as-is

## 2. Rewrite skills to the guidance-first canonical structure

For each: apply Use when / Inputs / Guidance / Success / Failure & recovery / Guardrails / Related; add the sibling-boundary clause to the description; favor behavior/decision guidance over step trees, moving deep or exact procedure into `references/`. Each skill stays self-contained.

- [x] 2.1 `new-change` (skill) — boundary: scaffold only, then stop; added Use when / Inputs / Success / Failure & recovery / Related
- [x] 2.2 `propose` (skill) — boundary: one-shot all artifacts (its overlap with `ff-change` is intentional; do not dedup); added the convention sections
- [x] 2.3 `ff-change` (skill) — boundary: fast-forward to apply-ready; added the convention sections
- [x] 2.4 `continue-change` (skill) — boundary: advance one artifact; added the convention sections (Step 3 decision-tree flattening still pending)
- [ ] 2.5 `apply-change` — add recovery paths for blocked/error/pause states
- [~] 2.6 `sync-specs` (skill) — convention sections + delta conventions via the reference added; moving the full inline delta-format reference into a `references/` file still pending
- [ ] 2.7 `archive-change` — add recovery paths; replace nested warning logic with decision guidance
- [ ] 2.8 `bulk-archive-change` — move conflict-resolution worked examples into a `references/` file
- [ ] 2.9 `verify-change` — make success criteria explicit; move the three-dimension reference detail into `references/`
- [ ] 2.10 `feedback` — add an explicit "use when" trigger; apply the canonical structure
- [x] 2.11 Link the artifact-drafting skills to the authoring-conventions reference (`propose`/`ff-change`/`continue-change` for spec content + rigor + requirement/scenario conventions; `sync-specs` for the delta conventions), so agents draft conformant specs without external instruction (#1289)

## 3. Apply documented variants

- [ ] 3.1 `explore` (stance) — keep stance structure; add an explicit exit condition and a Related reference
- [ ] 3.2 `onboard` (tutorial) — keep phase walkthrough; move the phase script out of the always-on body; add an explicit completion condition

## 4. Cross-skill navigation

- [ ] 4.1 Add a Related line to every skill pointing to its natural next/sibling (e.g. `propose` → `apply`, `verify` → `archive`, `new-change` → `continue`)

## 5. Agent Skills standard conformance

- [ ] 5.1 Audit all 11 generated `SKILL.md` bodies against the < 500-line / ~5000-token budget; record which exceed it (`onboard` known over at 543)
- [~] 5.2 Emit per-skill `references/` files from the generator (plumbing done: `getSkillReferenceFiles` + init/update emit exactly the references a skill links, verified end-to-end); moving `onboard`'s phase script, `bulk-archive`'s conflict examples, `sync-specs`'s delta-format reference, and `verify`'s dimension detail out of the body still pending
- [ ] 5.3 Confirm frontmatter conforms: `name` ≤64 / valid charset / equals folder (basename comparison), `description` ≤1024 with what+when, `compatibility` ≤500
- [ ] 5.4 Confirm `references/` links resolve to bundled files

## 6. Pre-approved tools (`allowed-tools`)

- [ ] 6.1 Add an explicit `tools` declaration to each skill template (its real toolset); emit `allowed-tools` from it in `generateSkillContent`
- [ ] 6.2 Scope Bash to `Bash(openspec:*)` for CLI-only skills; declare unrestricted `Bash` only for `apply-change` and `onboard`
- [ ] 6.3 Add a check that the declared `tools` set is a superset of every tool the skill body references (fail on gap)

## 7. Conformance validation gate

- [ ] 7.1 Add a skill conformance validator (use the standard's `skills-ref` reference validator, pinned, or a thin internal equivalent)
- [ ] 7.2 Wire the validator into `init`/`update` generation so a non-conformant skill fails the operation with a clear per-skill error — without changing directory layout or delivery behavior
- [ ] 7.3 Add a CI check that validates all generated skills against the standard

## 8. Distribution and listing

- [ ] 8.1 Produce a publishable bundle: the validated set of skill folders (`SKILL.md` + `references/`) gathered as a unit, regenerable from current templates
- [ ] 8.2 Ensure each skill carries license + author metadata and a keyword-rich what+when description for directory search
- [ ] 8.3 Write the listing checklist (validate → confirm license/metadata → submit) and note external curation/security review is out of OpenSpec's control

## 9. Always-on agent guidance

- [ ] 9.1 Populate `openspec/AGENTS.md` to name the workflow skills and when each applies, the core CLI commands (`list`/`status`/`instructions`/`validate`), reliance on their JSON output, and that generated files are managed by `openspec update` — per `docs-agent-instructions`
- [ ] 9.2 Carry (or link to) the core authoring conventions on `AGENTS.md` — behavior-contract spec content, right-sized rigor, requirement/scenario conventions, and delta operations — from the same authoring-conventions reference so skill and non-skill agents get identical guidance

## 10. Validation

- [ ] 10.1 Add a test asserting every generated skill description contains a "use when" trigger
- [ ] 10.2 Add a test asserting every skill body contains the required canonical sections
- [x] 10.3 Add a test asserting each artifact-drafting skill links to the authoring-conventions reference and the link resolves to an emitted file (`test/core/shared/skill-conformance.test.ts`), plus a conformance scorer (`src/core/shared/skill-conformance.ts`) that scores every skill against the conventions and prints the scorecard
- [ ] 10.4 Add a test asserting every generated skill passes standard conformance (frontmatter, name==folder, body budget, resolvable references, declared tools cover body usage)
- [ ] 10.5 Run the existing per-skill behavioral spec tests to confirm no behavior changed (behavior-preservation contract)
- [ ] 10.6 Run `init`/`update` skill-generation tests on macOS, Linux, and Windows CI to confirm emitted paths and contents are correct with the new `references/` files
- [ ] 10.7 Add a test asserting the authoring-conventions reference still lists the same items as its `docs/concepts.md` source (belongs/avoid, rigor, RFC-2119 meanings, scenario quality, delta conventions), so the reference and the docs cannot drift (#1289)
- [ ] 10.8 `openspec validate improve-skill-instructions --strict` passes
