## Context

OpenSpec currently stores specs in a flat directory structure at `openspec/specs/<spec-id>/spec.md`. Spec IDs are simple strings (e.g., `cli-show`, `schema-resolution`). The `getSpecIds()` function in `item-discovery.ts` reads only one level deep, and all path construction uses `path.join(SPECS_DIR, specId, 'spec.md')`.

As the project has grown to 38 specs, naming conventions like `cli-*`, `schema-*` have emerged organically — encoding hierarchy in flat names. This change introduces proper directory nesting so specs can be organized as `cli/show`, `schema/resolution`, etc.

## Goals / Non-Goals

**Goals:**
- Support arbitrary nesting depth for specs (e.g., `domain/project/feature`)
- Make spec IDs path-based, using `/` as the separator
- Maintain full backward compatibility with existing flat spec IDs
- Update all CLI commands to work with hierarchical spec IDs
- Support subtree operations (e.g., listing all specs under `cli/`)

**Non-Goals:**
- Automatic migration of existing flat specs to hierarchical structure — users migrate at their own pace
- Cross-references or symbolic links between specs
- Spec inheritance or composition across hierarchy levels
- Namespace-level metadata or configuration (e.g., `cli/.openspec.yaml`)

## Decisions

### Decision 1: Spec IDs use forward slash as separator, regardless of OS

Spec IDs use `/` as the canonical separator (e.g., `cli/show`), even on Windows. Internally, `path.join` is used for filesystem operations, but IDs are always stored and displayed with `/`.

**Why**: Consistent cross-platform behavior. Spec IDs appear in change files, JSON output, and documentation — they must be portable. This matches how Go import paths and npm package scopes work.

**Alternative considered**: Using the OS path separator — rejected because spec IDs would differ across platforms, breaking change portability.

### Decision 2: Recursive discovery with `spec.md` as the leaf marker

`getSpecIds()` walks the directory tree recursively. Any directory containing `spec.md` is a spec — its ID is the relative path from `openspec/specs/` to that directory. Directories without `spec.md` are treated as organizational containers.

**Why**: Simple, unambiguous detection. No configuration files needed at intermediate directories. The existing convention (`spec.md` = spec exists) naturally extends to nested structures.

**Alternative considered**: Requiring a manifest file listing specs — rejected as it adds maintenance burden and a sync problem.

### Decision 3: Flat and hierarchical specs coexist

Both `openspec/specs/cli-show/spec.md` (flat) and `openspec/specs/cli/show/spec.md` (hierarchical) are valid. They are different specs with different IDs (`cli-show` vs `cli/show`).

**Why**: Zero-migration-cost adoption. Teams can gradually reorganize without a flag day. Existing tooling and change references continue to work.

**Alternative considered**: Deprecating flat structure — rejected as it forces migration and breaks existing changes/archives.

### Decision 4: Subtree filtering uses prefix matching on spec IDs

`openspec spec list cli/` returns all specs whose ID starts with `cli/`. This is a simple string prefix match on the canonical `/`-separated ID.

**Why**: Intuitive UX — `cli/` means "everything under cli". No glob syntax needed for the common case.

### Decision 5: Delta specs in changes mirror the hierarchy

Change delta specs at `changes/<name>/specs/` use the same hierarchy. For example, modifying spec `cli/show` means creating `changes/<name>/specs/cli/show/spec.md`.

**Why**: Consistent mental model. The change's `specs/` directory is a mirror of the main `openspec/specs/` structure. The archive command can use the same relative path logic for both.

### Decision 6: Fuzzy matching extends to hierarchical IDs

The existing Levenshtein-based suggestion system works on the full path-based ID string. Additionally, partial path matching is supported — typing `show` suggests `cli/show` if it exists.

**Why**: Discoverability. Users may not know the full path. Matching on the leaf segment (last component) helps find specs without knowing the full hierarchy.

## Risks / Trade-offs

**[Risk] Ambiguity between flat and nested IDs** → Flat ID `cli-show` and nested ID `cli/show` are distinct specs. If both exist, commands resolve them independently. Documentation should clarify naming conventions to avoid confusion.

**[Risk] Deep nesting becomes unwieldy** → No technical limit on depth, but deeply nested IDs (`a/b/c/d/e/spec.md`) are cumbersome to type. Mitigation: document recommended max depth of 3 levels; fuzzy matching reduces typing burden.

**[Risk] Performance with large spec trees** → Recursive directory walking is slower than single-level readdir. Mitigation: `fast-glob` (already a dependency) can handle thousands of entries efficiently. Benchmark if >500 specs.

**[Risk] Cross-platform path handling bugs** → Mixing `/` in IDs with OS-specific `path.join` is error-prone. Mitigation: centralize ID↔path conversion in a single utility (`specIdToPath` / `pathToSpecId`), and add Windows path tests as per existing config rules.
