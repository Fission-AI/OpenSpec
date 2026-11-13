# Design

## The decision this change makes

#1697 asked two questions before anyone wrote code, and both are answered here.

**Q1: is an explicit scenario-level operator the direction?** Yes, and this
change proposes the spelling. The alternatives are recorded below.

**Q2: should it also cover `REMOVED Scenario`?** Not here. See "Deliberately out
of scope".

## Why the declaration is a bullet inside the block, not a `####` header

The follow-up comment on #1697 suggested `#### RENAMED Scenario` with `FROM:`/
`TO:` bullets beneath it. **That spelling cannot work**, and the reason is worth
stating because it is the kind of thing that looks fine until the guard's
arithmetic is wrong:

`parseScenarioBlocks` counts EVERY non-fenced level-4 header as a scenario, on
purpose — the spec path's `countScenarios` does, so the delta path must, or a
`#### Edge case` dropped by a `MODIFIED` block slips past the loss check
(#1521, and `SCENARIO_HEADER`'s own comment warns against breaking that
parity). A `#### RENAMED Scenario` heading would therefore enter the comparison
as a scenario in its own right: the block gets credited with a scenario nobody
wrote, and `findMissingCurrentScenarios` starts answering a question about the
wrong set. A bullet cannot collide with it.

So the declaration is `#1697`'s own "Suggested fix" option 1, unchanged:

```markdown
- RENAMED SCENARIO FROM: `#### Scenario: Old title`
- RENAMED SCENARIO TO: `#### Scenario: New title`
```

## Why inside the requirement block, rather than a top-level section

A `## RENAMED Scenarios` section parallel to `## RENAMED Requirements` was the
other option #1793 offered. Two things decide against it:

1. **A scenario title is only unique within its requirement.** A top-level
   section must name the requirement for context, making every declaration a
   three-line form. Inside the block, the context IS the block.
2. **It would put the declaration on the wrong side of the parity seam.**
   `findMissingCurrentScenarios(current, incoming)` is the ONE function archive
   and validate share, exactly so the two cannot disagree about what counts as
   a dropped scenario (#1477). A declaration carried in the block is readable
   from `incoming.raw`, so both commands get it from the function they already
   both call, with no new argument and no plumbing at either call site. A
   top-level section would have to be threaded from `DeltaPlan` through both
   paths, and any caller that missed the new argument would silently lose the
   declaration — reopening precisely the validate/archive divergence #1477
   closed.

## Why a declaration is a claim, not a suppression

The stated successor must be a scenario in the same block. Without that check
the declaration would be a blanket `ignore this title`, and #1697's replay data
is unambiguous that the guard is catching real losses (4 caught by hand at
archive time, 2 shipped and repaired later). Requiring the successor means a
declaration can only ever say "this old title is now that new one", and the new
one has to be there to say it.

Consequences, all deliberate:

- **No credit without a successor.** A declaration naming an absent successor
  grants nothing, so the omission is still reported as a loss. The author gets
  both findings: the loss, and the reason the declaration did not answer it.
- **One instance per declaration.** Credit is multiplicity-aware like every
  other name in the comparison, so two instances of a title and one declaration
  still leaves one unaccounted for — a duplicate cannot hide a real loss behind
  a single declaration (#1246 / #1391).
- **Read from the incoming block only.** A declaration is never read out of the
  current spec. One that survived into canon would otherwise become a standing
  exemption for that title, which is the loophole the guard exists to refuse.
  (It cannot survive into canon anyway — see the strip below — but the parser
  does not rely on that.)
- **Merges are allowed.** Several declarations MAY name one successor: two
  scenarios superseded by a single narrower one. That is the shape both
  reporters described (#1793's house marker is literally spelled "Merged
  into"), so it is permitted rather than special-cased.
- **Unpaired halves are reported.** A `FROM:` with no `TO:`, or a `TO:` with no
  `FROM:`, is an error. #1806 found the requirement-level parser silently
  dropping unpaired halves, so a requested rename never happened while archive
  reported success; the same shape is refused here from the start rather than
  discovered later.

## Why the declaration does not land in the main spec

A main spec is what deltas merge INTO, and it never carries delta operation
markers — the sync guidance states this. The declaration is change-scoped
bookkeeping: leaving it behind would accrete one line per rename in the spec
forever and hand the next author a marker to copy forward into their own
`MODIFIED` block.

It is stripped before the "already in sync" comparison as well as before the
write, so re-archiving a change whose only edit was a declared rename is a
no-op rather than a whitespace rewrite.

## Deliberately out of scope

- **`REMOVED Scenario`** (#1697 Q2). A deliberate deletion is the other half of
  the "declare the omission" problem — 7 of the 26 hand-classified findings —
  but it is a strictly larger semantic: a rename requires a successor and
  authorizes no loss, while a removal authorizes loss and needs its own
  justification and probably its own reason text. Folding it in here would ship
  the loss-authorizing operator on the rename's evidence.
- **Scenario ids.** One corpus prefixes headings with `[cap-NNN]` and renumbers
  them in bulk (14 in one pass), which reads as a drop for the same reason. Each
  renumber is expressible as a declaration, but a first-class scenario identity
  would be a much larger format change (`ScenarioSchema` is `{ rawText }` and
  has no name field at all) and is not proposed here.
- **The stale-base class** (#1112 and #1697's 4 findings). Still blocked, and
  correctly: the remedy is reconciling against the current base.
- **Reporting the counts and added names when the guard fires** — #1809, open
  and independent. It prints facts and draws no conclusion; this change adds the
  declaration that lets an author state one. Neither needs the other. The two
  touch `findMissingCurrentScenarios`; this change leaves its signature and
  return type alone to keep the overlap textual rather than semantic.
