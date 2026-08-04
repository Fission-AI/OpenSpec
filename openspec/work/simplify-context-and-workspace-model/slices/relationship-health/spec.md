# Relationship Health Spec (3.6)

## Outcome

One read-only question, one place: is the resolved OpenSpec root healthy, and
are its referenced stores available on this machine? `openspec doctor` answers
for the resolved root, separating root health, store metadata health, reference
health, and cross-cutting relationship warnings. Nothing clones, pulls, pushes,
syncs, branches, or repairs.

The earlier code-repo relationship experiment is removed. Doctor no longer
reports implementation-folder health.

## Locked Decisions

1. **Diagnostic only.** No clone/sync/branch/worktree behavior, no repairs.
2. **The report separates** OpenSpec root health, store metadata health,
   reference health, and top-level relationship warnings.
3. **The surface is top-level `openspec doctor`.** It is root-scoped, not
   machine-scoped like `store doctor` and not change-scoped like `status`.
4. **No new health machinery.** Reference health reuses the reference index
   diagnostics; root health reuses `inspectOpenSpecRoot`; store-backed roots
   include store metadata and remote facts.

## JSON Shape

```json
{
  "root": { "path": "...", "source": "store|declared|nearest", "store_id": "...", "healthy": true, "status": [] },
  "store": { "id": "...", "metadata": { "present": true, "valid": true, "remote": "..." }, "origin_url": "...", "status": [] },
  "references": [{ "store_id": "...", "root": "...", "status": [] }],
  "status": []
}
```

`store` is `null` for non-store-backed roots. Reference entries are the
health-mode reference index: resolved entries carry the referenced root;
unresolved entries carry their warning diagnostics and clone/register fixes.
Failure payloads are `{root: null, store: null, references: [], status: [d]}`
and exit 1. Health findings exit 0.

## Human Output

```text
$ openspec doctor
Doctor

Root
  Location: /Users/dev/src/team-context
  OpenSpec root: ok
  Store: team-context (metadata ok)

References
  - upstream-context: ok (/Users/dev/openspec/upstream-context)
  - design-system: not registered on this machine
    Fix: git clone -- https://github.com/acme/design-system.git /Users/dev/openspec/design-system && openspec store register /Users/dev/openspec/design-system --id design-system
```

Empty references render as `(none declared)`. A self-reference is omitted and
reported distinctly from "nothing declared".

## Scope

In scope:

- `src/core/relationship-health.ts`: pure composition of root, store, reference,
  and top-level relationship diagnostics.
- `src/commands/doctor.ts`: normal root resolution, one registry snapshot,
  health-mode reference index, store metadata/remote facts, JSON and human
  output.
- Docs and tests for the root/store/reference health shape.

Out of scope:

- Any repair/clone/sync behavior; any write.
- Extending `store doctor`; watch modes; severity filtering.
- Code-repo declaration or local mapping health.

## Acceptance Criteria

### Healthy Root

- **GIVEN** a store-backed root with one resolvable reference
- **WHEN** `openspec doctor` runs in human and JSON modes
- **THEN** root, store, and reference sections report ok and exit code is 0

### Nothing Declared

- **GIVEN** a healthy root with no references
- **WHEN** doctor runs
- **THEN** references render `(none declared)` / `[]`, store is present only for
  store-backed roots, and exit code is 0

### Broken References

- **GIVEN** an unresolvable reference with a declared remote
- **WHEN** doctor runs
- **THEN** the reference entry carries `reference_unresolved` with the clone and
  register fix, and exit code is 0

### Pointer And Registry Wrong Turns

- **GIVEN** a real root whose config also declares a `store:` pointer
- **WHEN** doctor runs
- **THEN** top-level `status` carries `root_pointer_ignored`
- **AND** with an unreadable registry, top-level `status` carries
  `relationship_registry_unreadable` and reference entries carry
  `reference_registry_unreadable`
- **AND** a pointer repo whose own config declares references reports
  `pointer_declarations_inert`

### Remote Divergence

- **GIVEN** a store-backed root whose `store.yaml` remote differs from the
  checkout's observed origin
- **WHEN** doctor runs
- **THEN** the store section carries `store_remote_divergence` with severity
  `info`

### Read-Only

- **GIVEN** any fixture above
- **WHEN** doctor runs and other commands run afterward
- **THEN** doctor performed no writes and other command outputs are unchanged
