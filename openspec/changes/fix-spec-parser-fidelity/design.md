# Design: Spec parser reading fidelity

## Context

Two independent code paths extract "the requirement text" and then check it for `SHALL`/`MUST`:

| Path | Entry point | Used by |
|------|-------------|---------|
| Delta-block parser | `Validator.extractRequirementText(blockRaw)` over `### Requirement:` blocks under `## ADDED/MODIFIED Requirements` | `openspec validate` |
| Full-spec parser | `MarkdownParser.parseRequirements` over the rebuilt main spec | `openspec archive` (via `validateSpecContent` → `parseSpec`) |

Both currently capture **only the first non-blank body line**, and they recognize requirements by **different rules**. That combination produces the three bugs.

## Root causes

### 1. Single-line body capture (#361)

`Validator.extractRequirementText` returns the first substantial line and stops (`return trimmed`). `MarkdownParser.parseRequirements` likewise selects `directContent.split('\n').find(l => l.trim())` — the first non-empty line only. A requirement whose normative keyword wraps onto line 2:

```markdown
### Requirement: Quest Instance Realtime Updates

Quest-related operations (creation, claiming, completion, approval, denial)
SHALL propagate to all family members' dashboards in real-time.
```

yields captured text `Quest-related operations (...)` with no `SHALL` → false `must contain SHALL or MUST` error.

### 2. Divergent requirement recognition (#498)

`parseRequirements` treats **every** level-3 child of the Requirements section as a requirement, including dividers like `### Documentation Requirements`. The delta-block parser only ever sees `### Requirement:`-prefixed blocks. So a stray header passes `validate` (not a delta requirement) but fails `archive` (a phantom requirement with no `SHALL`/scenario in the rebuilt spec).

### 3. Fence mask not consulted in the body loop (#312)

`parseRequirements` walks `child.content` and breaks on `line.trim().startsWith('#')` to stop at scenarios — but it never consults `codeFenceLineMask`. A `#`-comment inside a fenced code block in the requirement body truncates the captured text. The fix for #1 must also be fence-aware here.

## Approach

**One shared extractor.** Introduce a single function that, given a requirement block's raw lines and the fence mask, returns the full requirement body text (all lines from after the header to the first `#### Scenario:` header, skipping fenced regions and `**metadata**:` lines, joined with spaces/newlines). Both `Validator.extractRequirementText` and `MarkdownParser.parseRequirements` call it, so they cannot drift again. `SHALL`/`MUST` detection runs over the full returned body.

**Recognize only `### Requirement:` headers.** `parseRequirements` filters level-3 children to those whose title begins with `Requirement:` (case-insensitive, after normalization). Non-matching level-3 headers are not requirements. This aligns the full-spec parser with the delta parser and the documented convention, closing the #498 divergence at the source rather than by adding a second validation surface.

**Parity guarantee.** Because `archive`'s rebuilt-spec validation now recognizes requirements by the same rule `validate` uses, a change that passes `validate --strict` cannot newly fail validation at `archive` for requirement-recognition reasons. A parity test asserts this over the bug fixtures.

## Alternatives considered

- *Patch each extractor separately.* Rejected — duplicated logic is exactly how the two paths drifted; a shared extractor is the durable fix.
- *Make `archive` warn-only on phantom headers.* Rejected — it hides the inconsistency instead of removing it, and leaves `validate`/`archive` semantics different.

## Out of scope: #559 (folder name vs. title)

Investigated and deferred. The reproduction transcript shows the agent reading `changes/<id>/proposal.md` (unqualified) and getting `ENOENT`, then succeeding at `openspec/changes/<id>/proposal.md`. That is a missing-`openspec/`-prefix path resolution, not a demonstrated folder-vs-title divergence. Folding a speculative fix into a parser-fidelity change would blur its scope. Recommend a separate change once the intended behavior (warn on mismatch? canonicalize unqualified paths?) is confirmed with the reporter.

## Risks

- Multi-line capture could change `requirement.text` used elsewhere (e.g. display). Mitigation: keep a short single-line `text` for display if needed, but run `SHALL`/`MUST` detection over the full body; tests assert display output is unchanged for single-line requirements.
- Filtering non-`Requirement:` headers could drop content authors intended as requirements. Mitigation: this matches the documented convention; the regression suite includes a fixture confirming legitimate requirements are unaffected.
