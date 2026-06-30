## 1. Part A — shared, fence-aware extraction (#361, #418, #312, fenced-scenario)

- [x] 1.1 Add a shared `extractRequirementBody(lines, fenceMask, startIndex)` helper in `src/core/parsers/` returning the full body: lines after the header up to the first `#### Scenario:` on a non-fence-masked line, skipping fence-masked and `**metadata**:` lines.
- [x] 1.2 Add a fence-aware scenario counter (count only non-fence-masked `####` headers).
- [x] 1.3 Rewrite `MarkdownParser.parseRequirements` to use the body helper (replacing first-line logic) and consult `codeFenceLineMask`.
- [x] 1.4 Rewrite `Validator.extractRequirementText` to delegate to the body helper, and `countScenarios` to the fence-aware counter.
- [x] 1.5 Run `SHALL`/`MUST` detection over the full body in both paths.

## 2. Part A — single normative-keyword predicate

- [x] 2.1 Replace the substring check in `src/core/schemas/base.schema.ts` (`text.includes('SHALL')`) with the shared `containsShallOrMust` (`/\b(SHALL|MUST)\b/`).

## 3. Part B — surface the #498 divergence (INFO, no recognition change)

- [x] 3.1 Export `REQUIREMENT_HEADER_REGEX` from `requirement-blocks.ts`.
- [x] 3.2 In `validateChangeDeltaSpecs`, emit an INFO issue when an `## ADDED`/`## MODIFIED Requirements` section contains a level-3 header that does not match the canonical regex. Do **not** change recognition.
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
