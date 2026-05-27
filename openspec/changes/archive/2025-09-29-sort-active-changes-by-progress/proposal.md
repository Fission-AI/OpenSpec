# Change: Sort Active Changes by Progress

## Problem
- The dashboard currently lists active changes in filesystem discovery order.
- Users cannot quickly spot proposals that have not started or are nearly complete.
- Inconsistent ordering between runs makes it harder to track progress when many changes exist.

## Proposal
1. Update the Active Changes list in the dashboard to sort by percentage of completion in ascending order so 0% items show first.
2. When two changes share the same completion percentage, break ties deterministically by change identifier (alphabetical).

## Benefits
- Highlights work that has not started yet, enabling quicker prioritization.
- Provides consistent ordering across machines and repeated runs.
- Keeps the dashboard compact while communicating the most important status signal.

## Risks & Mitigations
- **Risk:** Sorting logic could regress rendering when progress data is missing.
  - **Mitigation:** Treat missing progress as 0% so items still surface and document behavior in tests.
- **Risk:** Additional sorting could impact performance for large change sets.
  - **Mitigation:** The number of active changes is typically small; sorting a few entries is negligible.

## Success Criteria
- Dashboard output shows active changes ordered by ascending completion percentage with deterministic tie-breaking.
- Unit coverage verifying the sort when percentages vary and when ties occur.
