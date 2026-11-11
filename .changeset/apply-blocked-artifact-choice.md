---
"@fission-ai/openspec": patch
---

### Bug Fixes

- When apply is blocked and the `continue` workflow isn't installed, the apply workflow now creates only an artifact that unblocks apply: one in `missingArtifacts`, or one they depend on through `requires`. Before, it could pick any `ready` artifact, which in a custom schema could advance unrelated work and leave apply blocked. Run `openspec update` to refresh installed skills.
