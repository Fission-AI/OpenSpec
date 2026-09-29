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

### Connect only ancestors and descendants

Paths are canonicalized before comparison. Absolute paths, the current root,
siblings, missing roots, and symlink escapes are rejected. A package can read
from an ancestor, and the repository root can explicitly read from descendant
package roots. Stores remain the supported mechanism for arbitrary or
cross-repository locations.

### Inherit configuration only from ancestors

Every connected root contributes a read-only spec index. Only ancestors
contribute context and schemas. A repository-level change can inspect package
specs without inheriting package-specific planning instructions.

### Keep inheritance one hop

References declared by a connected root are not followed. Child schemas shadow
parent schemas, and a child `schema:` value overrides the parent's default.
Rules, operation guidance, integration settings, and write locations do not
inherit.

### Keep prompt budgets intact

Parent spec indexes use the existing 50KB reference budget. Combined context
uses the existing 50KB context limit; if inheritance would exceed it, OpenSpec
warns and keeps only the child's context.

## Safety proof

End-to-end coverage creates and archives a real spec change inside a package,
then asserts that the spec merge and archive stay in that package. A second
flow proves repository-level work can read an explicitly connected package
spec. Separate tests cover invalid sibling and absolute paths, canonical path
identity, schema precedence, ambiguous declarations, and existing Store
reference behavior.
