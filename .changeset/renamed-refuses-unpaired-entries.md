---
'@fission-ai/openspec': patch
---

Refuse a `## RENAMED Requirements` section whose `FROM:` and `TO:` lines do not pair up, instead of guessing. The reader kept one pending pair and dropped whatever did not fit: a `TO:` before its `FROM:`, a `FROM:` displaced by a second `FROM:`, or a trailing `FROM:` vanished with no diagnostic. Listing the old names and then the new ones paired the second `FROM:` with the first `TO:`, so `openspec archive` renamed a requirement the delta never named, under a name written for a different one, and exited 0. `openspec validate` now reports each unpaired line as an ERROR with its line number, and archive refuses the change until the pairing is fixed. Well-formed renames, including several consecutive pairs, are unchanged. A change that used to archive with a malformed RENAMED section is now rejected. Fixes #1805.
