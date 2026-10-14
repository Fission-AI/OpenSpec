---
"@fission-ai/openspec": patch
---

Keys in a change's `.openspec.yaml` that start with a lowercase `x-` (for example `x-goal: G-12` or `x-jiraKey`) are now treated as your own extension metadata: OpenSpec no longer reports them as unknown, so `openspec validate --strict` passes on a change that carries them. Any other unrecognized key, including `X-Tracker` or a bare `x-`, is still reported.
