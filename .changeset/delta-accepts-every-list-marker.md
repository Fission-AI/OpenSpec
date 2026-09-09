---
'@fission-ai/openspec': patch
---

Read a removal or rename written with `*` or `+` as the operation it is. CommonMark opens a bullet list with `-`, `*` or `+`, but the bullet form of `## REMOVED Requirements` and the `FROM:`/`TO:` lines of `## RENAMED Requirements` both hardcoded `-`, so either other marker matched nothing at all. The operation then silently never happened: `openspec validate` reported the change valid, `openspec archive` exited 0 with "Specs updated successfully", and the requirement that was supposed to be deleted or renamed stayed exactly as it was. The change archived as complete, leaving the spec quietly disagreeing with the delta that was meant to update it. Both forms now accept `[-*+]`, the `FROM:`/`TO:` bullet stays optional, and the plain `### Requirement:` header form is unchanged. Fixes #1799.
