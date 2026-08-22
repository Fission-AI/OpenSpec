## Context

See `proposal.md` for motivation and measured output size. Bulk validation currently has one documented JSON contract: top-level `version: "1.0"`, a complete `items` array for the requested scope, `summary`, and `root`. Human bulk output lists every item before totals.

The preserved feasibility candidate proves that completed validation results can be projected while retaining totals, severities, scope, and exit status. It is not the proposed contract: the candidate reused `items` under top-level version `1.0`, which could let a consumer interpret a subset as the complete scope.

Live main currently has no top-level validation advisory collection outside the item results. Two open PRs affect the rebase gate rather than this proposal's current schema. #1710 adds `INFO` issues inside item records, which the whole-record projection naturally retains. #1698 proposes a top-level `overlaps` advisory collection; if it lands before implementation, the proposal artifacts must be updated to name `overlaps` explicitly and define its JSON field and human section before code is written.

## Goals / Non-Goals

**Goals:**

- Reduce human and agent-facing output when a bulk validation scope is dominated by clean items.
- Preserve the current complete report as the default and as explicit `full` mode.
- Give JSON findings an exact discriminator and a document that is intentionally distinct from full v1.
- Preserve complete item records, item order, issue detail and severity, requested scope, summary totals, root selection, and exit status.
- Reject ambiguous report requests before prompts, root selection, progress UI, or validation work.

**Non-Goals:**

- Improving validation runtime or skipping validation work for valid requests.
- Changing validation rules, strict-mode semantics, concurrency, full-report ordering, or exit codes.
- Adding summary-only output, alternate serializers, TOON, a general output framework, project defaults, or new dependencies.
- Changing omitted-`--report` targeted, interactive, or mixed-flag behavior.
- Automatically copying unknown future top-level report fields into the findings document.

## Decisions

### 1. Use one bulk report selector; keep serialization orthogonal

`--report` accepts `full` and `findings`. Omitting it preserves every existing command flow. Explicit `--report full` and `--report findings` are bulk-report selectors: both require an explicit, unambiguous bulk scope and neither is accepted with an item name. In particular, `openspec validate <item> --report full` is intentionally rejected rather than treated as a targeted alias.

This keeps report content separate from serialization: `--report findings` selects the findings contract, while `--json` serializes that contract. Help text is `Select bulk report content: full|findings; combine with --json for JSON`.

The existing CLI has command-specific projections (`--deltas-only`, `--requirements`, and `--no-scenarios`) but no generic `--only`, `--report`, or `--format` vocabulary. `--findings-only` and `--only findings` read like in-place filters on the existing JSON document. `--report findings` makes the separately versioned document intentional and avoids adding more booleans if another report contract is justified later.

### 2. Resolve active scope combinations and reject archive ambiguity

For an explicit report request, the canonical scope is resolved as follows:

| Input flags | Canonical scope |
|---|---|
| `--changes` | `changes` |
| `--specs` | `specs` |
| `--changes --specs` | `all` |
| `--all`, including `--all` plus either active subset | `all` |
| `--archived` | `archived` |

`--archived` combined with any active scope flag is rejected. An item name combined with any explicit report option is rejected, whether or not a bulk flag is also present. An explicit report option without a bulk scope and an unsupported report value are also rejected. Omitted `--report` retains current precedence and behavior, including existing mixed-flag behavior; this proposal does not retroactively tighten old invocations.

### 3. Fail invalid report requests before doing work

Report mode and scope are normalized before root resolution or validation. Invalid human requests write a targeted error to stderr, write nothing to stdout, render no prompt or spinner, perform no validation, and exit 1.

With `--json`, every invalid report request writes exactly one JSON document to stdout, writes no human text to either stream, performs no root resolution or validation, and exits 1:

```json
{
  "status": [
    {
      "severity": "error",
      "code": "invalid_validation_report_request",
      "message": "The requested validation report and scope cannot be combined.",
      "fix": "Use --report full|findings with one active bulk scope or --archived, without an item name."
    }
  ]
}
```

The `code` is stable. The message may identify the specific conflict while retaining that code and one-status-entry shape.

### 4. Use a distinct item-findings JSON document

`--json --report findings` returns:

```json
{
  "report": {
    "kind": "validation-findings",
    "version": "1.0",
    "scope": "archived",
    "returnedItems": 19,
    "totalItems": 895
  },
  "itemFindings": [
    {
      "id": "example-change",
      "type": "change",
      "valid": false,
      "issues": [
        {
          "level": "ERROR",
          "path": "tasks.md",
          "message": "4 incomplete tasks (15/19 completed)"
        }
      ],
      "durationMs": 3
    }
  ],
  "summary": {
    "totals": { "items": 895, "passed": 876, "failed": 19 },
    "byType": {
      "change": { "items": 895, "passed": 876, "failed": 19 }
    }
  },
  "root": {
    "path": "<resolved-root>",
    "source": "nearest"
  }
}
```

The typed projection is exactly the full result's item records filtered by `item.issues.length > 0`. It preserves full-report order and returns each selected record whole rather than rebuilding a fixed field list, so current fields and future additive item fields survive. `report.returnedItems` equals `itemFindings.length`; `report.totalItems` equals `summary.totals.items`. `ERROR`, `WARNING`, and `INFO` all count as item findings, regardless of whether the item's `valid` field is true.

The findings document has no top-level `items` or top-level `version`, and it carries the exact `report.kind: "validation-findings"` discriminator and exact JSON-string `report.version: "1.0"`. Contract tests assert the version value and its string type. Tests also assert that the document does not conform to the documented full-v1 contract, which requires top-level `version: "1.0"` and a complete `items` array. No claim is made about how arbitrary permissive parsers behave.

Live main has no additional top-level advisory collection to include. The implementation does not generically spread unknown full-result fields. At the rebase gate, each then-current top-level section must be inventoried and either explicitly named in the findings contract or deliberately excluded with maintainer review. If #1698 has landed, `overlaps` must remain a separate top-level advisory collection; it is not renamed to `itemFindings` and does not affect `returnedItems`.

JSON findings emit exactly one document on stdout and no stderr text.

### 5. Define human findings sections and order each stream independently

Human findings preserve stream ownership, but stdout and stderr may be buffered or interleaved by the caller. The contract therefore defines ordering independently within each stream and makes no relative-order promise between a stdout section and a stderr section.

Within stdout, sections appear in this order:

1. `Scope:` line.
2. If `itemFindings` is empty, `No item findings.`; otherwise there is no item row or item block on stdout.
3. `Totals:` for the complete scope.
4. The existing first-failure `Details:` command for active scopes when one is currently provided; findings mode does not invent a details line for archived scope.

Within stderr, sections appear in this order:

1. Item-finding blocks in full-report item order. Each block prints its item heading once, followed by every issue in issue order with its original `ERROR`, `WARNING`, or `INFO` label, path, and message. All three severities use stderr.
2. Any advisory section explicitly named at the implementation rebase gate. If #1698 lands, the `overlaps` section follows item-finding blocks on stderr and remains distinct from item findings.

Clean item rows are omitted. `No item findings.` says nothing about separately rendered advisories. Tests capture and assert each stream independently rather than asserting a merged stdout/stderr sequence. A valid findings request may retain existing progress behavior, which is outside this final-report per-stream ordering contract; the invalid-request path never renders progress UI.

### 6. Use one typed projector for active and archived results

Active and archived validation currently assemble similar result/summary envelopes on separate paths. Implementation defines one typed findings projection over the shared full-result contract and routes both paths through it. This prevents scope, ordering, whole-record preservation, and returned/total count rules from drifting. Human and JSON renderers consume that same projection; they do not independently filter.

### 7. Keep verdict, root, and platform behavior unchanged

For valid requests, findings mode validates the same requested items as full mode. `summary` is the full-scope summary and exit status is identical for the same scope and strictness. Warning- and info-only records remain visible even when they do not fail a non-strict run.

The report uses the same resolved repo or store root and native path values as full validation. No path construction or rewriting is introduced. The `--report` flag is registered on every currently supported completion surface: Bash, Zsh, Fish, and PowerShell. Only Zsh and Fish suggest the fixed `full` and `findings` values because only those existing generators consume registry value metadata. Bash and PowerShell remain unchanged beyond flag registration. This proposal does not add a completion capability or broaden the set of generators; any additional shell or agent completion surface requires separate justification.

## Alternatives Considered

### Reuse full-v1 `items` with only issue-bearing records

Rejected. Projection metadata does not undo the documented meaning of the complete `items` collection; a consumer can silently undercount clean items.

### Introduce projected `items` in a new full JSON version

Rejected for this contribution. A v2 union can be safe, but it creates a broader protocol migration for a narrow projection. A separate discriminator and `itemFindings` collection avoid changing full v1.

### Human-only compact output

Rejected as the recommendation. It is the smallest surface, but leaves the structured agent/log use case unsolved.

### Use `--findings-only` or `--only findings`

Rejected. Both frame the behavior as filtering the existing output shape. The report selector makes the distinct JSON contract intentional and composes with `--json` as content plus serialization.

### Document external filtering only

Safe and still supported. Callers can filter full JSON through `jq` or PowerShell, but the complete document still crosses the CLI boundary and each integration must recreate scope, summary, and exit-code discipline.

### Add summary mode or a general output framework

Rejected. Summary-only output omits actionable item findings. Alternate serializers, preferences, and frameworks expand maintenance and compatibility risk without evidence they are required.

## Risks / Trade-offs

- **A second JSON report contract is durable API surface.** Mitigation: one exact discriminator/version, one item projector, and reuse of full item records, summary, and root.
- **Output savings depend on corpus shape.** The measured matrix ranged from 4.9% on an issue-dense synthetic human case to 95.7% on the real 895-change archive. The 6,740-byte figure belongs to the feasibility candidate, not this exact envelope. Mitigation: claim output reduction only and remeasure the implemented envelope.
- **Item findings can be confused with top-level advisories.** Mitigation: `itemFindings`, `No item findings.`, separate advisory sections, and counts that cover item records only.
- **Unknown top-level fields could be dropped.** Mitigation: a required rebase inventory and explicit named-section decisions; no unbounded generic preservation promise.
- **Active and archived paths could drift.** Mitigation: one typed projector and shared contract tests.

## Migration Plan

- Ship as an additive option with no persisted configuration.
- Existing invocations and documented full-v1 parsers continue using the unchanged full report.
- New callers opt in and parse `report.kind: "validation-findings"` plus `itemFindings`.
- A rollback removes the option without migrating data or restoring files.
