---
"@fission-ai/openspec": patch
---

Stop `/opsx:verify` from reporting skipped checks as passing. Task completion now uses the schema-aware `tasks` and `progress` fields returned by apply instructions, while absent spec or design inputs are mapped to every check they prevent. The scorecard identifies each skipped check, and the final assessment does not claim archive readiness when any check did not run.
