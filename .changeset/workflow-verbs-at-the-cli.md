---
"@fission-ai/openspec": patch
---

Answer workflow verbs typed at the CLI with the invocation this project actually uses. `openspec propose`, `openspec explore`, `openspec apply` and the other workflow names no longer fail with a bare `unknown command`; they explain that workflows run inside the AI assistant and name the spelling each configured tool answers to, or point at `openspec init`, `openspec config profile`, or `openspec update` when the workflow is not installed or the project does not match the global config. Real CLI commands (`new`, `update`, `archive`) and genuinely unknown commands are unchanged.
