---
'@fission-ai/openspec': patch
---

Fix `openspec archive` leaving `.openspec-archive.lock` behind on Windows. Node can report `dev: 0n` from a path stat while the open file handle reports the real volume id, so the claim-ownership check never matched and the stale lock blocked every later archive. The check now treats an absent device id as unavailable while still requiring the inode and the claim's contents to match before unlinking.
