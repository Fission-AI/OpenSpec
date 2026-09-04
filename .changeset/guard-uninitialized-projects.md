---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Generated skills and commands no longer adopt a project that never ran `openspec init`. Every workflow now checks `root` from `openspec list --json` before its first write: `"root": null` means the project is not set up, so the agent stops and asks whether to initialize it, target a store, or handle the request without OpenSpec, instead of letting `openspec new change` create `openspec/` in the current directory as a side effect. Skill descriptions now name OpenSpec so hosts stop offering these workflows in unrelated repositories.
