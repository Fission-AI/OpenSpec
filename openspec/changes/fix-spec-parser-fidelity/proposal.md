## Why

OpenSpec's promise is that the spec is the source of truth, and `validate`/`archive` are the gate that protects it. That gate is undermined by a fragmented requirement-parsing layer: there are **two** requirement extractors that disagree with each other and with the canonical delta parser. Each defect below was reproduced against `main` with the bundled CLI; outputs are quoted verbatim in `design.md`.

The two extractors are `MarkdownParser.parseRequirements` (used by `validate <spec>`, and by `archive` via the proposal/rebuilt-spec checks) and `Validator.extractRequirementText` (used by `validate <change>`). `ChangeParser extends MarkdownParser`, so it reuses `parseRequirements` — there is no third implementation. The two have already drifted: the delta extractor skips `**metadata**:` lines; the spec extractor does not. That drift is the bug surface.

### 1. Wrapped `SHALL`/`MUST` is invisible (#361) — live, both paths

Extraction captures only the **first** non-blank body line, then checks that line. When a requirement wraps and the keyword lands on line 2, both `validate <change> --strict` and `validate <spec> --strict` falsely report `must contain SHALL or MUST`.

### 2. Metadata before the description breaks the spec path (#418) — live, asymmetric

A requirement that places `**ID**:`/`**Priority**:` metadata lines before its prose validates fine as a **change** (the delta extractor skips metadata) but fails as a **spec**: `validate <spec>` returns `req.text` = `**ID**: REQ-FILE-001` and reports `must contain SHALL or MUST`. This asymmetry is direct evidence for unifying the two extractors.

### 3. A fenced block before the prose corrupts requirement text (#312) — live

The original #312 (code-fence `#` lines counted as section headers, corrupting requirement counts) is **already fixed** by the `codeFenceLineMask` added since v0.15.0 — verified. But the body-extraction loop is still fence-unaware: it breaks on any line starting with `#`. When a requirement body opens with a fenced code block (e.g. a config example) before the `SHALL` line, the `#`-comment inside the fence ends extraction early and `req.text` becomes `` ```bash ``. Reproduced today on **both** paths. The same fence-unawareness would also truncate multi-line bodies once fix #1 lands, so the new extractor must be fence-aware from the start.

### 4. `validate` and `archive` disagree on what a requirement is (#498) — live

`validate <change>` recognizes requirements only by the canonical `### Requirement:` header; `parseRequirements` (used by `archive` and `validate <spec>`) treats **every** level-3 header as a requirement. A stray divider such as `### Documentation Requirements` is ignored by `validate <change>` but becomes a phantom requirement: `archive` prints non-blocking `Proposal warnings in proposal.md` for a "requirement" the author never wrote, and `validate <spec>` reports it as a blocking error. (Archive still completes — `specs-apply` independently filters to `### Requirement:`, so the rebuilt spec is clean. The defect is the inconsistent, confusing signal.)

## What Changes

The fixes fall into two tiers with different risk profiles. They are described separately so they can be reviewed — and if desired, merged — independently.

### Tier 1 — false-negative fixes (low risk): #361, #418, #312

- **One shared, multi-line, fence-aware, metadata-aware requirement-body extractor**, used by both `parseRequirements` and `extractRequirementText`, so they cannot drift again. It captures every body line from after the `### Requirement:` header to the first `#### Scenario:` header detected on a non-fenced line, skipping fence-masked lines and `**metadata**:` lines, and `SHALL`/`MUST` detection runs over the full captured body.
- **One normative-keyword predicate** everywhere (today the Zod schema uses substring `text.includes('SHALL')` while the delta path uses word-boundary `\b(SHALL|MUST)\b`).

Tier 1 only widens what is *read*; it does not change which headers count as requirements. It fixes false negatives without rejecting anything that passes today.

### Tier 2 — recognition consistency (behavior change, flagged for decision): #498

- **Unify requirement recognition on the canonical rule.** `parseRequirements` recognizes a level-3 header as a requirement only when it matches the same `REQUIREMENT_HEADER_REGEX` (`/^###\s*Requirement:\s*(.+)$/i`) used by the delta parser and `specs-apply`. This removes the phantom-requirement divergence in #498.

Tier 2 is a deliberate **tightening to the documented convention**. The parser is currently permissive — it accepts bare `### <text>` headers as requirements — and that permissiveness is what lets stray dividers become phantoms. Tightening aligns all commands but changes behavior for specs that use non-conventional headers (see "Behavior changes" below). The alternative — a separate opt-in lint that flags stray level-3 headers without changing recognition — is described in `design.md`; we recommend the tightening but defer the call to maintainers.

Out of scope (investigated, deferred): #559 (folder-name vs. title) — its transcript shows an unqualified `changes/...` path, not a proven name/title mismatch. See `design.md`.

## Behavior changes and existing-test impact

All 15 tests in `test/core/parsers/markdown-parser.test.ts` pass on `main`; this change updates three of them, each encoding behavior that is itself part of the bug:

- **Tier 1** updates `should extract requirement text from first non-empty content line` (`:331`) — it asserts `req.text` equals only the first body line. After the fix, `req.text` is the full (metadata-/fence-skipped) body. The existing fence tests (`:106`, `:139`), which put `SHALL` first and the fence after, are **preserved** because fenced lines are skipped during capture.
- **Tier 2** updates `should handle nested sections correctly` (`:258`) and `should use requirement heading as fallback when no content is provided` (`:310`) — both rely on bare `### …` headers being treated as requirements. After the tightening, requirements must use `### Requirement:`.

Migration for Tier 2: a changelog note that non-conventional `### <text>` requirement headers are no longer recognized; authors must use `### Requirement: <name>` (which the convention already mandates and all in-repo specs already follow — verified zero non-conventional level-3 headers exist under Requirements in `openspec/specs/`).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-validate`: requirement-text extraction becomes multi-line, fence-aware, and metadata-aware; `SHALL`/`MUST` detection runs over the full body using a single predicate.
- `cli-archive`: archive's requirement-recognition matches `openspec validate` — no phantom-requirement warnings for non-`Requirement:` headers (Tier 2).
- `openspec-conventions`: only `### Requirement:`-prefixed level-3 headers identify requirements, applied consistently across all parsers (Tier 2).

## Impact

- `src/core/parsers/markdown-parser.ts` — shared multi-line/fence/metadata-aware body extraction; canonical recognition (Tier 2).
- `src/core/validation/validator.ts` — `extractRequirementText` delegates to the shared helper; single keyword predicate.
- `src/core/parsers/requirement-blocks.ts` — export/reuse `REQUIREMENT_HEADER_REGEX` as the shared recognition predicate.
- `src/core/schemas/base.schema.ts` — align the `SHALL`/`MUST` refine with the shared predicate.
- `test/core/parsers/markdown-parser.test.ts`, `test/core/validation/*` — update the three tests above; add regression + parity tests.
- Affects all consumers of `parseRequirements`/`parseSpec` (`validate`, `view`, `show`, `archive`) consistently.
- Fixes #361, #418, #312. Tier 2 fixes #498. Related: #559 (deferred); hardens the *reader* the archive data-integrity work (#1112/#1246/#1277) relies on, without touching their merge/drop logic. Does not claim #1156 (covered by PR #1280).
