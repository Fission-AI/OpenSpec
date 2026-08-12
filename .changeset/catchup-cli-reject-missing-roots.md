---
"@fission-ai/openspec": patch
---

`openspec validate --all` and `openspec list --json` no longer silently pass when run outside an OpenSpec project. From a directory with no root they used to resolve the current directory as an implicit root, exit 0, and report empty results — a false pass for CI and agents. Bulk validation (`--all`, `--changes`, `--specs`) and `list` now require an existing root (the `openspec/project.md` fallback for legacy projects is kept), while direct validation and other intentional implicit-root workflows are unchanged. Thanks [@clay-good](https://github.com/clay-good)! ([#1612](https://github.com/Fission-AI/OpenSpec/pull/1612))
