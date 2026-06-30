# Tasks

## 1. Shared foundation

- [ ] 1.1 Add `CHANGE_SELECTION_GUIDANCE`, `ARTIFACT_LOOP_GUIDANCE`, and `CONTEXT_RULES_GUARDRAIL` shared constants beside `STORE_SELECTION_GUIDANCE` in `src/core/templates/workflows/`
- [ ] 1.2 Refactor each workflow module so the skill and command templates derive their shared body from one instruction source, differing only in invocation/metadata framing
- [ ] 1.3 Confirm generated skill files and command files are byte-identical in shared regions after the refactor

## 2. Rewrite procedural skills to the canonical structure

For each: apply Use when / Inputs / Steps / Success / Failure & recovery / Guardrails / Related; add the sibling-boundary clause to the description; reference shared snippets instead of inline copies.

- [ ] 2.1 `new-change` — boundary: scaffold only, then stop
- [ ] 2.2 `propose` — boundary: one-shot all artifacts; replace duplicated loop with `ARTIFACT_LOOP_GUIDANCE`
- [ ] 2.3 `ff-change` — boundary: fast-forward to apply-ready
- [ ] 2.4 `continue-change` — boundary: advance one artifact; flatten the Step 3 decision tree
- [ ] 2.5 `apply-change` — add recovery paths for blocked/error/pause states
- [ ] 2.6 `sync-specs` — move the full delta-format reference into a separated section
- [ ] 2.7 `archive-change` — add recovery paths; flatten nested warning logic
- [ ] 2.8 `bulk-archive-change` — move conflict-resolution worked examples into a separated reference section
- [ ] 2.9 `verify-change` — make success criteria explicit; separate the three-dimension reference detail
- [ ] 2.10 `feedback` — add an explicit "use when" trigger; apply the canonical structure

## 3. Apply documented variants

- [ ] 3.1 `explore` (stance) — keep stance structure; add an explicit exit condition and a Related reference
- [ ] 3.2 `onboard` (tutorial) — keep phase walkthrough; move the phase script out of the always-on body; add an explicit completion condition

## 4. Cross-skill navigation

- [ ] 4.1 Add a Related line to every skill pointing to its natural next/sibling (e.g. `propose` → `apply`, `verify` → `archive`, `new-change` → `continue`)

## 5. Validation

- [ ] 5.1 Add a test asserting every generated skill description contains a "use when" trigger
- [ ] 5.2 Add a test asserting every procedural skill body contains the required canonical sections
- [ ] 5.3 Add a test asserting skill and command shared regions stay in sync (single-source)
- [ ] 5.4 Run the existing per-skill behavioral spec tests to confirm no behavior changed
- [ ] 5.5 Run `init`/`update` skill-generation tests on macOS, Linux, and Windows CI to confirm emitted paths and file contents are unchanged by the shared-source refactor
- [ ] 5.6 `openspec validate improve-skill-instructions --strict` passes
