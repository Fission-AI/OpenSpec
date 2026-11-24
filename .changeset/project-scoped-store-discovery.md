---
"@fission-ai/openspec": minor
---

### New Features

- **Project-scoped store registry** — Stores can now be bound per-project via a `.openspec-store/registry.yaml` file in the repository. OpenSpec picks them up automatically after clone (with the store folders on disk), so no manual `openspec store register` is needed. Multiple clones of the same store on one machine are now supported without conflict. Existing `store` commands accept a `--scope project` flag to register, list, unregister, remove, or doctor project-scoped bindings, and `store list` shows the owning registry directory for each project-scoped entry.

### Other

- Fully backward compatible — existing global-only setups continue to work unchanged; the project-scoped file is optional.
