## 1. Tier 1 — shared body extraction (#361, #418, #312)

- [ ] 1.1 Add a shared `extractRequirementBody(lines, fenceMask, startIndex)` helper in `src/core/parsers/` that returns the full body: all lines after the header up to the first `#### Scenario:` header on a non-fence-masked line, skipping fence-masked lines and `**metadata**:` lines.
- [ ] 1.2 Rewrite `MarkdownParser.parseRequirements` to use the helper (replacing first-line-only logic), consulting `codeFenceLineMask` so a `#` inside a fence no longer truncates the body, and skipping metadata lines (parity with the delta path).
- [ ] 1.3 Rewrite `Validator.extractRequirementText` to delegate to the same helper, returning the full body.
- [ ] 1.4 Run `SHALL`/`MUST` detection over the full body in both paths.

## 2. Tier 1 — single normative-keyword predicate

- [ ] 2.1 Replace the substring check in `src/core/schemas/base.schema.ts` (`text.includes('SHALL')`) with the shared `containsShallOrMust` (`/\b(SHALL|MUST)\b/`) so the Zod refine and the delta path agree.

## 3. Tier 2 — canonical requirement recognition (#498)

- [ ] 3.1 Export `REQUIREMENT_HEADER_REGEX` from `requirement-blocks.ts` (or a shared `isRequirementHeader` predicate).
- [ ] 3.2 In `MarkdownParser.parseRequirements`, recognize a level-3 child as a requirement only when it matches that canonical predicate; confirm `## REMOVED`/`## RENAMED` parsing is unaffected.
- [ ] 3.3 Confirm `validate <change>`, `validate <spec>`, and `archive` recognize the same requirement set (no phantom-requirement warnings).

## 4. Update existing tests (encode the corrected behavior)

- [ ] 4.1 `markdown-parser.test.ts:331` (*first non-empty content line*) → assert `req.text` is the full joined body (Tier 1).
- [ ] 4.2 `markdown-parser.test.ts:258` (*nested sections*) → use `### Requirement: …` headers (Tier 2).
- [ ] 4.3 `markdown-parser.test.ts:310` (*heading fallback*) → use `### Requirement: …` header (Tier 2).
- [ ] 4.4 Confirm the fence tests (`:106`, `:139`) still pass unchanged.

## 5. Regression + parity tests

- [ ] 5.1 (#361, both paths) `SHALL` wrapped onto body line 2 passes `validate <change>` and `validate <spec>`.
- [ ] 5.2 (#418, spec path) metadata lines before the prose pass `validate <spec>`; delta path stays green.
- [ ] 5.3 (#312) fenced code block before the prose line captures the real body; requirement count and scenarios are correct.
- [ ] 5.4 (#498) a stray `### Documentation Requirements` divider yields no phantom-requirement issue from `validate <change>`, `validate <spec>`, or `archive`.
- [ ] 5.5 Parity: the three commands agree (same recognized requirements, same pass/fail) over the fixtures above.
- [ ] 5.6 Guard: legitimate single-line requirements unchanged; existing in-repo specs still validate; LF/CRLF covered.

## 6. Release

- [ ] 6.1 Add a changeset: Fixes #361, #418, #312; Tier 2 fixes #498. Include the Tier 2 migration note (non-conventional `### <text>` requirement headers are no longer recognized; use `### Requirement: <name>`).
