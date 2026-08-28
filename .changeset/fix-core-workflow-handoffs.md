---
"@fission-ai/openspec": patch
---

Remove optional continue/new workflow handoffs from update and apply guidance. Missing artifacts now point directly to the existing status/instructions CLI, and intent changes use new change without requiring an installed skill. Preserve update's planning-only scope, store selection, and the core workflow set.

Remove the same unavailable workflow recommendations from runtime apply instructions, including text output. Distinguish missing planning artifacts from missing or empty tracking files so recovery does not require a ready artifact when planning is already complete.
