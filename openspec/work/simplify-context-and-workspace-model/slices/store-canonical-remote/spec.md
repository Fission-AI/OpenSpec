# Store Canonical Remote Spec (3.3)

## Outcome

Teammate onboarding stops dead-ending at "register the store". A store
can record where it is cloned from — once, in its committed identity
file — and every surface that today says "get a checkout from a
teammate" can instead say exactly where to clone from: doctor shows the
remote, the unresolved-reference warning names the clone source, and
register guidance carries it. Recording a remote is not sync: nothing
clones, pulls, pushes, or branches.

## Locked Decisions (roadmap, 2026-06-11)

1. **Optional canonical remote in `.openspec-store/store.yaml`** (the
   shared, committed home), populated at setup/register when known.
2. **Doctor surfaces it; unresolved-reference and register guidance use
   it** ("clone from `<remote>`, then register").
3. **Recording a remote is not sync**: no clone, pull, push, or branch
   behavior. (The Git line from 1.3 stands: setup may init and commit
   once; everything else reads.)

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **Two remotes, two homes, one display rule.** The *canonical* remote
   is team-authored and lives in `store.yaml` (committed; the answer to
   "where SHOULD this be cloned from"). The *observed* origin is
   machine-local and lives in the registry entry's existing-but-dormant
   `remote` field (foundation.ts:24,51,171 — the roadmap's "registry
   already supports an optional remote but nothing populates it"),
   captured read-only from `git remote get-url origin` in BOTH setup
   and register (a fresh `git init` simply has no origin; probing in
   both flows keeps `storeBackendsMatch` — registry.ts:169, which
   compares remotes — consistent, so the 1.3 rerun-is-a-no-op contract
   survives: a rerun re-observes the same origin, matches, and reports
   `already_registered: true` without rewriting anything). A
   re-register after the origin URL changed refreshes the recorded
   value — that is the only un-staling mechanism. Display surfaces
   probe live; the persisted registry value exists for surfaces that
   cannot probe (3.6 relationship-health groundwork). Guidance prefers
   canonical, falls back to the observed origin.
2. **How each gets populated.** `store setup` gains `--remote <url>`,
   written into `store.yaml` BEFORE the initial commit so the canonical
   remote ships in the committed store shape. Register's 1.3 contract,
   stated precisely: it never COMMITS and never MODIFIES an existing
   `store.yaml`; it may still create the missing identity file in the
   confirmed-conversion path (operations.ts:708-712,
   `writeMetadataIfMissing`) — and that created metadata does NOT
   include a remote (observed origin is not team-authored canonical).
   Register records the observed origin in the machine-local registry
   entry only. Hand-editing `store.yaml` is the supported
   retrofit path (it is plain YAML; the next doctor/register picks it
   up); `setup --remote` against a path whose `store.yaml` already
   exists FAILS with a fix naming the hand-edit
   ("Edit <abs path>/.openspec-store/store.yaml and commit it") —
   silent acceptance that ignores the flag is the one forbidden
   outcome.
3. **The unresolved-reference clone source rides the declaration.** For
   a store that is not registered locally, no store.yaml or registry
   entry exists to consult — the only locally readable carrier is the
   referencing repo's config. `references:` entries therefore accept
   either a plain id string (3.1 shape, unchanged) or a map
   `{ id, remote? }`. Parsing normalizes to `{id, remote?}[]`
   (`ProjectConfig.references` changes type; consumers:
   instructions.ts and the assembler input). Dedup keys on `id`,
   order-preserving; the FIRST entry carrying a remote wins for that id
   (a later duplicate never overrides, matching the 3.1
   first-occurrence rule). When the remote is known,
   `reference_unresolved`'s fix becomes pasteable verbatim using the
   default-path convention rendered ABSOLUTE
   (`<home>/openspec/<id>` via `os.homedir()` — `~` does not expand
   outside a shell, and agent JSON consumers execute argv directly):
   `git clone <remote> /home/me/openspec/<id> && openspec store register /home/me/openspec/<id> --id <id>`;
   without it, the current teammate-checkout fix stands. Resolved index
   entries do NOT gain a remote field — once registered, the `--store`
   fetch recipe suffices.
4. **Schema change: one-way compatible, strictness retained
   deliberately.** `MetadataStateSchema` (`{version: 1, id}`
   `.strict()`, foundation.ts:184-187; parse-side reconstruction at
   265-282) gains an optional non-empty `remote`. The real
   compatibility contract: the new CLI reads old and new files; an OLD
   CLI REJECTS a remote-bearing `store.yaml` (strict()). Accepted —
   the store format is pre-release and strictness catches typos like
   `remot:` — but recorded as a standing constraint: any future
   `store.yaml` field is a cross-version protocol change requiring a
   version bump or a strictness revisit, and 3.4 must not put target
   declarations in `store.yaml` without addressing this.
5. **Doctor's surfaces**: the store entry's `metadata` section gains the
   canonical `remote` (null when absent); the `git` section gains
   `origin_url` (the observed URL, live-probed like the section's other
   facts, null when no origin) beside the existing `has_remote`
   boolean. Human output shows one Remote line preferring canonical.
   When canonical and observed disagree, JSON simply carries both
   differing values and human shows the canonical line — no new
   diagnostic codes anywhere in this slice (3.6 may add a health note).
   Setup/register/list JSON keeps the shared `StoreOutput` shape
   unchanged (no remote field there); doctor is the inspection surface.
6. **Register guidance upgrades where the remote is knowable.** The
   empty/unhealthy-clone register refusal keeps its shape; the
   setup/register sharing next-steps line names the canonical remote
   when one is recorded, else the observed origin when one exists
   ("Share it: teammates clone <remote> and run openspec store
   register <path>"). Errors about stores with no recorded remote are
   unchanged.

## User Experience

The store author records the canonical remote at creation:

```bash
openspec store setup team-context --path ~/src/team-context \
  --remote git@github.com:acme/team-context.git
```

`store.yaml` (committed in the initial commit):

```yaml
version: 1
id: team-context
remote: git@github.com:acme/team-context.git
```

A teammate cloning the app repo sees instructions that no longer
dead-end:

```text
<referenced_stores>
Store team-context: not registered on this machine.
  Fix: git clone git@github.com:acme/team-context.git /Users/dev/openspec/team-context && openspec store register /Users/dev/openspec/team-context --id team-context
</referenced_stores>
```

(That remote came from the app repo's own declaration:
`references: [{ id: team-context, remote: git@github.com:acme/team-context.git }]`.)

And doctor tells the truth about both remotes, read-only (the existing
doctor layout, store.ts:500-528, plus exactly one new line):

```text
$ openspec store doctor team-context
Store doctor

team-context
  Location: /Users/dev/src/team-context
  OpenSpec root: ok
  Metadata: ok
  Remote: git@github.com:acme/team-context.git
  Git: repository detected (commits: yes, uncommitted changes: no, remote: yes)
```

## Scope

In scope:

- **Metadata**: optional `remote` in `MetadataStateSchema` +
  `StoreMetadataState` + `parseStoreMetadataState` +
  `serializeStoreMetadataState` (`foundation.ts:44,184-187,265-282,302`);
  validation: non-empty string when present (matching the registry's
  `nonEmptyOptionalString`).
- **Setup**: `--remote <url>` flag; written into `store.yaml` before
  the initial commit; rejected when empty; FAILS with the hand-edit fix
  when `store.yaml` already exists; setup also probes the origin for
  its registry entry (consistency with register, rerun no-op
  preserved). JSON stays the shared `StoreOutput` shape — decision 5
  wins; doctor is the inspection surface (plan review resolved the
  earlier contradiction here).
- **Register**: read-only probe `git remote get-url origin` (new
  function in `src/core/store/git.ts` beside the existing probes);
  observed origin recorded in the registry entry's `remote` field;
  re-register refreshes it; never commits, never modifies an existing
  `store.yaml`; the confirmed-conversion identity write stays
  `{version, id}` only (existing contracts pinned).
- **Doctor**: `metadata.remote` (canonical) and `git.origin_url`
  (observed, live-probed) in JSON; one human Remote line preferring
  canonical.
- **References**: `references:` entries accept `string | {id, remote?}`
  (parser keeps the 3.1 raw-and-resilient style: map entries without a
  string `id` are dropped with a warning; `remote` kept when a
  non-empty string; normalized in-memory shape `{id, remote?}[]`;
  dedup by `id`, order-preserving; the first entry carrying a remote
  supplies it, i.e. a later duplicate fills a missing remote but never
  overrides one); the assembler threads the declared remote into
  `reference_unresolved`'s fix
  (`git clone <remote> <home>/openspec/<id> && openspec store register <home>/openspec/<id> --id <id>`,
  the home directory rendered absolute).
- **Sharing guidance**: the setup/register next-steps sharing line
  names the canonical remote when recorded, else the observed origin.
- **Docs**: the `docs/cli.md` store section documents `--remote`, the
  `store.yaml` field, and the reference-with-remote form.
- **Tests**: metadata round-trip (with/without remote; pre-3.3 files
  parse; unknown keys still fail); setup `--remote` lands in the
  initial commit; setup/register rerun stays a no-op and never erases
  the recorded remote; register records the observed origin, refreshes
  it on re-register, never commits, never modifies existing
  `store.yaml`; conversion-created metadata has no remote; doctor JSON
  + human surfaces incl. canonical/observed disagreement (both shown,
  no diagnostic); references parser accepts both entry shapes incl.
  mixed duplicates (`[x, {id: x, remote: r}]` → one entry, first
  remote wins) and map-with-invalid-id (`reference_invalid_id` wins,
  remote ignored); unresolved fix with and without a declared remote;
  `--no-init-git` setup records the remote in the working-tree
  `store.yaml` without a commit; e2e onboarding flow — app repo
  declares `{id, remote}` with a local-path remote, fresh machine
  state, instructions name the clone command, executing it verbatim +
  register + rerun shows the resolved index.

Out of scope:

- Any clone/pull/push/sync behavior, remote validation beyond
  non-empty, or network access (`git remote get-url` reads local
  config).
- Auto-writing the canonical remote into an existing `store.yaml` at
  register time (register never modifies an existing identity file);
  a future `store set-remote` command (later idea if hand-editing
  proves insufficient).
- Conflict handling between canonical and observed remotes (doctor
  shows both; 3.6 may add a health note).
- Relationship health (3.6).

## Acceptance Criteria

### The Canonical Remote Is Committed Identity

#### Scenario: Setup Records The Remote In The Initial Commit

- **GIVEN** `store setup team-context --path <p> --remote <url>`
- **WHEN** setup completes
- **THEN** `<p>/.openspec-store/store.yaml` contains `remote: <url>`
- **AND** the initial commit contains that exact file content (a clone
  is born knowing its canonical remote)
- **AND** `--remote ""` fails cleanly before creating anything
- **AND** setup without `--remote` produces today's byte-identical
  `store.yaml`

#### Scenario: Old And New Metadata Both Parse

- **GIVEN** a pre-3.3 `store.yaml` (`version` + `id` only) and a 3.3
  one carrying `remote:`
- **WHEN** register, doctor, and `--store` resolution run against each
- **THEN** both parse and behave identically apart from the surfaced
  remote
- **AND** unknown extra keys still fail (the schema stays strict)

### The Observed Origin Is Machine-Local

#### Scenario: Register Records The Origin Read-Only

- **GIVEN** a cloned store checkout whose Git origin is `<url>`
- **WHEN** the user registers it
- **THEN** the machine-local registry entry's `remote` is `<url>`
- **AND** an existing `store.yaml` is not modified and no commit is
  created (the confirmed-conversion path may still create a missing
  identity file, and that file carries no remote)
- **AND** registering a checkout with no origin leaves the registry
  remote unset
- **AND** the probe reads local Git config only — pinned by using a
  non-routable remote URL (TEST-NET) that would hang or fail on any
  network touch

#### Scenario: Reruns Never Erase The Observed Remote

- **GIVEN** a registered store whose registry entry records an origin
- **WHEN** setup or register reruns for the same id and path with the
  origin unchanged
- **THEN** the outcome is the 1.3 no-op (`already_registered: true`)
  and the recorded remote is untouched
- **AND** a re-register after the origin URL changed refreshes the
  recorded value

#### Scenario: Setup Cannot Silently Ignore --remote

- **GIVEN** `store setup` with `--remote` against a path whose
  `store.yaml` already exists
- **WHEN** setup runs
- **THEN** it fails with a fix naming the hand-edit path
  ("Edit <abs path>/.openspec-store/store.yaml and commit it")

### The Surfaces Use It

#### Scenario: Doctor Shows Both Remotes

- **WHEN** doctor inspects a store with a canonical remote and an
  origin
- **THEN** JSON carries `metadata.remote` and `git.origin_url`
- **AND** human output shows one Remote line preferring the canonical
  value
- **AND** stores without remotes show no Remote noise and raise no new
  diagnostics

#### Scenario: The Unresolved Reference Names The Clone Source

- **GIVEN** an app repo declaring
  `references: [{id: team-context, remote: <url>}]` and no local
  registration
- **WHEN** instructions run
- **THEN** the `reference_unresolved` fix is
  `git clone <url> <home>/openspec/team-context && openspec store register <home>/openspec/team-context --id team-context`
  with `<home>` rendered as the absolute home directory
- **AND** a plain-string reference keeps today's fix
- **AND** both reference entry shapes index identically once the store
  is registered
- **AND** `[team-context, {id: team-context, remote: <url>}]` indexes
  as one entry whose unresolved fix carries the remote
- **AND** a map entry with an invalid id degrades as
  `reference_invalid_id`, its remote ignored

#### Scenario: Sharing Guidance Names The Remote

- **GIVEN** a store whose `store.yaml` records a canonical remote
- **WHEN** setup or register prints its sharing next-steps
- **THEN** the sharing line names that remote as the clone source
- **AND** a store with no canonical remote but an observed origin
  names the origin instead (the fallback half of decision 1)
- **AND** a store with neither keeps today's wording

### Onboarding End To End

#### Scenario: Clone-Register-Continue From The Printed Fix

- **GIVEN** fresh machine state, an app repo declaring `{id, remote}`
  where the remote is a local-path Git remote (no network in tests)
- **WHEN** the e2e test runs instructions, executes the printed clone
  command and register, and reruns instructions
- **THEN** the first run degrades with the clone-source fix, the
  printed commands succeed verbatim, and the rerun shows the resolved
  index with the store's specs
