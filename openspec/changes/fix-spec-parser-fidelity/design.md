# Design: Spec parser reading fidelity

## The requirement reader is implemented twice

| | spec reader: `MarkdownParser.parseRequirements` → `req.text` | delta reader: `Validator.extractRequirementText` / `countScenarios` |
|---|---|---|
| Recognition | every level-3 child of the section | canonical `REQUIREMENT_HEADER_REGEX` `/^###\s*Requirement:\s*(.+)$/i` |
| Body capture | first non-empty line | first substantial line |
| Skip `**metadata**:` | no | yes |
| Fenced code in body | not skipped | not skipped |
| Fenced `#### Scenario:` | not counted (parseSections fence-masks it) | **counted** (`/^####\s+/gm` is fence-unaware) |
| `SHALL`/`MUST` | `text.includes('SHALL')` (substring) | `/\b(SHALL\|MUST)\b/` (word boundary) |
| Reached by | `validate <spec>`, `archive` | `validate <change>` |

`ChangeParser extends MarkdownParser` and reuses `parseRequirements`, so there is no third reader. Every row where the two columns differ is a reproduced defect.

## Reproductions (against `main`)

- **#361** — `### Requirement: …` with `SHALL` on body line 2 → `validate <change>` `✗ must contain SHALL or MUST`; `validate <spec>` `✗ requirements.0.text: …`.
- **#418** — metadata lines before a `MUST` description → `validate <change>` **valid**; `validate <spec>` `✗`, `req.text` = `**ID**: REQ-FILE-001`.
- **#312** — fenced block (with `#` comments) before the prose line → both paths `✗`; `req.text` = `` ```bash ``. (Distinct from the already-fixed section-count manifestation.)
- **Fenced scenario** — requirement whose only `#### Scenario:` is inside a ` ```markdown ` block → `validate <change>` **valid** (counts the fenced scenario); `validate <spec>` `✗ requirements.0.scenarios: must have at least one scenario`. The delta reader passes a malformed requirement.
- **#498** — stray `### Documentation Requirements` divider → `validate <change>` **valid**; `archive` prints non-blocking phantom `Proposal warnings in proposal.md`; `validate <spec>` blocking `✗`. (Also: `show`/`view` count the divider as a requirement — `count=2` with `text='Documentation Notes'`.)

## Approach

### Part A — one shared, fence-aware extraction

A single helper takes the requirement block's lines plus the fence mask and returns the full body: lines from after the header to the first `#### Scenario:` header found on a **non-fence-masked** line, skipping fence-masked lines and `**metadata**:` lines. A companion fence-aware scenario counter counts only non-fence-masked `####` headers. Both readers delegate to these. `SHALL`/`MUST` detection uses one predicate.

Why the existing fence tests still pass: in `markdown-parser.test.ts:106`/`:139` the `SHALL` line is first and the fenced block follows, so skipping fenced lines leaves `text` exactly equal to the `SHALL` line — the asserted value. The breaking case (#312) is the inverse — fence *before* prose — which no test covers.

### Part B — surface the #498 divergence (INFO, no recognition change)

`validateChangeDeltaSpecs` emits an INFO issue when an `## ADDED`/`## MODIFIED Requirements` section contains a level-3 header that does not match `REQUIREMENT_HEADER_REGEX` (so the delta reader will skip it). Under `--strict`, `valid = errors === 0 && warnings === 0` — **INFO is excluded**, so this never changes pass/fail; it only informs. This is the minimal change that makes `validate <change>` stop *silently* passing the #498 input.

## Why recognition tightening is rejected

The obvious #498 fix is to make `parseRequirements` recognize only `### Requirement:` headers. It is rejected because **bare `### <statement>` headers are a supported, tested requirement format**, not a convention violation:

- `test/core/validation.test.ts` builds a spec whose requirements are `### The system SHALL provide secure user authentication` (no `Requirement:` prefix) and asserts `report.valid === true`.
- Bare headers also appear as valid requirements in `test/core/converters/json-converter.test.ts`, `test/core/archive.test.ts`, `test/commands/spec.test.ts`, and `test/core/parsers/markdown-parser.test.ts` (`:258`, `:310`, and the fixtures at `:14`/`:22`/`:55`/`:85`).

Tightening would reclassify all of these as non-requirements, breaking those tests and silently dropping requirements from any real spec that uses the bare style. The cost is not justified by #498, whose harm is a *confusing signal*, not data loss (the archive rebuild already filters to `### Requirement:` blocks, so rebuilt specs are correct regardless). Part B fixes the signal safely. If maintainers later decide to make `### Requirement:` mandatory, that belongs in its own change with a deprecation cycle and fixture migration.

## Safety: write path is independent of the reader

`src/core/specs-apply.ts` rebuilds specs during archive from `extractRequirementsSection` + `RequirementBlock.raw` (raw text split on the canonical header). It does not import or call `parseSpec`/`parseRequirements` and never reads `req.text`. Consequently Part A changes only what is *read/validated/displayed*; archived spec bytes are unchanged. (Note: this means `specs-apply` already uses the canonical `### Requirement:` rule — another reason recognition divergence is a reader-only concern.)

## Read-only blast radius (no write path)

Consumers of `parseSpec`/`req.text`: `view.ts`/`list.ts` (requirement **counts** — unchanged, since recognition is unchanged), `json-converter.ts` (JSON `text` — now the full body), `spec.ts` (display), `change-parser.ts:96` (delta descriptions `Add requirement: ${req.text}` — may span lines), and the `MAX_REQUIREMENT_TEXT_LENGTH` INFO (non-blocking). None affect archived content or pass/fail of valid specs.

## Edge cases for tests

- Single-line requirement unchanged (text and count byte-for-byte).
- Metadata-only body still flags missing `SHALL`/`MUST`.
- Fenced `#### Scenario:` / `#`-comment lines do not corrupt text or inflate scenario count.
- LF/CRLF/CR via `normalizeContent`; `~~~`/length-≥3/leading-whitespace fences via existing `buildCodeFenceMask`.
- INFO note appears for a stray delta header but does not change `valid` (including `--strict`).

## Prior art

`findMainSpecStructureIssues` (`spec-structure.ts`) already flags a `### Requirement:` header *outside* the `## Requirements` section and delta headers inside a main spec. The Part B INFO note is complementary: it flags non-`Requirement:` headers *inside* a delta Requirements section, which that function does not cover.

## Out of scope: #559

Deferred — transcript shows an unqualified `changes/<id>/...` path (missing `openspec/` prefix), not a demonstrated folder-vs-title mismatch.
