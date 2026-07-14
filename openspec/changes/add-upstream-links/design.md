# Design

## The one decision

Upstream work is not a new artifact kind. It is a change in a store, typed
by the store's schema. Everything else follows from refusing the parallel
ontology:

| Need | Not this (initiatives experiment) | This |
|---|---|---|
| A finite piece of work above code | `initiatives/<name>/` folder | a change in the store |
| An ordered workflow with handoffs | numbered stage folders | schema artifacts with `requires:` |
| Guidance per stage | (none — freeform) | `instructions/<artifact>.md` + review gates |
| Standing truths | unnumbered "evergreen" files | the store's `specs/`, synced by archive |
| The store's own layout | (nothing) | `structure:` map — materialized by setup, checked by doctor |
| Traceability | `initiative:` line to a folder | `serves:` line to a change |
| Status | folder scan + task counts | rollup grouped by upstream change; done = tasks AND artifacts |
| Entry point | a skill that owned the mechanics | a thin skill routing deterministic commands |

The pull-based rule the experiment liked ("read everything lower-numbered,
produce what your stage owes the next") is the artifact dependency graph:
your artifact's `requires` are satisfied → read them → draft yours.

## Deterministic rails, judgment in agents

Every mechanic is a CLI command computed from disk state: refs validated
before anything is written, status derived from checkboxes and artifact
presence (never recorded), rollup discovered from one metadata line (no
manifest), missing/archived targets rendered visibly. The `/opsx:store`
skill is deliberately mechanics-free — it reads three JSON commands,
routes to one situation, and ends with numbered next moves — so agents
cannot drift and humans/CI can run the same rails directly. `--scan <dir>`
exists because linked-root records are per-machine: a stateless CI clone
directory gets the identical rollup.

## Schema resolution order

`project → referenced stores (declaration order, one hop) → user → package`.
The resolver reads the registry synchronously and degrades to "no inherited
schemas" on any unreadable state, because resolution runs deep in sync call
chains and must never turn a broken registry into a failed command. The
same tolerance pattern governs everything schema-aware added here
(whole-change rollup status, delta-less validation, archive phrasing): an
unresolvable schema always falls back to the stricter, older behavior.

## The truth boundary

Archive remains the only place OpenSpec holds a format opinion: deltas
merged into standing `specs/` use the requirement/scenario format;
everything else archives as-is. New specs seed Purpose from the best
available intent (delta `## Purpose` → proposal `## Why` → placeholder),
and the divergence rule in the upstream block catches drift while work is
still in motion instead of only at archive time.

## Compatibility

- Legacy `initiative:` metadata stays readable in both shapes the beta
  wrote (object and string), never re-emitted; `--initiative` stays
  registered as a hidden removed option pointing at `--serves`.
- `schemas --json` stays a bare array; entries gain `source: 'store'` +
  `store` for inherited schemas. `structure:` JSON surfaces stay
  folder/file → purpose strings.
- Existing commands keep their shapes; every addition is a new key, flag,
  or command.
