---
"@fission-ai/openspec": patch
---

### Features

- **One default store for every repo on your machine** — `openspec config set defaultStore <id>` sets a machine-level fallback root: any command run outside a planning root, with no `--store` flag and no project `store:` pointer, resolves to that store. It sits at the bottom of the precedence list, so `--store`, a local root, and a project pointer all still win. The root banner and JSON `root` block report the distinct provenance `source: "global_default"`, so users and tooling can tell a machine-wide default from a repo's own pointer. A stale id degrades to the underlying store error with a fix that names `openspec config unset defaultStore`.
