# Add Context Store Foundation Evidence

## Research Summary

Existing OpenSpec patterns point toward a small explicit foundation:

- Global data uses XDG/platform locations from `getGlobalDataDir()`.
- Workspace registries are machine-local convenience indexes under global data.
- Workspace portable state uses versioned YAML and strict Zod validation.
- Existing read/write helpers validate state before writing and use
  `FileSystemUtils.writeFile()` to create parent directories.
- Schema/backend-style code favors small explicit adapters and registries over
  heavy framework abstractions.

## Decisions

- The first context-store backend is Git/local checkout config only.
- OpenSpec records where the local checkout lives; it does not decide where real
  team stores are cloned by default.
- The local registry is not source of truth. It is a machine-local index.
- Store-root metadata is portable source-of-identity for the synced store.
- Initiatives and collections are later consumers, not part of the store
  foundation.
- A thin facade should hide raw registry/metadata writes before initiative CLI
  wiring.

## Implementation Evidence

- `src/core/context-store/registry.ts` registers Git/local context stores,
  lists local registry entries, and resolves registered stores with metadata id
  validation.
- `src/core/context-store/index.ts` exports the facade.
- `test/core/context-store/registry.test.ts` covers registration, registry
  merge/update, metadata mismatch rejection, listing, resolution, missing or
  mismatched metadata, and initiative collection mounting from a resolved root.

## Verification

- `pnpm exec vitest run test/core/context-store/foundation.test.ts`
- `pnpm exec vitest run test/core/context-store/registry.test.ts`
- `pnpm run build`
- `pnpm run lint`
- `git diff --check`
