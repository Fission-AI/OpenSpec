# Add Collection Foundation Evidence

## Research Summary

Subagent and local review converged on the same direction:

- Item 4 should define the boundary between store identity and product-specific
  content meaning.
- The collection layer should own mounted namespaces and logical path fences.
- The context-store layer should stay content-agnostic.
- Initiative CRUD and initiative file shape belong to Item 5.
- A runtime injected registry is enough for now; persisted manifests and dynamic
  plugins are premature.
- A thin registration facade should hide metadata and local registry writes, but
  Item 4 should not depend on that facade.

## Clean-Code Notes

- Use module boundaries and mounted objects to carry context.
- Prefer `validateMount`, `parseCollectionPath`, `createCollectionRegistry`,
  and `mountCollections` inside the collection module.
- Avoid public helper names that stack every concept together, such as
  `validateContextStoreCollectionRelativePath`.
- Keep path resolution pure and lexical until a future write-capable layer
  deliberately handles symlinks, canonical parent paths, and backend behavior.
- Keep persisted YAML shape below the public setup surface. Runtime/public
  handles should use camelCase fields such as `storeRoot`; persisted backend
  state can continue to use `local_path`.

## Chosen Pattern

Use a two-step pattern:

```ts
const store = await registerContextStore({
  id: "acme-context",
  backend: gitLocalBackend({
    localPath: "/Users/me/repos/acme-context",
    remote: "git@github.com:acme/context.git",
    branch: "main",
  }),
});

const collections = createCollectionRegistry([
  { id: "initiatives", mount: "initiatives" },
]);

const mounted = mountCollections({
  storeRoot: store.storeRoot,
  collections,
});
```

For Item 4 itself, `mountCollections({ storeRoot, collections })` is the
canonical API. One-call setup facades, store lifecycle objects, builder DSLs,
and initiative-specific setup presets are deferred.

## Implementation Evidence

- `src/core/collections/runtime.ts` defines runtime collection
  definitions, registries, mounted collection contexts, logical path parsing,
  and mount/path resolution.
- `src/core/collections/index.ts` exports the collection module, and
  `src/core/index.ts` re-exports it for core consumers.
- `test/core/collections/runtime.test.ts` covers mount and id validation,
  logical path parsing, duplicate id/mount rejection, Windows-style roots,
  `createHandle(context)`, no filesystem creation, and generic `initiatives/`
  mounting.

## Verification

- `pnpm exec vitest run test/core/collections/runtime.test.ts`
- `pnpm run build`
- `pnpm exec vitest run test/core/collections/runtime.test.ts test/core/context-store/foundation.test.ts test/core/planning-home.test.ts`
- `pnpm exec vitest run test/utils/file-system.test.ts`
- `pnpm run lint`
- `git diff --check`
