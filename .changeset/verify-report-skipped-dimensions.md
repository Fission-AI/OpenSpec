---
"@fission-ai/openspec": patch
---

Stop `/opsx:verify` from reporting "All checks passed" for a dimension it never checked. `contextFiles` is keyed by artifact id, so a schema without a `tasks` or `specs` artifact makes those branches no-ops; the scorecard and final assessment now mark such a dimension `Not verified` instead of clean.
