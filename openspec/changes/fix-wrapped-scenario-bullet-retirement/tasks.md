## 1. Reproduce

- [x] 1.1 Reproduce #1780 against the current build: the reporter's spec retires
      with its `THEN` bullet on one line and is refused with the same bullet
      wrapped, naming the wrapped remainder as the blocking content
- [x] 1.2 Confirm the second half of the report — the hint being suppressed — is
      already fixed on `main` by #1699, so this change is scoped to the
      classification alone

## 2. Fix the classification

- [x] 2.1 Track, inside each requirement block, whether the previous line was a
      list item or the continuation of one, and reset it on every construct that
      closes an item: a blank line, a fenced line, a setext underline, a scenario
      header, and any line that opens a block of its own
- [x] 2.2 Account for a continuation line exactly as the item above it was
      accounted for, so a wrapped scenario bullet is silent and a wrapped note
      below the last scenario is still named by its own first line
- [x] 2.3 Add `opensOwnBlock` for the constructs that interrupt a paragraph in
      CommonMark — ATX heading, fence, block quote, thematic break, table row,
      raw HTML — so none of them is swallowed by the bullet above it

## 3. Close the same hole for every list marker

- [x] 3.1 Confirm the gap first: a spec whose scenarios use `+` bullets passes
      `openspec validate --specs` and is refused retirement with every one of its
      bullets named as unaccounted content
- [x] 3.2 Read `+` as a list marker alongside `-`, `*` and ordered items, and
      confirm a `+` note written past the blank line that ends a scenario is
      still named and still blocks

## 4. Tests

- [x] 4.1 Retire a capability whose scenario bullet wraps with indentation — the
      reporter's exact shape
- [x] 4.2 Retire one whose bullet wraps without indentation (CommonMark lazy
      continuation), which is what an editor that hard-wraps produces
- [x] 4.3 Retire one wrapped under each list marker — `-`, `*`, `+` and an
      ordered item
- [x] 4.4 Retire one whose bullet wraps onto three lines, so the item is known to
      stay open past the first continuation
- [x] 4.5 Retire one whose spec is saved with CRLF endings, since the reporter
      ran on Windows and Windows is in the CI matrix
- [x] 4.6 Keep refusing when a wrapped note follows the last scenario, and assert
      the scenario's own wrapped remainder is not named among the blocking lines
- [x] 4.7 Keep refusing a `+` note written past the blank line, and assert the
      scenario's own `+` bullets are no longer named alongside it
- [x] 4.8 Keep refusing a table row, block quote, raw HTML, and heading written
      directly beneath a bullet
- [x] 4.9 Keep refusing a scenario whose bullets are split by a blank line - the
      shape this repository's own `cli-show` spec uses
- [x] 4.10 Pin the deliberate edge: a line written under a bullet with no blank
      line above it counts as part of that bullet

## 5. Verify

- [x] 5.1 Mutation-check every new guard against `main` and by reverting each
      guard in turn: 11 of the 15 cases fail on `main`; neutering
      `opensOwnBlock` kills the four block cases; dropping `+` from the marker
      set kills the plus case; closing the item after the first continuation
      kills the three-line wrap and the lazy-aside case
- [x] 5.2 Run the full suite and confirm no existing test changes behavior
- [x] 5.3 Run lint, typecheck and the build
- [x] 5.4 Run `openspec validate --specs --strict` on this repo
- [x] 5.5 Sweep all 36 of this repository's own specs through a simulated
      retirement on both `main` and this branch: identical verdicts (30
      retirable, 6 blocked), so no real spec changes classification
- [x] 5.6 Add a `.changeset/` entry
