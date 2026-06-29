# Design: Spec parser reading fidelity

## Verified call graph (against `main`)

| Extractor | Recognition rule | Body capture | Metadata skip | `SHALL`/`MUST` check | Reached by |
|-----------|------------------|--------------|---------------|----------------------|------------|
| `Validator.extractRequirementText` (+ `countScenarios`) | canonical `REQUIREMENT_HEADER_REGEX` `/^###\s*Requirement:\s*(.+)$/i` | first substantial line only | **yes** (`/^\*\*[^*]+\*\*:/`) | `containsShallOrMust` → `/\b(SHALL\|MUST)\b/` | `validate <change>` |
| `MarkdownParser.parseRequirements` → `req.text` | **every** level-3 child | first non-empty line only | **no** | `RequirementSchema.refine` → `text.includes('SHALL')` | `validate <spec>`; `archive` (proposal + rebuilt-spec checks) |

`ChangeParser extends MarkdownParser` and calls `this.parseRequirements`, so it is the same extractor — there is no third implementation. `specs-apply` (the archive rebuild) parses with `parseRequirementBlocksFromSection`, i.e. the canonical rule, so rebuilt main specs are already clean.

The table is the whole story: the two extractors differ in **four** columns (capture, metadata, recognition, predicate). Each difference is a reproduced bug.

## Root causes (each reproduced)

### 1. Single-line body capture (#361)

Both extractors return the first line and stop. A keyword on body line 2 is never seen.

```
### Requirement: Realtime quest updates
Quest-related operations (creation, claiming, completion, approval, denial)
SHALL propagate to all family members' dashboards in real-time.
```
- `validate <change> --strict` → `✗ ADDED "Realtime quest updates" must contain SHALL or MUST`
- `validate <spec> --strict` → `✗ requirements.0.text: Requirement must contain SHALL or MUST keyword`

### 2. Metadata before description, spec path only (#418)

```
### Requirement: File Serving
**ID**: REQ-FILE-001
**Priority**: P1

The system MUST serve static files from the root directory.
```
- `validate <change>` → **valid** (delta extractor skips metadata)
- `validate <spec>` → `✗ requirements.0.text: ...`; captured `req.text` = `**ID**: REQ-FILE-001`

The delta extractor was already taught to skip metadata; the spec extractor was not. Unifying them fixes #418 and prevents the next such drift.

### 3. Fenced block before the prose corrupts text (#312)

```
### Requirement: Config example then rule
```bash
# example config
export TOKEN=abc
```
The system SHALL load the token from the environment.
```
- `validate <spec>` and `validate <change>` both → `✗ ... must contain SHALL or MUST`; captured `req.text` = `` ```bash ``

The body loop breaks on `line.trim().startsWith('#')` (the `#` comment inside the fence) without consulting `codeFenceLineMask`. The original #312 (requirement counts) is already fixed at the section level; this is a distinct, still-live manifestation in the body extractor.

### 4. Divergent requirement recognition (#498)

`parseRequirements` treats every level-3 header as a requirement; the delta parser only canonical `### Requirement:`. A stray `### Documentation Requirements` divider → passes `validate <change>`, but `archive` emits non-blocking phantom `Proposal warnings in proposal.md`, and `validate <spec>` emits a blocking error. Archive does not hard-fail because `specs-apply` filters when rebuilding; the bug is the inconsistent signal.

## Approach

**One shared extractor.** A single helper takes the requirement block's lines plus the fence mask and returns the full body: all lines from after the header to the first `#### Scenario:` header detected on a **non-fenced** line, skipping fence-masked lines and `**metadata**:` lines. Both `extractRequirementText` and `parseRequirements` delegate to it. `SHALL`/`MUST` detection runs over the full body via one predicate (`containsShallOrMust`), replacing the substring/word-boundary split.

This is fence-aware **skip-and-join**, which is why the existing fence tests still pass: in `markdown-parser.test.ts:106`/`:139` the `SHALL` line comes first and the fenced markdown block after it, so skipping fenced lines leaves `text` exactly equal to the `SHALL` line — the asserted value. The case that breaks today (#312) is the inverse: fence *before* the prose, which no test covers.

**Canonical recognition (Tier 2).** `parseRequirements` filters level-3 children through the exported `REQUIREMENT_HEADER_REGEX`. `## REMOVED`/`## RENAMED` are parsed by separate functions (`parseRemovedNames`, `parseRenamedPairs`) and are unaffected.

## Existing test contract this change touches

`test/core/parsers/markdown-parser.test.ts` (15 tests, all green on `main`) encodes the current — buggy — behavior in three places:

- `:331` *extract requirement text from first non-empty content line* — asserts `req.text` is only the first of two body lines. **Tier 1** changes `req.text` to the full body; this test is updated to assert the joined body. (Its premise is the #361 bug.)
- `:258` *handle nested sections correctly* — fixtures use bare `### The system SHALL …` headers and assert two requirements. **Tier 2** recognition makes bare headers non-requirements; updated to use `### Requirement: …`.
- `:310` *use requirement heading as fallback when no content is provided* — bare header. **Tier 2**; updated similarly.

Tier 1 alone updates only `:331`. Tier 2 additionally updates `:258` and `:310`. No other tests are affected; the fence tests (`:106`, `:139`) are preserved.

## Alternatives considered

- **Patch each extractor separately.** Rejected — duplicated logic is exactly how they drifted (metadata skip in one, not the other).
- **Tier 2 as a separate opt-in lint instead of tightening recognition.** Keep `parseRequirements` permissive but add a warning when a level-3 header under Requirements is not `### Requirement:`. This avoids the behavior change and keeps bare-header support, but leaves `validate <change>` and `validate <spec>` recognizing different requirement *sets*, so it does not fully close #498. Offered as the conservative option; the proposal recommends tightening because all in-repo specs and the convention already require `### Requirement:`.
- **Treat a stray level-3 header as a hard error everywhere.** Rejected — newly fails specs that pass `validate <change>` today; tightening-to-convention is the least-surprising consistent rule.

## Edge cases for tests

- Display vs. detection: `req.text` becomes the full body; assert single-line requirements are unchanged and the `MAX_REQUIREMENT_TEXT_LENGTH` INFO (non-blocking) is not spuriously tripped for legitimate multi-line bodies.
- Metadata-only body (no prose) still correctly flags missing `SHALL`/`MUST`.
- Fenced `#### Scenario:`-looking or `#`-comment lines in the body do not end capture or fabricate a scenario.
- LF/CRLF/CR via `normalizeContent`; `~~~` and length-≥3 / leading-whitespace fences via existing `buildCodeFenceMask`.
- Guard: zero non-conventional level-3 headers under Requirements in `openspec/specs/` — Tier 2 is behavior-preserving for all in-repo specs.

## Out of scope: #559

Deferred — transcript shows an unqualified `changes/<id>/...` path (missing `openspec/` prefix), not a demonstrated folder-vs-title mismatch. Recommend a separate change once intended behavior is confirmed.
