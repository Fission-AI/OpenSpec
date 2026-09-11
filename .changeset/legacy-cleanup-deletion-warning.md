---
'@fission-ai/openspec': patch
---

Stop claiming legacy cleanup has "No user content to preserve". Files and directories on the removal list are deleted entirely — `openspec/AGENTS.md` is detected by existence alone, never by content, and legacy command directories are removed recursively — so the summary now says the files are deleted entirely and asks you to back up custom content first.
