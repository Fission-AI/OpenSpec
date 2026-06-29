## Why

OpenSpec's promise is that the spec is the source of truth. That promise breaks when the parser silently *misreads* valid Markdown. Three confirmed defects in the requirement-parsing layer cause spec content to be dropped or judged inconsistently:

- **Wrapped `SHALL`/`MUST` is invisible (#361).** Requirement-text extraction returns only the *first* non-blank body line. Both extractors do this: the validator's `extractRequirementText` ([validator.ts](../../../src/core/validation/validator.ts) returns the first substantial line) and `MarkdownParser.parseRequirements` ([markdown-parser.ts](../../../src/core/parsers/markdown-parser.ts) takes `firstLine`). When an author wraps a requirement across two lines and the normative keyword lands on line 2, `openspec validate --strict` reports `must contain SHALL or MUST` for a requirement that plainly contains it. Users are forced to reformat valid prose to satisfy the tool.

- **`validate` passes but `archive` fails (#498).** The two commands recognize requirements by different rules. `openspec validate` inspects delta blocks split on `### Requirement:` (a non-`Requirement:` `###` header is simply not a requirement). `openspec archive` rebuilds the full spec and re-parses it with `MarkdownParser.parseRequirements`, which treats **every** level-3 child of the Requirements section as a requirement. A stray divider like `### Documentation Requirements` is ignored by `validate` but becomes a phantom requirement (no `SHALL`, no scenarios) at `archive` time, blocking the archive after validation already passed.

- **Fenced code blocks leak into requirement text (#312, residual).** The parser added a code-fence mask for section detection, but the requirement-body loop in `parseRequirements` still breaks on any line starting with `#` ([markdown-parser.ts:213](../../../src/core/parsers/markdown-parser.ts)) without consulting the mask. A `#`-comment inside a fenced code block in a requirement body truncates the captured text.

These are deterministic, reproducible, and currently unaddressed by any open PR. They undermine confidence in `validate`/`archive` as a gate.

## What Changes

- Make requirement-body text extraction **multi-line and fence-aware** in both the validator and the markdown parser, sharing one implementation so the two paths cannot drift again. The captured requirement text spans all body lines from the header down to the first `#### Scenario:` header, skips fenced code blocks, and skips `**metadata**:` lines — then `SHALL`/`MUST` detection runs over the whole body.
- Make `MarkdownParser.parseRequirements` recognize a requirement **only** when its level-3 header matches `### Requirement:`. Non-matching level-3 headers inside the Requirements section are no longer treated as phantom requirements, eliminating the `validate`/`archive` divergence in #498.
- Guarantee **`validate`/`archive` parity**: the rebuilt-spec validation performed during `archive` applies the same requirement-recognition rules as `openspec validate`, so a change that passes `validate --strict` cannot newly fail validation at `archive`.
- Add regression tests covering each reproduction (#361 wrapped keyword, #498 stray header, #312 fenced `#`), plus a parity test asserting `validate` and `archive` agree on the same fixtures.

Out of scope (investigated, deferred): #559 (folder-name vs. title confusion). Its reproduction transcript shows an agent dereferencing an unqualified `changes/...` path (missing the `openspec/` prefix) rather than a pure name/title mismatch; the root cause is ambiguous and warrants its own change once clarified. See `design.md`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-validate`: requirement-text extraction becomes multi-line and fence-aware; `SHALL`/`MUST` detection runs over the full requirement body.
- `cli-archive`: rebuilt-spec validation recognizes requirements using the same rules as `openspec validate` (parity guarantee).
- `openspec-conventions`: only `### Requirement:`-prefixed level-3 headers identify requirements; other level-3 headers under Requirements are not requirements.

## Impact

- `src/core/parsers/markdown-parser.ts` — multi-line, fence-aware requirement-body extraction; recognize only `### Requirement:` headers.
- `src/core/validation/validator.ts` — `extractRequirementText` captures the full body; share extraction logic with the parser.
- `test/core/parsers/*`, `test/core/validation/*` — regression + parity tests.
- Fixes #361, #498, #312. Related: #559 (deferred), and the archive data-integrity work in #1112/#1246/#1277 (this change hardens the *reader* those rely on).
