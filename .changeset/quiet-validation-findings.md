---
"@fission-ai/openspec": minor
---

### New Features

- Add `openspec validate --report findings` for explicit bulk scopes. It returns only items with errors, warnings, or information while keeping full-run totals and exit codes. JSON output identifies the report and its scope; human output includes each finding's path and message. The default full report is unchanged.
