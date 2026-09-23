## Context

See `proposal.md` for the failure this addresses. Every existing check in `validate` and `archive` takes one change and one base, the main specs as they are now. Nothing reads two active changes side by side, so nothing can see them converge.

The repository's parallel merge plan (`openspec-parallel-merge-plan.md`) calls this Phase 1: make overlap visible before building anything that acts on it. The open `add-change-stacking-awareness` change plans overlap warnings from a `touches` field that authors fill in by hand. This proposal needs no metadata. It reads the claims from the delta files each change already has, at requirement level, so it cannot drift from what archive will actually apply. The two fit together: declared intent from metadata, observed claims from deltas.

## Goals / Non-Goals

**Goals:**

- Show every requirement that more than one active change claims, before any of them archives.
- Give the author enough to judge the overlap without opening files: which changes, which operations, and whether the requirement exists today.
- Read exactly the files archive will apply, from the root the run selected.
- Stay out of the way: no new failure, no exit code change, nothing printed when there is nothing to report.

**Non-Goals:**

- Ranking overlaps by severity, or saying which archive order works. See decision 1.
- Detecting overlap at scenario level, or between changes and archived history.
- Changing any existing check, the findings report, or targeted `validate <item>` output.
- Deciding whether an overlap is intended. Overlap is often deliberate, such as a stacked pair or sequenced work, and nothing in a delta records intent.

## Decisions

### 1. Report claims, never a verdict

The obvious next step is to rank each overlap: this pair cannot both archive, this pair only works in one order. An earlier version of #1698 did that, and it was removed.

Knowing whether a given archive order aborts means reproducing the preconditions in `specs-apply.ts`, including the cases it treats as already synced rather than as collisions: an ADD of a requirement already present word for word, a rename whose source is gone but whose target is present, a REMOVED whose target is already absent. A second copy of those rules would be free to disagree with the code that does the writing. Tested against real archive runs, the ranked version did disagree. It reported conflicts for pairs that archive cleanly in either order, and in one case recommended the order that actually fails.

A wrong verdict is worse than none, because it tells an author to rewrite a change that would have archived fine. Ranking needs one applicability check that `archive` and `validate` both call. #1112 shows the same split from the other side, with `validate` passing a MODIFIED whose target does not exist and `archive` refusing it later. That shared check is future work. This proposal stays on the side of the line that cannot be wrong.

The one piece of context it does add is `inMainSpec`. Two changes editing shared text is a different situation from two changes each proposing a requirement that does not exist yet, and that fact is read directly from the main spec rather than predicted.

### 2. Advisory, and never a failure

Overlap never moves the exit code. Any error inside the scan is swallowed and the scan reports nothing, because every delta it reads is also read by the validation of each change, which reports unreadable or malformed files on its own path. Advisory output must never be the thing that fails a run.

### 3. Read what archive reads

Delta files are enumerated with `discoverSpecFiles()`, the same walk `archive` and `specs-apply` use. Nested capability ids such as `platform/session-layout` are included, and nothing is read that archive would ignore. Requirement names are matched with `normalizeRequirementName()`, the function the validator and archive already share. Both paths come from the resolved root, `root.changesDir` and `root.specsDir`, so a `--store` run scans the store it selected rather than a path rebuilt from the project root.

A requirement is identified by spec id plus normalized name. The same name in two different specs is not an overlap.

### 4. Where the report appears

The scan runs only for bulk validation with changes in scope, and is skipped below two changes, since one change cannot overlap anything. Targeted validation of a single item does not scan.

In human output the section follows the existing details and prints only when there is at least one overlap:

```text
⚠ 2 requirements are claimed by more than one active change:
  colors: Widget colors (not in the main spec yet)
    adds-focus ADDED, adds-hover ADDED
  widgets: Widget state (in the main spec)
    adds-focus MODIFIED, adds-hover MODIFIED
Whichever of these archives second lands on a spec the first one changed; re-read it before archiving.
```

In JSON, `overlaps` sits beside `items` and `summary` in the full v1 document:

```json
"overlaps": [
  {
    "specId": "widgets",
    "requirement": "Widget state",
    "inMainSpec": true,
    "claimants": [
      { "changeId": "adds-focus", "operation": "MODIFIED", "requirement": "Widget state" },
      { "changeId": "adds-hover", "operation": "MODIFIED", "requirement": "Widget state" }
    ]
  }
]
```

The field is present, possibly empty, whenever changes are in scope, including an empty scope, so a consumer sees one shape on every path. It is absent for `--specs` and `--archived`. The findings document from `--report findings` carries item findings only by design, so the scan is skipped on that path rather than computed and discarded.

### 5. Stable order

Overlaps are sorted by spec id, then requirement name, and claimants by change id, then operation. Sorting compares code units rather than using `localeCompare`, so the order does not change with the ICU locale of the machine and output can be diffed in CI.

### 6. Which changes count as active

The scan takes the list of change ids the run already resolved and never works out on its own what "active" means. If change state moves into metadata, as #1683 and the `status` discussion on #1813 suggest, only that one call site in `validate` changes.

## Risks / Tradeoffs

- **Noise from deliberate overlap.** A stacked pair will be reported every run. That is the cost of refusing to guess intent. It is one short section, it never fails anything, and it disappears when either change archives.
- **Requirement level only.** Two changes touching different scenarios of one requirement are reported. That matches how archive applies a MODIFIED block, which replaces the whole requirement.
- **Cost.** One extra read of each change's delta files and of the main specs those deltas name. Only specs some change claims are read.
