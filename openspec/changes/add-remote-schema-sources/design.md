## Context

OpenSpec currently resolves complete schema bundles from three directory tiers: project-local, user-level, and package built-in. Project configuration selects a schema by name, but it cannot describe where a team-maintained schema comes from. Teams therefore copy bundles across repositories or use external automation, neither of which records the exact schema revision consumed by normal commands.

The feature spans resilient project config parsing, schema resolution, CLI schema management, Git transport, local data storage, integrity validation, cross-platform path handling, and documentation. Normal commands must remain synchronous and network-free; only the explicit sync command may invoke Git.

## Goals / Non-Goals

**Goals:**

- Make a named Git repository path a reproducible schema source for a project.
- Resolve mutable refs to immutable commits only during explicit synchronization.
- Commit stable lock metadata while keeping downloaded content machine-local.
- Preserve existing schema selection and all non-remote resolver APIs.
- Fail closed when a declared remote source is not reproducible locally.
- Use system Git for HTTPS, SSH, credential helpers, SSH agents, and local Git repositories.
- Validate and install bundles atomically with portable security boundaries.
- Provide human and one-document JSON output suitable for CI and agents.

**Non-Goals:**

- Hosted registries, central services, or OpenSpec-managed credentials.
- Implicit clone, fetch, pull, or update during ordinary commands.
- Schema inheritance, merging, partial overrides, or dependency graphs between schemas.
- Automatic cache garbage collection in the MVP.
- Committing downloaded cache contents to a project.

## Decisions

### 1. Keep schema selection separate from source declaration

Project configuration retains the existing scalar selection and adds a provisional source map:

```yaml
schema: qeda-sdd

schemaSources:
  qeda-sdd:
    git: https://github.com/example/QEDASDD.git
    ref: v1.0.0
    path: schemas/qeda-sdd
```

`schemaSources` is parsed field-by-field into `Record<string, GitSchemaSource>`. Names use the existing kebab-case schema grammar. Each entry requires non-empty `git`, `ref`, and `path`. Valid Git forms include HTTPS, `ssh://`, scp-style SSH, and `file://` for local repositories. HTTPS user information is rejected so a password or token cannot be persisted. SSH usernames such as `git@github.com` remain valid.

Alternatives considered:

- Replace `schema: <name>` with an object: rejected because it breaks existing configuration and couples selection to transport.
- Put sources in a separate manifest: rejected because it adds another hand-edited project file before locking provides value.

### 2. Commit a project lock and keep a global content-addressed cache

The lock path is tracked by one constant and is always `openspec/schemas.lock.yaml` relative to the project root:

```yaml
version: 1
schemas:
  qeda-sdd:
    git: https://github.com/example/QEDASDD.git
    requestedRef: v1.0.0
    resolvedCommit: 0123456789abcdef0123456789abcdef01234567
    bundlePath: schemas/qeda-sdd
    integrity: sha256:0123456789abcdef...
```

The cache lives under `getGlobalDataDir()/schema-cache/v1/sha256/<hex-digest>`. The lock never stores a machine-specific absolute cache path. Identical bundle content is reused across projects and commits, and a failed upgrade cannot overwrite the old content-addressed directory.

The digest is computed over every regular file beneath the bundle using sorted Git-style relative paths, explicit byte lengths, and file bytes. Paths are normalized to `/` only for the canonical digest and lock contract; filesystem access uses `path.join`/`path.resolve`.

Alternatives considered:

- Project-local ignored cache: easier to discover but dirties project trees and duplicates content across repositories.
- Commit the downloaded bundle: works offline from a clone but recreates vendoring and schema-copy drift.
- Cache by source/ref: mutable refs could overwrite prior state and make rollback unsafe.

### 3. Use two explicit synchronization modes

`openspec schema sync [name]` is update mode. It fetches each configured ref, resolves the fetched object to a commit, validates the selected tree, installs content, and updates the lock. Omitting the name operates on every valid declaration.

`openspec schema sync [name] --locked` is restore mode. It requires matching config and lock metadata, fetches the exact `resolvedCommit`, reconstructs and verifies the expected bundle, and leaves the lockfile byte-identical. This separates intentional upgrades from deterministic CI cache restoration.

For multiple selected sources, all fetch/extract/validation operations finish before one atomic lock replacement. A successful cache directory that becomes unreferenced because a later source fails is harmless content-addressed data; no prior lock or cache is removed.

### 4. Fetch with system Git and extract tracked objects, not a working-tree copy

A focused Git adapter uses `execFile` argument arrays and a temporary repository:

1. `git init`
2. `git remote add origin <configured-url>`
3. update mode: `git fetch --depth=1 --no-tags origin <requested-ref>`
4. locked mode: `git fetch --depth=1 --no-tags origin <resolved-commit>`
5. `git rev-parse <fetched-object>^{commit}`
6. `git ls-tree -r -z <commit> -- <bundle-path>`
7. `git cat-file blob <object-id>` for accepted regular files

Reading Git objects rather than recursively copying a checkout prevents `.git`, untracked content, and followed filesystem symlinks from entering the bundle. Tree modes identify and reject symlinks and submodules before content extraction. Every process has bounded output and duration.

Git stderr is treated as untrusted and is not copied verbatim into user diagnostics. Errors use stable codes and sanitized source labels. This prevents a transport, credential helper, or malicious remote from reflecting secrets while keeping the actionable fixes (`check Git credentials`, `schema sync`, or `schema sync --locked`).

Alternative considered: shallow clone plus filesystem traversal. Rejected because checkout behavior, symlink targets, submodules, and untracked administrative content make the trust boundary harder to prove cross-platform.

### 5. Apply a portable bundle boundary before schema validation

The source `path` is parsed as a Git tree path, not an operating-system path. It must be relative and contain only safe non-empty segments; POSIX absolute paths, Windows drive/UNC paths, `.`, `..`, NUL, backslash separators, and Windows-unsafe segments are rejected.

Every `ls-tree` entry must:

- stay beneath the selected prefix after POSIX normalization;
- be a regular blob, never a symlink or submodule;
- map to a unique case-folded portable relative path;
- keep the bundle at or below 1,000 files and 10 MiB total bytes.

The extracted bundle must contain `schema.yaml`, a real `templates` directory, and every parser-declared template inside that directory. The parsed schema name must equal the source-map key. A reusable core schema-directory validator will be extracted from the current schema command so sync and `schema validate` share the parser and template checks; remote validation adds the stricter boundary rules.

### 6. Activate cache and lock atomically

Extraction occurs in a `mkdtemp` directory under the cache parent, followed by structural validation and digest calculation. If the final content-addressed directory is absent, it is installed with `rename`; if present, it is re-verified and reused. Temporary directories are removed on every exit path.

The lock is serialized deterministically with source names sorted. It is written to a uniquely named temporary sibling, flushed by close, then renamed over the known lock filename. Sync never deletes the previous digest directory. A lock write failure therefore leaves ordinary resolution on the previous lock.

### 7. Remote declarations fail closed in the resolver

With `projectRoot`, location priority becomes:

1. `openspec/schemas/<name>` project-local
2. matching configured remote source with matching lock and verified cache
3. user-level schema
4. package built-in schema

Project-local remains the team's explicit in-repository override. Once a remote source name is declared and no project-local schema shadows it, a missing/stale lock, absent cache, malformed metadata, or integrity mismatch is an error; resolution does not fall through to a personal or package copy with the same name.

Without `projectRoot`, existing behavior stays exactly user then package and no config, lock, or remote cache is read.

`SchemaInfo.source` and schema-command resolution types add `remote`. A remote location may include requested ref, commit, bundle path, and integrity. Diagnostic listing can describe an unsynchronized declaration, while APIs that must return a loadable directory fail with an actionable error.

### 8. Keep JSON output singular and stable

Successful sync JSON has this top-level shape:

```json
{
  "mode": "update",
  "lockfile": "/project/openspec/schemas.lock.yaml",
  "schemas": [
    {
      "name": "qeda-sdd",
      "git": "https://github.com/example/QEDASDD.git",
      "requestedRef": "v1.0.0",
      "resolvedCommit": "0123456789abcdef0123456789abcdef01234567",
      "bundlePath": "schemas/qeda-sdd",
      "integrity": "sha256:...",
      "cachePath": "/user-data/openspec/schema-cache/v1/sha256/..."
    }
  ],
  "status": []
}
```

Failures emit the same null-safe fields with one or more structured statuses and exit one. JSON mode creates no spinner and writes no non-JSON stdout. Human mode reports the schema, requested ref to commit transition, cache action, and lockfile path.

### 9. Implementation units

- `src/core/remote-schema/types.ts`: public config/lock/result types and constants.
- `src/core/remote-schema/config.ts`: source grammar, URL credential checks, and portable Git path validation.
- `src/core/remote-schema/lockfile.ts`: strict lock parsing and atomic deterministic writes.
- `src/core/remote-schema/bundle.ts`: Git-tree entry validation, extraction, size limits, canonical digest, and cache verification.
- `src/core/remote-schema/git.ts`: bounded, credential-safe system Git calls.
- `src/core/remote-schema/sync.ts`: multi-source transaction orchestration.
- `src/core/artifact-graph/schema-directory.ts`: reusable parser/template directory validation.
- `src/core/artifact-graph/resolver.ts`: remote tier integration and metadata.
- `src/commands/schema.ts`: `sync`, enhanced `which`, validation reuse, and human/JSON rendering.

Focused modules keep network-capable code out of ordinary resolution and make the boundary independently testable.

## Risks / Trade-offs

- **Integrity verification reads every cached file during resolution** → Bundles are capped at 10 MiB/1,000 files; correctness is preferred over an unverified stamp in the MVP.
- **Some Git servers refuse shallow fetch by raw locked SHA** → Return a locked-restore diagnostic; users can preserve/restore the content-addressed cache, pin an advertised tag, or run update mode. Do not silently advance the lock.
- **Global cache can accumulate unused digests** → Document manual removal; automatic garbage collection is deferred until lock discovery semantics exist.
- **Case-fold collision checks are stricter than a Linux checkout** → This intentionally guarantees that one committed lock is usable on Windows and case-insensitive macOS filesystems.
- **Remote source syntax and lock shape may evolve after maintainer feedback** → Mark the command group experimental, version the lock, and keep parsing strict so migrations can be explicit.
- **A project-local schema can shadow a declared remote source** → `schema which` exposes the shadow; this preserves the established highest-priority project override.

## Migration Plan

1. Existing projects continue unchanged because `schemaSources` and the lockfile are optional.
2. A team adds a source declaration and runs `openspec schema sync <name>`.
3. The team reviews and commits `openspec/config.yaml` plus `openspec/schemas.lock.yaml`.
4. Developers run update sync intentionally or locked sync to restore missing cache.
5. Removing a source declaration makes its stale lock/cache inert; no automatic deletion occurs.

Rollback is removal of the declaration and lock entry (or reverting the feature commit). Existing project/user/package schemas remain available under their prior precedence.

## Open Questions

None block the MVP. Maintainer review may rename provisional configuration keys, lockfile fields, or cache paths before upstream merge; behavior is specified independently so those representation changes remain localized.
