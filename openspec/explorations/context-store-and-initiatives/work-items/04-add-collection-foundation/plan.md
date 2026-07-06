# Add Collection Foundation

## Status

First implementation slice implemented.

## Source Of Truth

Start from `../../direction.md`.

The relevant model is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Goal

Add the smallest collection foundation that lets product-specific content
systems mount inside a context store without making the context-store layer know
what those systems mean.

## Locked Direction So Far

- Treat Item 4 as a mount/path foundation, not a collection runtime.
- Keep collection composition runtime-only and dependency-injected.
- Keep context-store registration separate from runtime collection mounting.
- Use a future thin registration facade for metadata/registry setup instead of
  showing raw registry or metadata state writes in public examples.
- Do not add a persisted collection manifest yet.
- Do not add CLI behavior yet.
- Do not add generic `read`, `write`, `list`, or `delete` helpers.
- Do not add initiative file shape, initiative CRUD, or initiative validation
  yet.
- Prove `initiatives/` can mount through generic collection definitions, not
  through initiative-specific context-store logic.

## Naming Direction

Use the module/object boundary to carry context instead of growing helper names.

Use a focused generic module such as `src/core/collections/runtime.ts` with
short names:

```ts
validateCollectionId(id);
validateMount(mount);
parseCollectionPath(input);

createCollectionRegistry(...);
mountCollections(...);
```

Prefer mounted objects for context-aware operations:

```ts
const mounted = collections.require("initiatives");

mounted.resolvePath("launch-billing-flow/initiative.yaml");
mounted.toStorePath("launch-billing-flow/initiative.yaml");
```

Avoid names like `validateContextStoreCollectionRelativePath`. They indicate
that too much context has leaked into a standalone helper name.

## Minimal API Shape

The first slice should stay close to this:

```ts
interface CollectionDefinition<THandle = unknown> {
  id: string;
  mount: string;
  metadata?: CollectionMetadata;
  hooks?: CollectionHooks;
  createHandle?: (context: MountedCollectionContext) => THandle;
}

interface MountedCollectionContext {
  storeRoot: string;
  collectionId: string;
  mount: string;
  mountRoot: string;
  resolvePath(relativePath?: string): string;
  toStorePath(relativePath?: string): string;
}

interface MountedCollection<THandle = unknown> {
  collectionId: string;
  mount: string;
  mountRoot: string;
  context: MountedCollectionContext;
  handle: THandle | undefined;
}
```

Use `id` on definitions, but `collectionId` on mounted handles and contexts so
domain object IDs such as initiative IDs do not collide with collection type IDs.

## Setup And Mounting Pattern

Use two separate layers:

1. A context-store registration facade for setup.
2. A pure runtime collection mounting API for Item 4.

Registration should hide persisted YAML details:

```ts
const store = await registerContextStore({
  id: "acme-context",
  backend: gitLocalBackend({
    localPath: "/Users/me/repos/acme-context",
    remote: "git@github.com:acme/context.git",
    branch: "main",
  }),
});
```

The registration facade can call lower-level helpers such as backend config
normalization, metadata writes, and local registry writes internally. Public
examples should not call raw `writeContextStoreMetadataState(...)`,
`writeContextStoreRegistryState(...)`, or expose persisted snake_case backend
state such as `local_path`.

Item 4 mounting should stay independent of registration and accept only the
authority it needs:

```ts
const collections = createCollectionRegistry([
  { id: "initiatives", mount: "initiatives" },
]);

const mounted = mountCollections({
  storeRoot: store.storeRoot,
  collections,
});

mounted.require("initiatives").resolvePath(
  "launch-billing-flow/initiative.yaml"
);
```

Prefer `mountCollections({ storeRoot, collections })` as the canonical first
API. Passing a whole store handle can wait until there is a real need.

## Path Direction

- Mount names are single-segment kebab-case folder names such as `initiatives`,
  `decisions`, or `api-catalog`.
- Collection-relative paths are logical portable paths inside a mount.
- The path resolver is lexical only. It proves that a logical path belongs under
  a collection mount; it does not claim to be a filesystem security sandbox.
- Future write-capable helpers must revisit symlink and canonical parent-path
  handling before touching disk.

Reject:

- empty mounts
- `.`
- `..`
- hidden/reserved mounts such as `.openspec-store`
- absolute paths
- Windows drive paths
- UNC paths
- NUL bytes
- traversal segments
- sibling-prefix escapes

## Deferred

- Store-level collection config files.
- Dynamic plugin loading.
- One-call `setupContextStore({ id, backend, collections })` APIs.
- `createStore(...).setup()` lifecycle APIs.
- Builder-style setup DSLs.
- Initiative-specific setup presets in the generic context-store layer.
- Template override search paths.
- Rich validation execution.
- Agent guidance generation.
- Workspace integration.
- Git sync, commits, pull, push, watch, or conflict behavior.

## Implemented Slice

- Added a pure runtime collection module at
  `src/core/collections/runtime.ts`.
- Exported the module through `src/core/collections/index.ts` and
  `src/core/index.ts`.
- Added focused tests under `test/core/collections/runtime.test.ts`.
- Proved a generic `{ id: "initiatives", mount: "initiatives" }` definition can
  mount and resolve paths without initiative-specific store logic.
- Kept validation/template hooks as inert extension fields for now; rich hook
  execution remains deferred.
