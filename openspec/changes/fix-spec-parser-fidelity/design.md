# Design: Spec parser reading fidelity

## Verified call graph (against `main`)

Two requirement extractors exist, reached by different commands:

| Extractor | Recognition rule | `SHALL`/`MUST` check | Reached by |
|-----------|------------------|----------------------|------------|
| `Validator.extractRequirementText` (+ `countScenarios`) over delta blocks | canonical `REQUIREMENT_HEADER_REGEX` `/^###\s*Requirement:\s*(.+)$/i` (via `parseRequirementBlocksFromSection`) | `containsShallOrMust` → `/\b(SHALL\|MUST)\b/` | `openspec validate <change>` (`validateChangeDeltaSpecs`) |
| `MarkdownParser.parseRequirements` → `req.text` | **every** level-3 child of the Requirements/ADDED section | `RequirementSchema.refine` → `text.includes('SHALL')` | `openspec validate <spec>` (`validateSpec`), `openspec archive` (`validateChange` on proposal.md **and** `validateSpecContent` on the rebuilt spec) |

`ChangeParser extends MarkdownParser` and calls `this.parseRequirements(...)`, so it is the *same* extractor — there is no third implementation. `specs-apply` (the archive rebuild) parses with `parseRequirementBlocksFromSection`, i.e. the *canonical* rule, so rebuilt main specs are already clean.

Both extractors share two defects: **(a)** they capture only the first body line, and **(b)** they recognize requirements by different rules. That combination produces the bugs.

## Root causes (each reproduced; outputs in proposal.md)

### 1. Single-line body capture (#361)

`extractRequirementText` returns the first substantial line and stops (`return trimmed`). `parseRequirements` selects `directContent.split('\n').find(l => l.trim())` — also the first non-empty line. A normative keyword on body line 2 is never seen. Confirmed false-negative on **both** the delta path and the main-spec path.

### 2. Divergent requirement recognition (#498)

`parseRequirements` treats every level-3 child as a requirement, including dividers like `### Documentation Requirements`. The delta-block parser only ever sees canonical `### Requirement:` blocks. So:

- `openspec validate <change>` → passes (divider is not a requirement).
- `openspec archive` → `validateChange(proposal.md)` counts the divider as a phantom requirement → non-blocking `Proposal warnings in proposal.md` for a "requirement" the author never wrote.
- `openspec validate <spec>` (main spec with the same divider) → the phantom surfaces as a **blocking** error.

The archive does **not** hard-fail here, because `specs-apply` filters to canonical headers when rebuilding, so `validateSpecContent(rebuilt)` passes and the write succeeds. The bug is the inconsistent, confusing signal across commands, not data loss.

### 3. Fence-mask not consulted in the body loop (#312, regression hazard)

The original #312 is fixed: `codeFenceLineMask` makes `parseSections` skip fenced lines, so requirement counts are correct today (verified). But the body loop in `parseRequirements` breaks on `line.trim().startsWith('#')` without consulting the mask. Harmless now (only the first line is used), but fix #1 captures the full body, at which point a fenced `#` line would truncate it — reintroducing #312. The new extractor must be fence-aware.

## Approach

**One shared extractor.** A single helper takes the requirement block's lines plus the fence mask and returns the full body: all lines from after the header to the first `#### Scenario:` header (the scenario boundary is detected only on **non-fenced** lines), skipping fence-masked lines and `**metadata**:` lines, joined preserving readable text. Both `Validator.extractRequirementText` and `MarkdownParser.parseRequirements` delegate to it, so they cannot drift again.

**Canonical recognition.** `parseRequirements` filters level-3 children through the exported `REQUIREMENT_HEADER_REGEX` (case-insensitive), identical to the delta parser and `specs-apply`. `## REMOVED`/`## RENAMED` requirements are parsed by separate functions (`parseRemovedNames`, `parseRenamedPairs`) and are unaffected.

**One keyword predicate.** The shared extractor exposes one `containsShallOrMust` used by the Zod refine and the delta path, replacing the substring/word-boundary split.

**Parity guarantee.** Because every command recognizes requirements by the same rule and detects keywords over the same full body, `validate` (change and spec) and `archive` agree on which requirements exist and whether each is well-formed. A parity test asserts this over the bug fixtures.

## Edge cases the implementation and tests must cover

- **Display vs. detection.** `req.text` feeds display and the `MAX_REQUIREMENT_TEXT_LENGTH` INFO check. Capturing the full body must not spuriously trip length INFO for legitimately multi-line requirements (the INFO is non-blocking, but tests assert single-line output/counts are byte-for-byte unchanged).
- **Metadata-only body.** A requirement with only `**ID**:`-style lines before its scenarios still yields no normative keyword → still correctly flagged.
- **Fenced scenario-looking lines.** A `#### Scenario:` or `#`-comment line *inside* a fenced block in the body must not end body capture or fabricate a scenario boundary.
- **Line endings.** Capture operates on `normalizeContent`-normalized text (LF/CRLF/CR), consistent with the existing "Parser SHALL handle cross-platform line endings" requirement.
- **Fence variants.** ` ``` ` and `~~~`, fences of length ≥3, and leading-whitespace fences are all masked (existing `buildCodeFenceMask` behavior); the body extractor relies on that mask rather than re-detecting fences.
- **No reclassification of valid specs.** Verified: zero non-`Requirement:` level-3 headers exist under Requirements in the repo's own specs, so the recognition change is behavior-preserving for all valid specs and CI fixtures.

## Alternatives considered

- *Patch each extractor separately.* Rejected — duplicated logic is exactly how the paths drifted; a shared extractor is the durable fix.
- *Make `archive`/`validate <spec>` warn-only on phantom headers.* Rejected — it adds a second validation surface and keeps semantics divergent instead of removing the divergence.
- *Treat a stray level-3 header as an error everywhere.* Rejected for this change — it would newly fail specs that today pass `validate <change>`; aligning on the canonical rule (divider is not a requirement) is the least-surprising, backward-compatible choice. A separate lint for stray headers could be proposed later.

## Out of scope: #559 (folder name vs. title)

Investigated and deferred. The reproduction transcript shows the agent reading `changes/<id>/proposal.md` (unqualified) and getting `ENOENT`, then succeeding at `openspec/changes/<id>/proposal.md` — a missing-`openspec/`-prefix path resolution, not a demonstrated folder-vs-title divergence. Folding a speculative fix into a parser-fidelity change would blur its scope. Recommend a separate change once the intended behavior (warn on mismatch? canonicalize unqualified paths?) is confirmed with the reporter.

## Risks

- **Behavioral change to `view`/`show` counts.** Filtering non-`Requirement:` headers changes counts only for specs that violate the convention; none exist in-repo. Mitigation: guard test over repo specs; changelog note.
- **Full-body text in downstream display.** Mitigation: keep display text concise (first line) while running detection over the full body, or document the widened `text`; tests pin single-line behavior.
