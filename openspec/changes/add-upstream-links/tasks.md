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

## Verification
- [x] Unit tests: upstream module, resolver inheritance, structure parsing, references index
- [x] CLI tests: --serves validation and wiring, downstream rollup, context enrichment
- [x] Full suite green; golden skill hashes regenerated
- [x] Real end-to-end run captured for docs and PR body
