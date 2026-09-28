# Connect OpenSpec roots in monorepos

## Why

Monorepo packages can keep independent OpenSpec roots, but those roots cannot
share context with the repository root without registering a Store. Package
work misses shared architecture, and repository-level work cannot see the
package specs it may affect (#1729).

## What Changes

- Allow a relative `path` reference to name an ancestor or descendant OpenSpec root.
- Surface connected specs as read-only instruction context in both directions.
- Inherit parent context and schemas while keeping child values higher priority.
- Keep every write, merge, and archive operation scoped to the nearest root.

Local references are explicit and one hop. They do not discover sibling packages,
follow another root's references, change root selection, or permit cross-root writes.

## Impact

- Affected specs: `monorepo-references` (new)
- Affected code: project config, reference indexing, schema resolution, context,
  doctor, and workflow instructions
- Affected docs: project configuration and monorepo guidance
