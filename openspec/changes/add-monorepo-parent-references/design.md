# Design

## Goals

- Reuse the existing read-only `references:` model.
- Preserve one authoritative writable root per command.
- Make committed paths portable and safe across platforms.

## Decisions

### Extend references instead of root selection

A local reference is declared as `{ path: ../.. }`, relative to the child
project root. Root selection is unchanged: the nearest `openspec/` remains the
only target for changes, spec merges, and archives.

### Accept only strict ancestors

Paths are canonicalized before comparison. Absolute paths, the current root,
siblings, descendants, missing roots, and symlink escapes are rejected. Stores
remain the supported mechanism for arbitrary or cross-repository locations.

### Keep inheritance one hop

The child receives the declared parent's spec index, context, and schema
directory. References declared by that parent are not followed. Child schemas
shadow parent schemas, and a child `schema:` value overrides the parent's
default. Rules, operation guidance, integration settings, and write locations
do not inherit.

### Keep prompt budgets intact

Parent spec indexes use the existing 50KB reference budget. Combined context
uses the existing 50KB context limit; if inheritance would exceed it, OpenSpec
warns and keeps only the child's context.

## Safety proof

End-to-end coverage creates a change from inside a package, reads the parent
spec and context, archives the change, and asserts that only the package root
changed. Separate tests cover invalid sibling and absolute paths, canonical
path identity, schema precedence, and existing Store reference behavior.
