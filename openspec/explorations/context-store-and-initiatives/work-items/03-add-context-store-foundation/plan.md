# Add Context Store Foundation

## Status

Registration/resolution facade implemented.

## Source Of Truth

Start from `../direction.md`.

The relevant model is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Goal

Add the smallest core foundation for context stores without making the store
layer know about initiatives, collections, workspaces, or repo-local changes.

## Locked Direction

- Support one backend for the first slice: a Git/local checkout backend.
- Treat the actual context store root as a user-chosen local Git checkout or
  synced folder.
- Do not hide real team context stores under XDG data by default.
- Store the machine-local registry under global data:
  `$XDG_DATA_HOME/openspec/context-stores/registry.yaml`.
- Store portable context-store identity inside the store root:
  `<store-root>/.openspec-store/store.yaml`.
- Start with backend identity/config, strict validation, path helpers, and
  registry/metadata read-write helpers.
- Add a thin registration/resolution facade before initiative CLI wiring so
  callers do not manipulate raw registry and metadata YAML directly.
- Do not reimplement the TypeScript or Node filesystem APIs as the public store
  interface.
- Do not add initiative, collection, workspace-open, sync, pull, push, or CLI
  behavior in this slice.

## Initial Shape

Machine-local registry:

```yaml
version: 1
stores:
  acme-context:
    backend:
      type: git
      local_path: /Users/me/repos/acme-context
      remote: git@github.com:acme/context.git
      branch: main
```

Portable metadata in the store root:

```yaml
version: 1
id: acme-context
```

## Likely Repo Slice

- Add `src/core/context-store/foundation.ts`.
- Add `src/core/context-store/registry.ts`.
- Add `src/core/context-store/index.ts`.
- Export the core context-store foundation from `src/core/index.ts`.
- Add focused tests under `test/core/context-store/`.
- Keep specs untouched until a behavior/API contract is deliberately surfaced.

## Implemented Facade Slice

- Added `registerContextStore(...)`.
- Added `listRegisteredContextStores(...)`.
- Added `resolveRegisteredContextStore(...)`.
- Registration writes portable store metadata when missing, validates existing
  metadata when present, and merges/updates the machine-local registry.
- Resolution validates that the registry id matches the store-root metadata id.
- No Git clone, pull, push, sync, workspace state, collection manifest, or CLI
  behavior was added.
