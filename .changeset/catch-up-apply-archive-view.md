---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Apply edits the right task** — `openspec instructions apply --json` now gives each task its `sourcePath` and `line`. The apply workflow checks the checkbox at that location before marking the task done and rechecks progress afterward, so agents update the exact task, even when tasks span several files.
- **Archive stops on a failed spec sync** — When the spec sync inside `/opsx:archive` reports a blocking condition, such as a capability retirement it could not complete, the archive now stops and leaves the change in place instead of archiving it with the main specs unchanged. The same applies to bulk archive.
- **Aligned `openspec view` progress bars** — Active change names up to 48 characters now line up their progress bars instead of pushing each bar out of line.
