## Why

OpenSpec's promise is that the spec is the source of truth, and `validate`/`archive` are the gate that protects it. That gate is undermined by a fragmented requirement-parsing layer: there are **two** requirement extractors that disagree with each other and with the canonical delta parser. Each defect below was reproduced against `main` with the bundled CLI; outputs are quoted verbatim.

### 1. Wrapped `SHALL`/`MUST` is invisible (#361) — confirmed live, both paths

Requirement-text extraction captures only the **first** non-blank body line, then checks that line for a normative keyword. When an author wraps a requirement across two lines and the keyword lands on line 2, validation falsely rejects it.

```
### Requirement: Realtime quest updates
Quest-related operations (creation, claiming, completion, approval, denial)
SHALL propagate to all family members' dashboards in real-time.
```

- `openspec validate <change> --strict` → `✗ [ERROR] ... ADDED "Realtime quest updates" must contain SHALL or MUST` (delta path: `Validator.extractRequirementText` returns the first substantial line).
- `openspec validate <spec> --strict` → `✗ [ERROR] requirements.0.text: Requirement must contain SHALL or MUST keyword` (main-spec path: `MarkdownParser.parseRequirements` sets `text` to `firstLine`, then `RequirementSchema` refines it).

Both paths fail on the same valid input. Users are forced to reformat correct prose to satisfy the tool.

### 2. `validate` and `archive` disagree on what a requirement is (#498) — confirmed live

`openspec validate` and `openspec archive` recognize requirements by **different rules**:

- `openspec validate <change>` runs only `validateChangeDeltaSpecs`, which splits sections on the canonical `### Requirement:` header. A stray divider such as `### Documentation Requirements` is simply not a requirement, so **validate passes**.
- `openspec archive` additionally runs `validateChange(proposal.md)`, whose `parseRequirements` treats **every** level-3 header under a Requirements/ADDED section as a requirement. The stray divider becomes a phantom requirement with no `SHALL` and no scenario.

Reproduced: a change whose delta spec contains a stray `### Documentation Requirements` divider before a valid requirement validates cleanly, but at archive time prints:

```
Proposal warnings in proposal.md (non-blocking):
  ⚠ Requirement must contain SHALL or MUST keyword
  ⚠ Requirement must have at least one scenario
```

These warnings name a "requirement" the author never wrote and that `validate` never reported. (In this path the warnings are non-blocking and the archive still completes — `specs-apply` independently filters to `### Requirement:` blocks, so the rebuilt main spec is clean. The defect is the **inconsistent, confusing signal**, not a hard archive failure. The same phantom appears as a blocking error from `openspec validate <spec>` on a main spec that contains a stray level-3 header.)

### 3. Fenced code blocks are a regression hazard for the multi-line fix (#312)

The original #312 (a `#`-comment inside a fenced code block parsed as a header, corrupting requirement counts) is **already fixed** at the section level by the `codeFenceLineMask` added since v0.15.0 — verified: a spec whose requirement body contains a ` ```bash ` block with `#` comments validates and reports the correct requirement count today. However, the body-extraction loop in `parseRequirements` still breaks on any line starting with `#` **without consulting the fence mask** (`src/core/parsers/markdown-parser.ts`, the `line.trim().startsWith('#')` guard). This is harmless today only because the loop's result is reduced to the first line. The moment fix #1 captures the **full** body, that fence-unaware guard would truncate any requirement body containing a fenced `#` line — silently reintroducing #312. The multi-line extractor must therefore be fence-aware from the start.

## What Changes

- **One shared, multi-line, fence-aware requirement-body extractor**, used by both `MarkdownParser.parseRequirements` and `Validator.extractRequirementText`, so the two paths cannot drift again. It captures every body line from after the `### Requirement:` header down to the first `#### Scenario:` header, skipping fence-masked lines and `**metadata**:` lines. Normative-keyword detection runs over the full captured body.
- **Unify requirement recognition on the canonical rule.** `parseRequirements` recognizes a level-3 header as a requirement only when it matches the same `REQUIREMENT_HEADER_REGEX` (`/^###\s*Requirement:\s*(.+)$/i`) already used by the delta parser and `specs-apply`. Other level-3 headers under Requirements are not requirements. This closes the #498 divergence at the source rather than papering over it with a second validation surface.
- **One normative-keyword predicate.** The shared extractor's `SHALL`/`MUST` check uses a single predicate everywhere (today the Zod schema uses substring `text.includes('SHALL')` while the delta path uses word-boundary `\b(SHALL|MUST)\b` — a latent third inconsistency).
- **Regression + parity tests** for every reproduction above, plus a guard that valid single-line requirements and the repo's own specs are unaffected.

Out of scope (investigated, deferred): #559 (folder-name vs. title confusion). Its reproduction transcript shows an agent dereferencing an unqualified `changes/...` path (missing the `openspec/` prefix), not a demonstrated folder-vs-title mismatch; the root cause is ambiguous and warrants its own change once clarified. See `design.md`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-validate`: requirement-text extraction becomes multi-line and fence-aware; `SHALL`/`MUST` detection runs over the full requirement body using a single predicate.
- `cli-archive`: archive's requirement-recognition matches `openspec validate` — it no longer reports phantom-requirement warnings for non-`Requirement:` headers.
- `openspec-conventions`: only `### Requirement:`-prefixed level-3 headers identify requirements; recognition uses the canonical, case-insensitive header rule consistently across all parsers.

## Impact

- `src/core/parsers/markdown-parser.ts` — multi-line, fence-aware requirement-body extraction; recognize only canonical `### Requirement:` headers.
- `src/core/validation/validator.ts` — `extractRequirementText` captures the full body via the shared helper; single normative-keyword predicate.
- `src/core/parsers/requirement-blocks.ts` — export/reuse `REQUIREMENT_HEADER_REGEX` as the shared recognition predicate.
- `src/core/schemas/base.schema.ts` — align the `SHALL`/`MUST` refine with the shared predicate.
- `test/core/parsers/*`, `test/core/validation/*` — regression + parity tests.
- Affects all consumers of `parseRequirements`/`parseSpec` (`validate`, `view`, `show`, `archive`) consistently; verified zero non-`Requirement:` level-3 headers exist in the repo's specs, so valid specs are unaffected.
- Fixes #361, #498. Hardens #312 against regression. Related: #559 (deferred), and the archive data-integrity work in #1112/#1246/#1277 (this change hardens the *reader* those rely on; it does not touch their merge/drop logic).
