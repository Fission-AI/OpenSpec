# Tasks

## 1. Shared foundation

- [ ] 1.1 Add `CHANGE_SELECTION_GUIDANCE`, `ARTIFACT_LOOP_GUIDANCE`, `CONTEXT_RULES_GUARDRAIL`, and `SPEC_CONTENT_GUIDANCE` shared constants beside `STORE_SELECTION_GUIDANCE` in `src/core/templates/workflows/`; author `SPEC_CONTENT_GUIDANCE` as the compact form of `docs/concepts.md`'s "What a Spec Is (and Is Not)" belongs/avoid lists (#1289)
- [ ] 1.2 Refactor each workflow module so the skill and command templates derive their shared body from one instruction source, differing only in invocation/metadata framing
- [ ] 1.3 Confirm generated skill files and command files are byte-identical in shared regions after the refactor

## 2. Rewrite procedural skills to the canonical structure

For each: apply Use when / Inputs / Steps / Success / Failure & recovery / Guardrails / Related; add the sibling-boundary clause to the description; reference shared snippets instead of inline copies.

- [ ] 2.1 `new-change` — boundary: scaffold only, then stop
- [ ] 2.2 `propose` — boundary: one-shot all artifacts; replace the 68 lines (87%) duplicated from `ff-change` with a reference to `ARTIFACT_LOOP_GUIDANCE`
- [ ] 2.3 `ff-change` — boundary: fast-forward to apply-ready
- [ ] 2.4 `continue-change` — boundary: advance one artifact; flatten the Step 3 decision tree
- [ ] 2.5 `apply-change` — add recovery paths for blocked/error/pause states
- [ ] 2.6 `sync-specs` — move the full delta-format reference into a separated section
- [ ] 2.7 `archive-change` — add recovery paths; flatten nested warning logic
- [ ] 2.8 `bulk-archive-change` — move conflict-resolution worked examples into a separated reference section
- [ ] 2.9 `verify-change` — make success criteria explicit; separate the three-dimension reference detail
- [ ] 2.10 `feedback` — add an explicit "use when" trigger; apply the canonical structure
- [ ] 2.11 Reference `SPEC_CONTENT_GUIDANCE` from the spec-authoring skills (`propose`, `ff-change`, `continue-change`, `sync-specs`) so each embeds the belongs/avoid spec-content rules (#1289)

## 3. Apply documented variants

- [ ] 3.1 `explore` (stance) — keep stance structure; add an explicit exit condition and a Related reference
- [ ] 3.2 `onboard` (tutorial) — keep phase walkthrough; move the phase script out of the always-on body; add an explicit completion condition

## 4. Cross-skill navigation

- [ ] 4.1 Add a Related line to every skill pointing to its natural next/sibling (e.g. `propose` → `apply`, `verify` → `archive`, `new-change` → `continue`)

## 5. Agent Skills standard conformance

- [ ] 5.1 Audit all 11 generated `SKILL.md` bodies against the < 500-line / ~5000-token budget; record which exceed it (`onboard` known over at 543)
- [ ] 5.2 Emit per-skill `references/` files from the generator; move `onboard`'s phase script, `bulk-archive`'s conflict examples, `sync-specs`'s delta-format reference, and `verify`'s dimension detail out of the body and link to them one level deep
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

## 10. Validation

- [ ] 10.1 Add a test asserting every generated skill description contains a "use when" trigger
- [ ] 10.2 Add a test asserting every procedural skill body contains the required canonical sections
- [ ] 10.3 Add a test asserting that, after stripping surface-specific framing, each skill body and its command body are identical (single-source)
- [ ] 10.4 Add a test asserting every generated skill passes standard conformance (frontmatter, name==folder, body budget, resolvable references, declared tools cover body usage)
- [ ] 10.5 Run the existing per-skill behavioral spec tests to confirm no behavior changed (behavior-preservation contract)
- [ ] 10.6 Run `init`/`update` skill-generation tests on macOS, Linux, and Windows CI to confirm emitted paths and contents are unchanged by the shared-source refactor and the new `references/` files
- [ ] 10.7 Add a test asserting the spec-authoring skills (`propose`, `ff-change`, `continue-change`, `sync-specs`) embed `SPEC_CONTENT_GUIDANCE` and that the snippet lists the same belongs/avoid items as `docs/concepts.md` (#1289)
- [ ] 10.8 `openspec validate improve-skill-instructions --strict` passes
