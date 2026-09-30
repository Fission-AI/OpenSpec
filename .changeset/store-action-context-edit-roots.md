---
"@fission-ai/openspec": patch
---

Fix `status --json` for store-backed changes: `actionContext.allowedEditRoots` now lists the project that declares the store alongside the store, so apply no longer stops on a store-only edit scope. When no project on the current path declares the store, the constraint tells the agent to ask which repository to edit instead of naming the store.
