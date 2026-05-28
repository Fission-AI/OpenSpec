## Why

OpenSpec stores all specs in a flat structure under `openspec/specs/`. As projects grow, this becomes difficult to organize and navigate. Teams working on different domains or features resort to long, prefixed names (e.g., `cli-show`, `cli-validate`, `schema-fork-command`) to avoid collisions and convey hierarchy through naming conventions alone. A proper hierarchical structure would make specs more discoverable, reduce naming collisions, and let teams organize specs by domain, project, or feature.

## What Changes

- Spec IDs become path-based (e.g., `cli/show` instead of `cli-show`), supporting arbitrary nesting depth
- `getSpecIds()` in `item-discovery.ts` becomes recursive, discovering specs at any depth
- All CLI commands that resolve spec IDs (`spec show`, `spec list`, `spec validate`, `show`, `validate`, `list`, `view`) accept path-based spec IDs
- Path construction throughout the codebase changes from `join(SPECS_DIR, specId, 'spec.md')` to handle `/`-separated IDs as nested directories
- `spec list` gains the ability to filter by subtree (e.g., `openspec spec list cli/` shows only CLI specs)
- Delta specs in changes mirror the hierarchical structure
- **COMPATIBILITY**: Existing flat spec IDs remain valid — no migration required. Tools that treat spec IDs as opaque strings need no changes. Tools that parse or construct spec ID structure (e.g., splitting on `-` to infer hierarchy) must be updated to handle `/`-separated IDs.

## Capabilities

### New Capabilities
- `hierarchical-spec-discovery`: Recursive spec discovery that finds `spec.md` files at any nesting depth under `openspec/specs/`, deriving spec IDs from relative directory paths
- `hierarchical-spec-resolution`: Path-based spec ID resolution, allowing specs to be referenced as `domain/project/feature` with subtree filtering and disambiguation support

### Modified Capabilities
- `cli-spec`: Spec commands (`show`, `list`, `validate`) must accept path-based spec IDs and support subtree listing
- `cli-show`: Show command must resolve hierarchical spec IDs
- `cli-validate`: Validate command must resolve hierarchical spec IDs
- `cli-list`: List command must display specs with their full hierarchical paths and support subtree filtering
- `cli-view`: View/dashboard must display specs organized by hierarchy
- `cli-archive`: Archive must handle delta specs in nested directory structures

## Impact

- **Core**: `item-discovery.ts` (`getSpecIds`), path construction in `spec.ts`, `show.ts`, `validate.ts`
- **Display**: `list.ts` and `view.ts` need tree-aware rendering
- **Archive**: `specs-apply.ts` and `archive.ts` need to handle nested delta spec paths
- **Change specs**: Delta specs within changes (`changes/<name>/specs/`) mirror the hierarchy
- **Tests**: All spec-related tests need updating for nested path scenarios
- **Cross-platform**: Path handling must use `path.join`/`path.posix` correctly — spec IDs use `/` as separator regardless of OS
