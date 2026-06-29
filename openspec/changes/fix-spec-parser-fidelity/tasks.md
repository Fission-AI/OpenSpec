## 1. Shared requirement-body extraction (#361, #312)

- [ ] 1.1 Add a shared `extractRequirementBody(lines, fenceMask, startIndex)` helper (in `src/core/parsers/`) that returns the full requirement body: all lines after the header up to the first `#### Scenario:` header, skipping fence-masked lines and `**metadata**:` lines.
- [ ] 1.2 Rewrite `MarkdownParser.parseRequirements` to use the helper for body capture (replacing the first-line-only `firstLine` logic at `markdown-parser.ts`), and consult `codeFenceLineMask` so `#` inside fenced blocks no longer truncates the body.
- [ ] 1.3 Rewrite `Validator.extractRequirementText` to use the same helper (or delegate to it), returning the full body rather than the first substantial line.
- [ ] 1.4 Run `SHALL`/`MUST` detection over the full captured body in both paths.

## 2. Requirement recognition + parity (#498)

- [ ] 2.1 In `MarkdownParser.parseRequirements`, treat a level-3 child as a requirement only when its title matches `### Requirement:` (case-insensitive after normalization); ignore other level-3 headers.
- [ ] 2.2 Confirm `archive`'s rebuilt-spec validation (`validateSpecContent` → `parseSpec`) now recognizes requirements identically to `openspec validate`.

## 3. Tests

- [ ] 3.1 Regression (#361): a requirement with `SHALL` wrapped onto the second body line passes `validate --strict`.
- [ ] 3.2 Regression (#312): a requirement body containing a fenced code block with `#`-comment lines captures the full text and parses scenarios/counts correctly.
- [ ] 3.3 Regression (#498): a spec with a stray `### Documentation Requirements` divider passes `validate` AND `archive` (no phantom requirement).
- [ ] 3.4 Parity test: `validate` and `archive` agree (pass/fail and messages) over the #361/#498/#312 fixtures.
- [ ] 3.5 Guard test: legitimate single-line requirements are unaffected (display text and counts unchanged).
- [ ] 3.6 Cross-platform: fixtures and assertions use `path.join()`; multi-line capture works for LF and CRLF inputs.

## 4. Release

- [ ] 4.1 Add a changeset describing the parser-fidelity fixes (Fixes #361, #498, #312).
