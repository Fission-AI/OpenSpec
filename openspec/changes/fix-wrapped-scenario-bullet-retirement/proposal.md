## Why

`retire_capabilities: true` — the retirement path added for #1302 — is unusable on
any spec whose scenario bullets wrap onto a second line.

Before deleting a main spec, archive accounts for every non-blank line in the
file: if anything sits outside the parts the merge understands, the retirement is
refused rather than taking authored content with it. That audit reads the file a
line at a time, and a wrapped bullet's remainder is a line that is not a bullet,
not a heading and not a requirement statement — so it counts as content the merge
cannot name, and the retirement is refused.

Wrapping prose at a column limit is the norm in a repository that lints for it.
[#1780](https://github.com/Fission-AI/OpenSpec/issues/1780) reports a project held
to 100 columns, where effectively every scenario bullet longer than a short
sentence wraps, and therefore no capability in the project can be retired through
the supported path. The reporter hand-deleted the spec directory instead.

The same classification also decided whether the abort could name the marker at
all. That half is already fixed on `main` (#1696 / PR #1699): a spec with
unaccounted content now gets a hint that names the blocking lines instead of a
bare `Spec must have at least one requirement`. What is left is the
classification itself.

## What Changes

- A line inside a requirement block that continues the list item above it is
  accounted for as part of that item, not as a line of its own. Nothing may have
  closed the item first — no blank line, heading, fence, or new bullet — which is
  CommonMark's rule for a paragraph running on inside a list item, and covers both
  an indented remainder and a lazy (unindented) one.
- Lines that open a block of their own are excluded, so they are still weighed
  individually: a heading, a fence, a block quote, a thematic break, a table row,
  or raw HTML written directly beneath a bullet.
- Every CommonMark list marker counts as a list item. The audit named only `-`,
  `*` and ordered items, so a spec bulleted with `+` — which OpenSpec's own
  validator accepts without complaint — had *every* scenario bullet reported as
  unaccounted content and could not be retired at all. Found while hardening the
  wrapping fix; it is the same defect wearing a different marker.
- Nothing else changes. The audit still fails safe — a line it cannot classify
  still refuses the retirement — and a note written past the blank line that ends
  a scenario is still named and still blocks, wrapped or not.
- Not breaking: the only behavior that moves is which specs `retire_capabilities`
  accepts, and it moves strictly toward the specs it was always meant to accept.
  No spec that retired before stops retiring, and no content is deleted that was
  not already deletable.

## Capabilities

### Modified Capabilities

- `cli-archive`: states that a line continuing a wrapped list item is accounted
  for with that item, and that a line opening a block of its own is not.

## Impact

- **Affected behavior**: `openspec archive` and `openspec specs apply` on a change
  declaring `retire_capabilities: true`, for specs whose bullets wrap. The
  refusal, and the hint that names the blocking lines, are unchanged for every
  other shape.
- **Unaffected**: writing, validating and merging specs. `unaccountedContent` is
  read only by the retirement decision and the messages that explain it, so no
  spec content is parsed differently anywhere else.
- **Docs**: none required — no documented rule changes; a shape that the
  documented rule always implied now behaves that way.
