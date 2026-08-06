---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Stop silently dropping unlabeled scenarios on archive** — `openspec validate` and `openspec archive` now recognize every level-4 (`#### `) child of a requirement as a scenario, matching how the spec is counted elsewhere. Before, the scenario-loss guard only recognized headers written exactly as `#### Scenario:`, so a `MODIFIED` requirement that dropped a differently-labeled child (for example `#### Edge case`) passed validation and was then permanently deleted by archive with no warning. Both paths now agree, so the loss is caught at authoring time. Scenario names are normalized when comparing (an optional `Scenario:` prefix and a CommonMark closing `#` run are ignored), so simply relabeling a scenario is not mistaken for dropping one.
