---
"pscode": minor
---

feat(dixi): complete dixi profile with 8 real workflows and JIRA MCP integration on init

`profiles.ts` and `init.ts` updated for the `dixi` profile:

- **`ALL_WORKFLOWS`** gains 7 new IDs: `rfc`, `design`, `tasks`, `arch-check`, `adr`, `jira-sync`, `dod`
- **`PROFILES.dixi`** now has the correct description and 8 workflows: `rfc`, `design`, `tasks`, `apply`, `arch-check`, `adr`, `jira-sync`, `dod`
- **`WORKFLOW_TO_SKILL_DIR`** in both `init.ts` and `profile-sync-drift.ts` maps all 7 new IDs to `pscode-dixi-*` directories
- **`pscode init --profile dixi`** now generates `pastelsdd/jira.yaml` (with `project_key`, `board_url`, `configured: false`) and merges `.mcp.json` with the Atlassian MCP server entry — both operations are idempotent
