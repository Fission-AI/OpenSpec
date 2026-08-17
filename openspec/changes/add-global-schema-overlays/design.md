## Context

Schema resolution currently returns one winning directory in this order: project-local, user-level, then package. `resolveSchema()` reads only that directory's `schema.yaml`, and template loading reads only its `templates/` directory. This makes every override a complete bundle and prevents packaged changes from flowing into a user customization.

The requested behavior is narrower than general schema inheritance. A user wants to keep the packaged `spec-driven` schema, append personal guidance to an existing artifact such as `tasks`, and optionally replace individual templates. The design must remain deterministic for ordered artifact and dependency arrays, preserve the existing full-replacement contract, and make the effective result debuggable.

## Goals / Non-Goals

**Goals:**

- Let users layer small, global customizations over packaged schemas without copying the complete bundle.
- Preserve packaged schema and template updates unless a field or template is explicitly customized.
- Give text and array fields explicit, unsurprising merge operations.
- Keep project-local schemas authoritative over personal global customization.
- Preserve complete user schema replacements without changing their template behavior.
- Validate the effective schema and report every source involved in resolution.

**Non-Goals:**

- Project-local overlay files in v1; projects continue to use complete, version-controlled schemas and project `rules`.
- Arbitrary `extends` chains or inheritance between user-created schemas.
- Adding, removing, or reordering artifacts through an overlay. Structural workflow forks continue to use a complete schema.
- Merging Markdown template contents. A user template replaces one packaged template as a whole.
- Automatically converting or rebasing existing complete user schemas.
- Treating project `rules` as schema fields; they remain separately injected artifact constraints.

## Decisions

### 1. Add an overlay beside, not instead of, complete user schemas

The layered file is:

```text
${XDG_DATA_HOME}/openspec/schemas/<name>/schema.override.yaml
```

The existing platform fallbacks from `getGlobalDataDir()` remain authoritative. An optional `templates/` directory in the same user schema directory contains whole-file template overrides.

The existing file keeps its existing meaning:

```text
${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
```

It is a complete user schema replacement with self-contained templates. Reinterpreting that file as a partial document would silently change current users' behavior.

If both `schema.yaml` and `schema.override.yaml` exist in the same user schema directory, resolution fails with a conflict diagnostic when the user layer would otherwise be active. Direct user-overlay creation and validation also reject the conflict. A higher-priority project schema continues to resolve normally, while diagnostics may report the inactive conflicting user sources. The user must choose complete replacement or layered customization before the user layer can become active; silently selecting either user file would make edits appear ineffective.

### 2. Preserve project intent and layer only onto packaged schemas

Resolution for a name is:

```text
1. project schema.yaml                         complete project bundle
2. user schema.yaml                            complete user bundle
3. package schema.yaml + user schema.override.yaml
4. package schema.yaml                         unchanged fallback
```

A project schema suppresses the personal overlay because version-controlled team intent remains highest priority. A user overlay without a packaged base is invalid and is not treated as a new schema; custom schemas use the existing complete-bundle format.

Calls without `projectRoot` continue to omit project discovery, then follow steps 2-4.

### 3. Use a dedicated, strict overlay format

The overlay is not parsed as `SchemaYaml`. It has its own versioned, strict shape:

```yaml
patchVersion: 1

description: My global additions to the packaged workflow

artifacts:
  tasks:
    instruction:
      append: |
        Additional rules:
        - Include verification commands in every task group.
        - Mention the affected package in each task.
    requires:
      remove: [design]
      add: [proposal]

apply:
  instruction:
    prepend: |
      Read the repository contribution guide before implementation.
```

Supported artifact patches are:

- `description`, `generates`, and `template`: a supplied scalar replaces the base value.
- `instruction`: explicit text operation.
- `requires`: explicit collection operation.

Supported apply patches are:

- `tracks`: a supplied string or `null` replaces the base value.
- `instruction`: explicit text operation.
- `requires`: explicit collection operation.

The overlay cannot set schema `name` or `version`, change an artifact `id`, or introduce an unknown artifact ID. Unknown keys are rejected so misspellings do not become silent no-ops.

### 4. Define deterministic text and collection operations

Text operations support:

```yaml
instruction:
  prepend: text before the packaged instruction
  append: text after the packaged instruction
```

`prepend` and `append` may be used together. Non-empty segments are joined with one blank line. `replace` is mutually exclusive with both:

```yaml
instruction:
  replace: complete replacement text
```

Collection operations support either `replace`, or `remove` followed by `add`:

```yaml
requires:
  remove: [design]
  add: [proposal]
```

Removal preserves the relative order of remaining base values. Additions are appended in declaration order and cannot introduce duplicates. `replace` is mutually exclusive with `add` and `remove`. Duplicate entries, an ID present in both `add` and `remove`, and removal of a value not present in the base are validation errors rather than silent behavior.

After applying the overlay, the existing full-schema parser validates required fields, dependency references, and cycles. Artifact declaration order remains the packaged order.

### 5. Layer templates only for composed schemas

For a package schema with a user overlay, each referenced template resolves independently:

```text
1. user <schema>/templates/<template>
2. package <schema>/templates/<template>
```

The user `templates/` directory is optional. If no user template exists, the package template continues to receive package updates. If a user template exists, it is a whole-file replacement and intentionally stops receiving changes to that specific packaged template.

Project schemas and complete user schemas remain self-contained and do not fall back to package templates. This avoids changing current behavior and prevents an incomplete full fork from appearing valid accidentally.

Every candidate path is checked against its own canonical template root using the existing path-containment protections. An override cannot use a relative path to escape from the allowed roots.

### 6. Centralize source resolution

`getSchemaDir()` is insufficient to represent a composed schema but is widely used. Add a centralized resolver that returns a descriptor such as:

```ts
interface ResolvedSchemaSources {
  name: string;
  mode: 'project' | 'user-replacement' | 'package' | 'package-with-user-overlay';
  base: { source: 'project' | 'user' | 'package'; dir: string; schemaPath: string };
  overlay?: { source: 'user'; path: string; templatesDir: string };
  templateRoots: Array<{ source: 'project' | 'user' | 'package'; dir: string }>;
}
```

`resolveSchema()`, template loading, schema listing, `schema which`, and schema validation consume this descriptor. Keep `getSchemaDir()` as a compatibility helper returning the complete base directory, but do not use it for new composition-aware behavior.

This avoids duplicating precedence logic in the CLI and prevents runtime behavior from disagreeing with diagnostics.

### 7. Add a small scaffolding command

`openspec schema override <name>` creates a no-op `schema.override.yaml` for an existing packaged schema in the user data directory. It does not copy `schema.yaml` or templates.

Options:

- `--force`: atomically replace an existing overlay after the same destination-safety checks used by schema creation commands.
- `--json`: report `created`, `schema`, `path`, and `basePath` without decorative output.

The command fails when the name has no packaged schema, a complete user `schema.yaml` conflicts, or the destination exists without `--force`. It is independent of the current project root because its base is explicitly the packaged schema, not an effective project schema.

### 8. Make composition visible and validation effective

For a composed schema, `schema which` keeps `source: "package"` and the existing package `path` for JSON compatibility, then adds an `overlay` object containing the user path. Human output labels the schema as `package + user overlay`. An overlay is composition, not a shadow, so it is not inserted into the existing `shadows` array.

`schema validate <name>` validates the overlay document, the fully composed `SchemaYaml`, and template existence through the ordered template roots. Errors identify `schema.override.yaml` and the relevant artifact or operation. `schema which --all`, `schemas`, and `templates` use the same source descriptor; template output reports the root that supplied each concrete template.

### 9. Keep project rules separate

An appended global `instruction` becomes part of the effective schema instruction. Existing project `rules.<artifact>` remain a separate field in instruction output and retain their current semantics. For an artifact such as `tasks`, consumers therefore receive:

```text
effective instruction = packaged instruction + global append
rules                 = project tasks rules
```

This change does not create global project rules or relabel schema guidance as rules.

## Risks / Trade-offs

- **Packaged edits can change the context around an appended instruction.** → The user intentionally follows the packaged base; `schema which` exposes composition, and `replace` remains available when exact control is required.
- **Two user customization modes add concepts.** → Use distinct filenames, reject conflicts, provide a scaffolding command, and document a clear choice: complete ownership versus layered customization.
- **Strict operations are more verbose than generic YAML merge.** → The verbosity prevents accidental array replacement, duplicate dependencies, and uncertainty over whether text appends or replaces.
- **A user template can still drift.** → Drift is limited to templates explicitly replaced; all others continue to fall back to the package.
- **Existing callers may assume one schema directory.** → Introduce one source descriptor, retain `getSchemaDir()` for compatibility, and audit every resolver/template call site before implementation is complete.

## Migration Plan

This is additive. Existing project schemas, complete user schemas, and package-only resolution retain their current behavior. Users may opt into overlays by creating `schema.override.yaml` or running `openspec schema override <name>`. Converting a complete user replacement is manual: keep only the desired field operations and template replacements, remove the complete user `schema.yaml`, then validate and inspect the effective sources.

Rollback is removal of `schema.override.yaml` and any optional user template overrides; the packaged schema immediately becomes effective again.

## Open Questions

None for v1. Project overlays, artifact insertion/removal/reordering, and arbitrary schema inheritance require separate proposals if concrete use cases emerge.
