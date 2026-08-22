---
'@fission-ai/openspec': minor
---

show: add `--diff`, which renders each delta requirement against the requirement it replaces in the main spec instead of reprinting the whole block. A MODIFIED requirement has to carry every scenario it keeps, so reviewers could not see what a change actually altered without diffing files by hand. `openspec show <change> --diff` now prints a colorized unified diff per requirement (additions green, removals red), the full text of ADDED requirements, the authored Reason/Migration text of REMOVED ones, and FROM/TO for RENAMED ones; a requirement that is renamed and modified in the same delta is diffed against its old name. `--json --diff` keeps the existing payload shape and adds a `diff` (or `warning`) field to MODIFIED deltas only. Main specs resolve against the same root as the change, so `--store <id>` diffs against that store. Without `--diff`, `openspec show <change>` prints exactly what it printed before.
