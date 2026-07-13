# Design

## The one decision

Upstream work is not a new artifact kind. It is a change in a store, typed
by the store's schema. Everything else follows from refusing the parallel
ontology:

| Planning need | Not this (initiatives experiment) | This |
|---|---|---|
| A finite piece of work above code | `initiatives/<name>/` folder | a change in the store |
| An ordered workflow with handoffs | numbered stage folders | schema artifacts with `requires:` |
| Guidance per stage | (none — freeform) | `instructions/<artifact>.md` + review gates |
| Standing truths | unnumbered "evergreen" files | the store's `specs/`, synced by archive |
| Traceability | `initiative:` line to a folder | `serves:` line to a change |
| Status | folder scan + task counts | same rollup, grouped by upstream change |

The pull-based rule the experiment liked ("read everything lower-numbered,
produce what your stage owes the next") is the artifact dependency graph:
your artifact's `requires` are satisfied → read them → draft yours.

## Mechanics kept from the experiment (retargeted)

Linking does all the wiring, exactly as before: `--serves <store>/<change>`
records the repo in `linked-roots.yaml` (machine-local; nothing committed)
and auto-adds the store to `references:` with comment-preserving YAML edits.
Rollup scans registered stores plus linked roots for one metadata line — no
manifest. A ref that resolves to nothing renders visibly, never silently.

## Schema resolution order

`project → referenced stores (declaration order, one hop) → user → package`.
The resolver reads the registry synchronously and degrades to "no inherited
schemas" on any unreadable state, because resolution runs deep in sync call
chains and must never turn a broken registry into a failed command.

## Compatibility

- Legacy `initiative:` metadata (object form) stays readable and is never
  re-emitted, matching the existing vocabulary contract.
- `--initiative` stays registered as a hidden removed option with a
  deliberate error pointing at `--serves`.
- `schemas --json` stays a bare array; entries gain `source: 'store'` +
  `store` for inherited schemas.
