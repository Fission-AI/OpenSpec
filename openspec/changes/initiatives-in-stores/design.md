## Context

Stores let planning live in its own repo, and a code repo can `reference` a
store for read-only context. Separately, OpenSpec's artifact-graph lets a
project define its own artifact types in a schema (`openspec/schemas/<name>/`),
resolved project → user → package.

These two systems do not meet yet. Schema/artifact discovery resolves against
the *current* repo only. So the compelling story — "define your own artifacts,
share them in a store, read them from every repo" — is true for *authoring* but
not for *discovery across repos*. This design closes that seam and settles the
one open product question: initiative precedence.

## Goals / Non-Goals

**Goals:**
- A repo that references a store can discover that store's schemas, artifact
  types, and initiatives.
- One clear, defensible default for initiative precedence.
- Reuse existing machinery (the resolver's root argument, the shadowing model,
  `openspec list` status) rather than new subsystems.

**Non-Goals:**
- Reviving the deleted heavyweight initiative command groups (collections,
  resolution, templates). Kept deliberately light.
- Syncing stores. Stores are plain git repos; OpenSpec never clones or pulls.
- Changing where commands *act*. References stay read-only context.

## Decisions

### 1. Discovery follows references, read-only

Referenced stores already resolve to on-disk roots for `context`/`doctor`. Feed
those same roots into the artifact-graph resolver (which already takes a
`projectRoot`) so a store's `openspec/schemas/` participates in discovery. A
referenced store's artifacts are always read-only context, never a place
commands write.

**Alternative considered:** copy a store's schemas into the referencing repo.
Rejected — that is the drift we are trying to remove.

### 2. Initiative precedence: canonical store, local shadow

When a local initiative and a store initiative share an id, the **store is
canonical** and the local one is a **shadow**: work continues locally, but
OpenSpec reports the shadow so nothing diverges silently.

This is the store-of-truth stance the product wants, expressed through a
pattern OpenSpec *already uses* for schemas (`openspec schema which` shows
`shadows:`). It is consistent, discoverable, and non-destructive.

**Alternative considered:** local silently wins (today's root-selection order,
where the nearest `openspec/` takes precedence). Rejected for initiative
*identity* — silence is exactly what lets shared plans drift. Note this only
governs *identity/reporting*; it does not change where commands act.

**Owner decision point:** if the owner prefers "local always wins, no warning"
or "store hard-wins and local is blocked," both are small variations on the same
reporting hook. The default here is the safe middle: local works, store is
named as canonical.

## Risks / Trade-offs

- [Discovery surfaces stale store content if a checkout is behind] → same as all
  store reads today; references are indexed live from disk, and `openspec
  doctor` already reports missing/registered stores.
- [Two precedence concepts in the codebase — root-selection order vs. initiative
  identity] → mitigated by scoping identity-precedence to reporting only, and
  documenting that commands still act per root-selection.

## Migration Plan

Purely additive. No existing command changes behavior when no store is
referenced. Ship behind the existing stores beta surface.

## Open Questions

- Final precedence policy (canonical-shadow vs. local-wins vs. store-hard-wins) —
  defaulted here, owner to confirm.
- Whether initiatives get a thin scaffold command later, or stay a plain-folder
  convention for the prototype. This change assumes the latter.
