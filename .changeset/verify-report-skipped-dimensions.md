---
"@fission-ai/openspec": patch
---

Stop `/opsx:verify` from reporting skipped checks as passing. Task completion now uses the schema-aware `tasks` and `progress` fields returned by apply instructions, while absent spec or design inputs are mapped to every check they prevent. When apply metadata has no task entries, verification still reads available task artifact files, including glob outputs. Verification stays advisory and does not require optional or intentionally omitted artifacts. The scorecard identifies each skipped check, and the final assessment does not claim archive readiness when any check did not run.
