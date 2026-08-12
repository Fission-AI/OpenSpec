---
"@fission-ai/openspec": patch
---

`openspec archive` no longer writes terminal escape codes to a redirected or captured stdout. Its confirmation prompts and the no-argument change picker drew their live UI with ANSI cursor-move sequences even when stdout was not a terminal — noise in a redirected log, and in some non-interactive hosts an unbounded render loop that could grow the captured output until the disk filled. When stdout (or stdin) is not a terminal, archive now reads the confirmations as plain text, and a no-argument run asks you to pass a change name up front instead of drawing a menu. Piped answers (`printf 'y\n' | openspec archive …`) and `--yes` behave as before, and interactive terminals are unchanged. Fixes #1526.
