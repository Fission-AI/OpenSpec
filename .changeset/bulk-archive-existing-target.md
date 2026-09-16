---
'@fission-ai/openspec': patch
---

Fix bulk archive nesting a change inside an existing archive target. The workflow now checks every archive target before it writes any main spec, the same order `openspec archive` uses. A change whose target already exists, or that shares a target with another selected change, is reported as failed and is never synced or moved, while the rest of the batch continues. The check runs again just before each move.
