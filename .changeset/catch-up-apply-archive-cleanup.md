---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Apply no longer calls a change ready to archive too early** — When every tracked task is checked, `openspec instructions apply` now says the tracked tasks are complete and asks you to review or verify the change before archiving. The task guidance keeps steps that can only happen after archive in an optional `## Workflow follow-up` section of plain bullets, so they no longer block task completion.
- **Accurate archive cleanup errors** — When a change is archived but cleaning up a capability retirement fails, the error now says the change was archived and cleanup did not complete, instead of claiming every backup was kept. `--json` reports the new code `archive_retirement_cleanup_failed` instead of the generic `archive_error`.
