---
'@fission-ai/openspec': patch
---

Stop a store named `specs` or `changes` from taking over root selection. Stores are placed at `~/openspec/<id>`, so a store with one of those ids is itself `~/openspec/specs` or `~/openspec/changes`, and that made `$HOME` look like a planning root. Every command run anywhere under the home directory then resolved `$HOME` as the nearest root: the global `defaultStore` was never consulted, and `new change` wrote into `~/openspec/changes`, outside any store. A `specs/` or `changes/` directory that carries store metadata no longer counts as planning content of the directory above it, so these stores resolve like any other. A real project's `openspec/specs/` and `openspec/changes/` are unaffected.
