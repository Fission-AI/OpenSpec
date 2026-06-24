# Design

## Decision

Use an archive-time conflict gate instead of scenario-level auto-merge.

## Rationale

`MODIFIED` currently means a complete requirement block replacement. Automatically merging scenario lists would change that contract and make deliberate scenario removal ambiguous. A conservative guard preserves the existing replacement model while preventing the specific data-loss failure from Issue #1246.

## Approach

- Parse `#### Scenario:` headings from the current canonical requirement block and from the incoming modified block.
- During `MODIFIED` application, compare scenario headings by trimmed, case-sensitive name.
- If any current scenario heading is absent from the incoming block, throw a clear error before any spec write happens.
- Continue to prepare all spec updates before writing, preserving existing all-or-nothing behavior.

## Trade-offs

This does not solve all stale-base drift cases. It specifically blocks the high-impact scenario deletion case described in Issue #1246. A later base-fingerprint design can extend drift detection for broader body text or requirement removal changes.
