# Tasks

## Remove the parallel ontology
- [x] Delete initiatives module, skill, CLI mode, and folder conventions
- [x] Restore retired-vocabulary policing; keep legacy `initiative:` metadata readable

## Upstream links
- [x] `serves:` metadata + `new change --serves` with full wiring (linked roots, auto-references)
- [x] `openspec list --downstream` rollup (own root, stores, linked repos; missing/archived visible)
- [x] `<upstream>` context block in instructions and apply instructions

## Schema openness
- [x] Top-level `notes:` parsed and surfaced on every instruction surface
- [x] `instructions/<artifact>.md` and `instructions/apply.md` files beside schemas
- [x] Inheritance through `references:` in resolver, listings, and `schemas --store` labels
- [x] `structure:` config declarations surfaced in context and the references index

## Happy path
- [x] Built-in `requirements` schema; fresh stores default to it
- [x] `schema init`: `--store` support, per-stage instruction files, `--default` key fix
- [x] Store setup output teaches the loop; skills carry `--serves` guidance

## Hardening from independent sessions
- [x] Whole-change rollup status: complete = tasks AND schema artifacts (half-done shows both counts)
- [x] `--scan <dir>`: stateless rollup for CI (no linked-root records needed)
- [x] `schema init` accepts custom stage names, wired sequentially in the order given
- [x] `schema validate` / `schema which` accept `--store`
- [x] Divergence rule in the `<upstream>` block (flag upstream, never silently diverge)
- [x] Schema-aware validate (spec-less workflows exempt from delta requirement)
- [x] Purpose seeding: delta `## Purpose` → proposal `## Why` → placeholder
- [x] Requirements workflow sharpened: non-goals, success signals, requirement traceability
- [x] Legacy string-form `initiative:` refs readable; rollup noise cut

## Layout and the one door
- [x] `structure:` executable: folders and files materialized by `store setup`, drift flagged by `store doctor`
- [x] `/opsx:store` skill (core profile): thin state-routed entry point, generated on plain init

## Verification
- [x] Unit tests: upstream module, resolver inheritance, structure parsing, references index
- [x] CLI tests: --serves validation and wiring, downstream rollup, context enrichment
- [x] Full suite green; golden skill hashes regenerated
- [x] Real end-to-end runs captured for docs and PR body (single-repo, cross-repo on a real product, CI-machine rollup)
- [x] Cold-start session (help + guides only) completed the loop first attempt; multi-stage custom chain driven through every gate
