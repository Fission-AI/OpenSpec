---
"@fission-ai/openspec": minor
---

Keys in `.openspec.yaml` that start with `x-` (for example `x-goal: G-12` or `x-tracker`) are now extension metadata: OpenSpec ignores them without the unknown-key warning, so `openspec validate --strict` stays green for teams that keep tool-specific data beside a change. Any other unrecognized key is still reported.
