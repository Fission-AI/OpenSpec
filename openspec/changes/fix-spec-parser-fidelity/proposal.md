## Why

OpenSpec's promise is that the spec is the source of truth, and `validate`/`archive` are the gate that protects it. That gate is undermined by a fragmented requirement-parsing layer: the requirement **reader** is implemented twice — `MarkdownParser.parseRequirements` (used by `validate <spec>` and `archive`) and `Validator.extractRequirementText` + `countScenarios` (used by `validate <change>`) — and the two have drifted apart. Every defect below was reproduced against `main` with the bundled CLI; outputs are quoted in `design.md`.

The two readers differ in ways that are each a reproduced bug:

| | spec reader (`parseRequirements`) | delta reader (`extractRequirementText`/`countScenarios`) |
|---|---|---|
| Body capture | first line only | first line only |
| Skips `**metadata**:` lines | **no** | yes |
| Ignores fenced code in body | **no** | **no** |
| Counts fenced `#### Scenario:` | no (fence-masked) | **yes** |
| `SHALL`/`MUST` predicate | substring `includes('SHALL')` | word-boundary `\b(SHALL\|MUST)\b` |

### Reproduced bugs

- **#361 — wrapped keyword invisible.** Both readers capture only the first body line, so a `SHALL`/`MUST` on line 2 fails both `validate <change>` and `validate <spec>`.
- **#418 — metadata before description, spec path only.** A requirement that opens with `**ID**:`/`**Priority**:` lines passes `validate <change>` (delta reader skips metadata) but fails `validate <spec>` (`req.text` = `**ID**: REQ-FILE-001`).
- **#312 — fenced block before prose corrupts text.** The original count-corruption is already fixed by `codeFenceLineMask`, but the body loop is still fence-unaware: a fenced code block before the `SHALL` line makes `req.text` = `` ```bash `` on both paths today.
- **Fenced scenario counted as real (discovered during hardening, no open issue).** `countScenarios` matches `^####` with a fence-unaware regex, so a requirement whose only `#### Scenario:` lives inside a fenced example passes `validate <change>` — while the same content correctly fails `validate <spec>`. A malformed delta slips through the gate.
- **#498 — validate and archive disagree.** `validate <change>` recognizes requirements only by the canonical `### Requirement:` header; `parseRequirements` treats every level-3 header as a requirement. A stray divider like `### Documentation Requirements` is silently ignored by `validate <change>` but flagged by `archive` (non-blocking phantom warning) and `validate <spec>` (blocking error). The author gets no signal at validate time.

## What Changes

### Part A — unify the reader (fixes #361, #418, #312, fenced-scenario counting)

One shared, fence-/metadata-/multi-line-aware extraction used by **both** readers, so they cannot drift again:

- Requirement-body capture spans every line from after the `### Requirement:` header to the first `#### Scenario:` header found on a **non-fenced** line, skipping fence-masked lines and `**metadata**:` lines; `SHALL`/`MUST` detection runs over the full body.
- Scenario counting ignores fence-masked `####` lines, so fenced examples never count as real scenarios.
- One normative-keyword predicate (`\b(SHALL|MUST)\b`) replaces the substring/word-boundary split.

Part A only corrects what is *detected*. It fixes false negatives (#361/#418/#312) and one false positive (fenced scenario), and does **not** change which headers count as requirements.

### Part B — make the #498 divergence visible (safe, no recognition change)

`validate <change>` emits an **INFO**-level note when an `## ADDED`/`## MODIFIED Requirements` section contains a level-3 header that is not a canonical `### Requirement:` header — i.e. one the delta reader will silently skip. This surfaces the stray-header problem at validate time instead of letting it appear only at archive, **without** changing recognition. INFO never fails validation (not even `--strict`), so no currently-passing change newly fails.

### Rejected: tightening recognition to `### Requirement:` only

The tempting #498 fix — make `parseRequirements` recognize only `### Requirement:` headers — is **rejected**. Bare `### <statement>` headers (e.g. `### The system SHALL …`) are a **supported, widely-tested requirement format**: `test/core/validation.test.ts` asserts a bare-header spec is `valid`, and bare headers appear across `json-converter`, `archive`, and `spec` tests plus the `tmp-init` fixtures. Tightening would reclassify those as non-requirements and break a large swath of the suite (and likely real user specs). Surfacing the divergence (Part B) achieves consistency of *signal* without a breaking change to recognition. See `design.md` for the full analysis.

Out of scope (investigated, deferred): #559 — its transcript shows an unqualified `changes/...` path, not a proven folder-vs-title mismatch.

## Safety: the archive write path is unaffected

`specs-apply` (the archive rebuild) reconstructs specs from raw `### Requirement:` blocks via `extractRequirementsSection` + `RequirementBlock.raw` — it never calls `parseSpec`/`parseRequirements` and never reads `req.text`. Therefore changing the reader (Part A) **cannot alter archived spec content**; it only changes what `validate`/`view`/`show` report. Verified by inspection of `src/core/specs-apply.ts`.

## Existing-test impact

All 15 tests in `test/core/parsers/markdown-parser.test.ts` pass on `main`. Because recognition is unchanged, this proposal updates **one** test: `should extract requirement text from first non-empty content line` (`:331`), which asserts `req.text` is only the first body line — the #361 bug itself; it is updated to expect the full body. The fence tests (`:106`, `:139`) are preserved (skip-and-join keeps `SHALL`-first bodies intact). Bare-header tests (`:258`, `:310`) and `validation.test.ts`/`json-converter.test.ts` are **not** affected, because recognition does not change.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-validate`: requirement-text extraction becomes multi-line, fence-aware, and metadata-aware; scenario counting becomes fence-aware; one normative-keyword predicate; an INFO note surfaces non-`Requirement:` headers in delta sections.

## Impact

- `src/core/parsers/markdown-parser.ts` — shared multi-line/fence/metadata-aware body extraction.
- `src/core/validation/validator.ts` — `extractRequirementText` and `countScenarios` delegate to the shared, fence-aware helpers; INFO note for stray delta headers.
- `src/core/parsers/requirement-blocks.ts` — export the canonical `REQUIREMENT_HEADER_REGEX` for the INFO check.
- `src/core/schemas/base.schema.ts` — schema-level `SHALL`/`MUST` enforcement stays removed after #1280; the imperative validator uses the shared predicate.
- `test/core/parsers/markdown-parser.test.ts:331` updated; regression tests added.
- Read-only blast radius (display only, no write path): `view`/`list` requirement counts and `json-converter`/`spec` JSON `text` reflect the fuller body; `change-parser` delta descriptions built from `req.text` may span multiple lines; the `MAX_REQUIREMENT_TEXT_LENGTH` check is INFO (non-blocking). Requirement **counts** are unchanged (recognition unchanged).
- Fixes #361, #418, #312; surfaces #498. Related: #559 (deferred). Does not claim #1156 (PR #1280). Hardens the reader that #1112/#1246/#1277 rely on.
