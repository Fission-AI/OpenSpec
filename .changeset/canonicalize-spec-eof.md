---
"@fission-ai/openspec": patch
---

Canonicalize rebuilt specs to end with exactly one final LF. Previously a spec whose `## Requirements` section was last was rebuilt with a trailing blank line (`\n\n`), which failed Markdown whitespace checks after sync or archive. Internal spacing and content after the Requirements section are unchanged.
