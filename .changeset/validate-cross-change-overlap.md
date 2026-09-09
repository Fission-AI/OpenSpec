---
"@fission-ai/openspec": minor
---

`openspec validate --changes` (and `--all`) now reports requirements that more than one active change claims. Every existing check compares a single change against the *current* main spec, so two changes converging on one requirement are each individually valid — the collision only surfaces when the first one archives and the second starts failing, by which point its author has already implemented against a base that moved.

Each entry names the claiming changes and the operation each one applies (`ADDED`, `MODIFIED`, `REMOVED`, `RENAMED_FROM`, `RENAMED_TO`), and whether the main spec holds that requirement today — two changes editing shared text is a different situation from two changes each proposing it. Rename deltas are reported at both ends, since the old name collides with anyone editing it and the new name collides with anyone adding it.

The report is informational: overlap is often deliberate for stacked or sequenced work, so it never changes the exit code and makes no claim about which change is wrong. Under `--json` the entries appear in an `overlaps` array. Addresses [#1669](https://github.com/Fission-AI/OpenSpec/issues/1669) and [#1387](https://github.com/Fission-AI/OpenSpec/issues/1387).
