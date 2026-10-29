---
"@fission-ai/openspec": patch
---

Switching to skills-only delivery no longer deletes a command file you edited. `openspec init` and `openspec update` now compare each generated command file against what OpenSpec would write before removing it; anything that differs is left on disk and listed by path, with a line telling you to move what you want into the skill and delete the rest by hand. The comparison ignores a UTF-8 BOM and CRLF line endings, so a Windows checkout is not mistaken for an edit, and it accounts for files written under a different profile than the one now configured. A file that cannot be read or deleted, or a symbolic link that points outside the project, is left alone and listed separately, so one bad entry no longer stops the rest of the cleanup.
