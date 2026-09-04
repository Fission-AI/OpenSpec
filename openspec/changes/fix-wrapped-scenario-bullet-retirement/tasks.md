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

## 3. Tests

- [x] 3.1 Retire a capability whose scenario bullet wraps with indentation — the
      reporter's exact shape
- [x] 3.2 Retire one whose bullet wraps without indentation (CommonMark lazy
      continuation), which is what an editor that hard-wraps produces
- [x] 3.3 Keep refusing when a wrapped note follows the last scenario, and assert
      the scenario's own wrapped remainder is not named among the blocking lines
- [x] 3.4 Keep refusing a table row, block quote, raw HTML, and heading written
      directly beneath a bullet

## 4. Verify

- [x] 4.1 Mutation-check every new guard: revert the fix and confirm both
      retirement tests fail; neuter `opensOwnBlock` and confirm all four block
      tests fail; revert the fix and confirm the wrapped-note test fails
- [x] 4.2 Run the full suite and confirm no existing test changes behavior
- [x] 4.3 Run lint, typecheck and the build
- [x] 4.4 Run `openspec validate --specs --strict` on this repo
- [x] 4.5 Add a `.changeset/` entry
