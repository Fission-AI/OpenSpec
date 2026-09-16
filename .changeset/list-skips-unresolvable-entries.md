---
'@fission-ai/openspec': patch
---

Stop one unresolvable file from breaking `openspec list`. To sort changes by recency, `list` stats every file inside each change, and any entry it could not stat failed the whole command: a dangling symlink, such as the `.#tasks.md` lock Emacs keeps beside every file with unsaved edits, or a symlink loop made `list` exit 1 and `list --json` report `"changes": []`, so agents discovering work through it saw no changes at all. An entry that no longer resolves (removed mid-walk, a dangling symlink, or a loop) is now skipped when computing a change's last-modified time. Valid symlinks are dated as before, and any other error, such as a permission failure, still fails the listing.
