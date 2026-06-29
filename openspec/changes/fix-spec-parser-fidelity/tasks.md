## 1. Shared requirement-body extraction (#361, #312 hazard)

- [ ] 1.1 Add a shared `extractRequirementBody(lines, fenceMask, startIndex)` helper in `src/core/parsers/` that returns the full requirement body: all lines after the header up to the first `#### Scenario:` header detected on a **non-fence-masked** line, skipping fence-masked lines and `**metadata**:` lines.
- [ ] 1.2 Rewrite `MarkdownParser.parseRequirements` to use the helper (replacing the first-line-only `firstLine` logic) and to consult `codeFenceLineMask` so a `#` inside a fenced block no longer truncates the body.
- [ ] 1.3 Rewrite `Validator.extractRequirementText` to delegate to the same helper, returning the full body rather than the first substantial line.
- [ ] 1.4 Run `SHALL`/`MUST` detection over the full captured body in both paths.

## 2. Canonical requirement recognition + parity (#498)

- [ ] 2.1 Export `REQUIREMENT_HEADER_REGEX` from `requirement-blocks.ts` (or a shared `isRequirementHeader` predicate).
- [ ] 2.2 In `MarkdownParser.parseRequirements`, recognize a level-3 child as a requirement only when its header matches that canonical predicate; ignore other level-3 headers. Confirm `## REMOVED`/`## RENAMED` parsing (separate functions) is unaffected.
- [ ] 2.3 Confirm `openspec validate <change>`, `openspec validate <spec>`, and `openspec archive` now recognize the same set of requirements (no phantom-requirement warnings for non-`Requirement:` headers).

## 3. Single normative-keyword predicate

- [ ] 3.1 Replace the substring check in `src/core/schemas/base.schema.ts` (`text.includes('SHALL')`) with the shared `containsShallOrMust` (`/\b(SHALL|MUST)\b/`), so the Zod refine and the delta path agree.

## 4. Tests

- [ ] 4.1 Regression (#361, delta path): a `SHALL` wrapped onto body line 2 passes `validate <change> --strict`.
- [ ] 4.2 Regression (#361, spec path): the same wrapped `SHALL` passes `validate <spec> --strict`.
- [ ] 4.3 Regression (#312 hazard): a requirement body containing a fenced code block with `#`-comment lines captures the full body, parses scenarios, and keeps the correct requirement count.
- [ ] 4.4 Regression (#498): a spec/change with a stray `### Documentation Requirements` divider produces no phantom-requirement issue from `validate <change>`, `validate <spec>`, or `archive`.
- [ ] 4.5 Parity test: `validate <change>`, `validate <spec>`, and `archive` agree (same recognized requirements, same pass/fail) over the #361/#498/#312 fixtures.
- [ ] 4.6 Guard: legitimate single-line requirements are byte-for-byte unchanged in display text and counts; predicate change does not alter results for existing valid specs.
- [ ] 4.7 Cross-platform: fixtures and assertions use `path.join()`; multi-line capture verified for LF and CRLF inputs.

## 5. Release

- [ ] 5.1 Add a changeset describing the parser-fidelity fixes (Fixes #361, #498; hardens #312) and the `view`/`show` count note.
