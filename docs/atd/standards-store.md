# atd-standards store conventions

The `atd-standards` store is a standalone OpenSpec root (its own repository)
holding ATD's coding standards as specs. Every ATD repo references it via
`references: [atd-standards]` in `openspec/config.yaml`.

## Stack → spec mapping (explicit, exhaustive)

| Stack | Standards spec |
|-------|----------------|
| `python` | `python-service-standards` |
| `spring-boot` | `spring-boot-standards` |
| `oracle-ebs` | `oracle-ebs-plsql-standards` |
| `angular` | `angular-standards` |

The `atd-sdlc` schema uses this mapping in two places:

- **Apply time** — before implementing any task, the agent fetches the spec
  mapped to each stack listed in `analysis.md` and conforms to it.
- **Tasks** — the mandatory final task group contains one conformance task per
  affected stack, naming the mapped spec.

## Registering the store

```bash
git clone <atd-standards remote> ~/atd-standards
openspec store register ~/atd-standards
```

With the store registered and the repo's config declaring
`references: [atd-standards]`, generated instructions carry an index of the
standards specs (one-line summaries plus fetch recipes). If the store is not
registered, instruction generation degrades to a warning diagnostic — it does
not fail — but apply-time standards consultation is impossible, so
registration is part of developer bootstrap.

## Updating standards

Standards are specs; changes to them go through the store's own OpenSpec
workflow (propose → review → sync). One edit propagates to every ATD repo on
the next instruction generation — no fork release, no per-repo copying.
Stack leads own their spec (see CODEOWNERS in the store repository).

Propagation reads YOUR LOCAL CLONE: refresh it to pick up upstream edits —
`git -C ~/atd-standards pull --ff-only` (the bootstrap script does this on
re-run). A stale clone silently serves stale standards.

## Adding a new stack

1. Add `<stack>-standards` spec to the store.
2. Extend the explicit mapping in the `atd-sdlc` schema's `analysis`, `tasks`,
   and `apply` instructions (fork change required — the mapping is deliberately
   explicit, never inferred).
