## Why

OpenSpec's current user-level schema override is a complete, self-contained fork. A user who wants to add personal guidance to `spec-driven` must copy both `schema.yaml` and every referenced template into the user data directory. That copy permanently shadows the packaged schema, so later improvements to built-in instructions, dependencies, and templates no longer reach the user.

The common global customization case is additive: keep the maintained packaged workflow, append or prepend personal guidance to artifacts such as `tasks`, and override only the occasional template. OpenSpec needs a layered user override for that case while retaining full schema replacement for users who intentionally own the complete workflow.

## What Changes

- Add an optional `schema.override.yaml` beside user-level schema bundles at `${XDG_DATA_HOME}/openspec/schemas/<name>/` (with the existing platform fallbacks).
- Compose a packaged schema with its user overlay when no project-local or complete user schema replaces it.
- Make text operations explicit: `append`, `prepend`, or `replace`. Make dependency-list operations explicit: `add`, `remove`, or `replace`. Plain scalar fields replace their packaged values.
- Allow optional user templates to override individual packaged templates while unresolved template paths fall back to the packaged schema directory.
- Keep project-local schemas highest priority and preserve today's complete user `schema.yaml` replacement behavior.
- Add `openspec schema override <name>` to scaffold a safe, no-op global overlay without copying the packaged bundle.
- Update schema resolution, validation, `schema which`, and template reporting so composed schemas and each effective source are visible and diagnosable.
- Document the difference between complete schema replacement and layered global customization, including how packaged updates flow through each model.

## Capabilities

### New Capabilities

- `schema-override-command`: Scaffold a user-level layered override for a packaged schema with safe conflict and overwrite handling.

### Modified Capabilities

- `schema-resolution`: Resolve packaged schemas together with optional user overlays while preserving project and complete-user replacement precedence.
- `artifact-graph`: Apply validated field-level overlay operations and resolve optional user templates with packaged fallback.
- `schema-which-command`: Report the base and overlay sources of a composed schema in human and JSON output.
- `schema-validate-command`: Validate the effective composed schema, overlay operations, and layered template resolution.
- `cli-artifact-workflow`: Report the actual source path of each template when a schema uses a global overlay.

## Impact

- `src/core/artifact-graph/types.ts` and `schema.ts`: Define and validate the overlay document and its explicit operations.
- `src/core/artifact-graph/resolver.ts`: Centralize full-schema and overlay source discovery, composition, listing, and diagnostics.
- `src/core/artifact-graph/instruction-loader.ts`: Resolve templates from an ordered set of trusted roots.
- `src/commands/schema.ts`: Add overlay scaffolding and make `which` and `validate` composition-aware.
- `src/commands/workflow/templates.ts`: Report per-template effective source paths.
- `docs/customization.md`, `docs/cli.md`, and `docs/opsx.md`: Explain full replacements, layered overrides, paths, precedence, and maintenance behavior.
- Focused resolver, instruction-loader, schema-command, and workflow-command tests, including Windows and XDG path cases.
