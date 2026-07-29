---
"@fission-ai/openspec": patch
---

Telemetry no longer depends on `posthog-node`: the single usage event is sent with a plain fetch to the same endpoint. Installing OpenSpec no longer pulls the fast-publishing `posthog-node`/`@posthog/core`/`@posthog/types` tree, which broke downstream installs under supply-chain age policies like pnpm's `minimumReleaseAge` (#1390).
