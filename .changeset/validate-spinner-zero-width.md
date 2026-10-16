---
'@fission-ai/openspec': patch
---

Stop `openspec validate --all` hanging on a zero-width TTY. Some hosts hand the
process a terminal that reports `columns === 0` — a pty inherited from a
pre-commit runner such as lefthook, or `script -qec`. ora computes how many
lines to erase as `ceil(width / columns)`, so zero columns makes that count
`Infinity` and the clear loop never ends: the command burned a core and wrote
hundreds of megabytes of cursor escapes without finishing. The spinner is now
skipped when nothing can be drawn, and validate falls back to its plain output.
`OPEN_SPEC_INTERACTIVE=0` and `CI` now disable the spinner too, the same way
`--no-interactive` already did.
