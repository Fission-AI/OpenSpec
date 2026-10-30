## 1. Part A — shared, fence-aware extraction (#361, #418, #312, fenced-scenario)

- [x] 1.1 Add a shared `extractRequirementBody(lines, fenceMask, startIndex)` helper in `src/core/parsers/` returning the full body: lines after the header up to the first `#### Scenario:` on a non-fence-masked line, skipping fence-masked and `**metadata**:` lines.
- [x] 1.2 Add a fence-aware scenario counter (count only non-fence-masked `####` headers).
- [x] 1.3 Rewrite `MarkdownParser.parseRequirements` to use the body helper (replacing first-line logic) and consult `codeFenceLineMask`.
- [x] 1.4 Rewrite `Validator.extractRequirementText` to delegate to the body helper, and `countScenarios` to the fence-aware counter.
- [x] 1.5 Run `SHALL`/`MUST` detection over the full body in both paths.

## 2. Part A — single normative-keyword predicate

- [x] 2.1 Use the shared `containsShallOrMust` (`/\b(SHALL|MUST)\b/`) for validator keyword checks; after the #1280 merge, schema-level keyword enforcement remains removed and owned by the imperative validator.

## 3. Part B — surface the #498 divergence (INFO, no recognition change)

- [x] 3.1 Record the non-canonical level-3 headers `parseDeltaSpec` skips while parsing ADDED/MODIFIED sections (`DeltaPlan.skippedHeaders`), so the note reflects the reader's real boundaries.
- [x] 3.2 In `validateChangeDeltaSpecs`, emit an INFO issue for each skipped header. Do **not** change recognition. Special-case a nameless `### Requirement:` header.
- [x] 3.3 Confirm INFO does not affect `valid` under `--strict` (`valid = errors === 0 && warnings === 0`).

## 4. Update the one affected existing test

- [x] 4.1 `markdown-parser.test.ts:331` (*first non-empty content line*) → assert `req.text` is the full joined body. Confirm `:106`/`:139` (fence) and `:258`/`:310` (bare-header) tests still pass unchanged.

## 5. Regression tests

- [x] 5.1 (#361) `SHALL` wrapped onto body line 2 passes `validate <change>` and `validate <spec>`.
- [x] 5.2 (#418) metadata lines before the prose pass `validate <spec>`; delta path stays green.
- [x] 5.3 (#312) fenced block before the prose line captures the real body and passes.
- [x] 5.4 (fenced scenario) a requirement whose only `#### Scenario:` is inside a fence FAILS `validate <change>` (parity with `validate <spec>`).
- [x] 5.5 (#498) a stray `### Documentation Requirements` divider in a delta yields an INFO note from `validate <change>` and does not change `valid` (including `--strict`).
- [x] 5.6 Guard: single-line requirements unchanged; bare-header specs still valid; LF/CRLF covered.

## 6. Release

- [x] 6.1 Add a changeset: Fixes #361, #418, #312; surfaces #498. Note the read-only display changes (fuller `req.text` in JSON/descriptions); no archived-content change.

## 7. Review fixes (PR #1281)

- [x] 7.1 Skip `**metadata**:` lines only when other body text remains; a metadata-only body (e.g. `**Constraint**: The system MUST ...`) is kept as the requirement text.
- [x] 7.2 Keep header-title fallback in the Markdown parser for display/bare-header compatibility, while validator checks use body-only extraction so canonical header-only requirements still receive the #1280 body-keyword hint.
- [x] 7.3 End the body at any non-fenced Markdown header, so a stray `###` divider's notes cannot satisfy the keyword check (old-reader parity).
- [x] 7.4 Replace the standalone INFO scanner with skipped-header collection inside `parseDeltaSpec` (notes match the reader's real boundaries).
- [x] 7.5 Special-case the nameless `### Requirement:` INFO message; document that the any-`####` scenario match is deliberate; un-export `REQUIREMENT_HEADER_REGEX`.
- [x] 7.6 Soften the changeset wording and document the known remaining divergences in `design.md`.
