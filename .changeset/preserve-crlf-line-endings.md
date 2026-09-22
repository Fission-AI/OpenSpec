---
"@fission-ai/openspec": patch
---

Preserve a file's existing line endings when rewriting it, so Windows users no longer get whole-file diffs. Applying a delta to a CRLF spec (the default on a Windows checkout with `core.autocrlf=true`) rewrote the file to LF, turning a one-requirement change into a diff that touched every line. `openspec archive` now writes the spec back with the convention it already used; a spec that does not exist yet is still written with LF.

The same fix covers marker-managed files: installing or updating shell completions in a CRLF `.bashrc` or `.zshrc` no longer leaves the file with mixed endings, which `bash` reports as `$'\r': command not found`.

Removing a managed block is fixed the same way: the blank-line collapse in `removeMarkerBlock` rebuilt its separator as a bare LF, so cleaning up legacy artifacts left a lone LF inside an otherwise-CRLF `CLAUDE.md` or rc file.

`scripts/pack-version-check.mjs` now spawns `npm` through `cross-spawn`, so the release guard can run on Windows, where `npm` is `npm.cmd` and cannot be resolved by `execFile`.
