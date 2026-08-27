# Store Canonical Remote Plan (3.3)

## Status

Spec locked 2026-06-11 after two adversarial rounds (the setup-rerun
origin-erasure P1; register's precise write contract; the one-way
strict-schema constraint binding 3.4; mixed references dedup; verbatim
clone fixes). Plan drafted 2026-06-11. Implementation not started.

The main move:

```text
One optional field in store.yaml, one origin probe in both lifecycle
flows, one normalized references shape — and "register the store"
stops being a dead end.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(3.3 section + the recorded autonomous decisions),
`../store-lifecycle-proof/spec.md` (1.3 setup/register contracts),
`../store-references/spec.md` (3.1 reference index contracts).

## Current Code Map (verified during spec review)

- **Metadata**: `StoreMetadataState` (`foundation.ts:44`),
  `MetadataStateSchema` strict at `:184-187`, parse-side
  reconstruction `:265-282` (rebuilds the literal — adding the field
  here too or it drops silently), serializer `:302+`.
- **Registry**: backend `remote?` dormant at `foundation.ts:24,51,171`;
  `storeBackendsMatch` compares remotes (`registry.ts:169`);
  same-id+path re-register allowed (`registry.ts:93-95`) and updates
  via `commitStoreRegistration` (`registry.ts:280-283`); persistence
  flows through `resolveGitStoreBackendConfig`'s spread
  (`foundation.ts:478`) → `withRegisteredStore` (`registry.ts:121-133`)
  — NOT `registry.ts:310` (`registerStore`, no CLI callers).
  `resolveGitStoreBackendConfig` is already async and accepts
  `remote?` (`foundation.ts:451-480`) — no signature change.
- **Setup**: backend resolution happens at TWO sites — the probe must
  reach both or the rerun path erases the remote (the spec-review P1):
  `prepareSetupPlan` (`operations.ts:438`, every rerun over an existing
  directory) and `setupPreparedStore` (`operations.ts:526`,
  `backend ??=`, the fresh-directory path). Probe at the call sites
  and pass through the existing `remote` input — NOT inside
  `resolveGitStoreBackendConfig` (also called on hot read paths,
  `binding.ts:235,305`, and `registry.ts:307`). `store.yaml` written
  at `operations.ts:535` before the commit at `:559-561`; pathspecs
  include `.openspec-store` (`:555`). The `--remote`-vs-existing
  refusal belongs in `prepareStoreSetup` (metadata already read at
  `:410`) so it fires BEFORE prompts, git-identity preflight (`:512`),
  and `ensureOpenSpecRoot` writes (`:521`). Plumbing: `remote?` on
  `SetupStoreInput`, `ResolvedStoreSetupInput`, `PreparedStoreSetup`.
- **Register**: `registerExistingStore` resolves the backend at
  `operations.ts:702` — await the origin probe and pass it in; commits
  registration with `writeMetadataIfMissing: true` at `:708-712`.
- **Sharing guidance**: the line is `store.ts:434` ("Share this store
  by committing and pushing it like any Git repo.") inside
  `printMutationHuman` (`store.ts:418-436`), which receives only
  `StoreMutationOutput` — and decision 5 keeps that JSON remote-free.
  Mechanism: `StoreMutationResult` (operations.ts) gains
  `{canonicalRemote?, observedRemote?}`, populated by setup/register;
  `toMutationOutput` (`store.ts:143-159`) drops them from JSON;
  `printMutationHuman` renders canonical → observed → today's wording.
  Note `store-git.test.ts:135-137` pins today's wording for the
  no-remote case — keep it passing.
- **Git probes**: `gitProbe` pattern in `src/core/store/git.ts` (~158
  `git remote`); the new `getOriginUrl(storeRoot)` sits beside it
  (`git remote get-url origin`, null on non-zero exit).
- **Doctor**: store inspection assembles metadata + git sections
  (`operations.ts:991-994` area); human rendering `store.ts:500-528`,
  git facts line `:483-491`.
- **References**: parser `project-config.ts:172-200` (string entries,
  dedup by raw string); `ProjectConfig.references: string[]` consumers:
  `instructions.ts:79-82` (`loadConfigAndReferences`),
  `AssembleReferenceIndexInput` (`references.ts:190-194`), assembler
  id loop + `registerFix` (`references.ts:51-53,227+`).
- **Tests**: `test/core/store/foundation.test.ts` (metadata
  round-trip), `test/commands/store.test.ts` + `store-git.test.ts` /
  `test/cli-e2e/store-lifecycle.test.ts` (setup/register/doctor),
  `test/core/project-config.test.ts`, `test/core/references.test.ts`,
  `test/commands/store-references.test.ts`, helpers in
  `test/helpers/` (run-cli, store-git, openspec-fixtures,
  fs-snapshot).

## Implementation Plan

### Checkpoint 1 — metadata, lifecycle, doctor (commit)

1. `foundation.ts`: `remote?: string` on `StoreMetadataState`;
   `remote: nonEmptyOptionalString()` in `MetadataStateSchema` (stays
   strict); parse reconstruction and serializer carry it.
2. `git.ts`: `getOriginUrl(storeRoot): Promise<string | null>` via
   `gitProbe(storeRoot, ['remote', 'get-url', 'origin'])` — TRIM the
   stdout (gitProbe returns the trailing newline; see `git.ts:152-159`
   for the trim-before-interpret pattern); empty/non-zero → null.
3. Setup (`operations.ts` + `store.ts` command wiring):
   - `--remote <url>` option threaded through the input/plan types;
     empty → clean failure in `resolveSetupInput`/prepare, asserting
     NOTHING was created.
   - `store.yaml` write includes `remote` when given; existing
     `store.yaml` + `--remote` → error with the hand-edit fix, raised
     in `prepareStoreSetup` before prompts/preflight/writes.
   - BOTH backend-resolution sites probe the origin (fresh init →
     none) so the registry entry shape matches register's and reruns
     stay no-ops.
4. Register (`operations.ts:702` area): probe origin, pass into
   `resolveGitStoreBackendConfig`/the backend input so the registry
   entry records it; conversion metadata stays `{version, id}`.
5. Doctor: `metadata.remote` (from store.yaml) + `git.origin_url`
   (live probe) in JSON; human Remote line preferring canonical,
   omitted when neither exists.
6. Sharing next-steps: thread `{canonicalRemote?, observedRemote?}`
   through `StoreMutationResult` (dropped from JSON by
   `toMutationOutput`); `printMutationHuman` renders canonical →
   observed → today's wording; three tests (canonical, origin-only,
   neither — the last already pinned at `store-git.test.ts:135-137`).
7. Tests: round-trip with/without remote; pre-3.3 parse; unknown keys
   fail; setup `--remote` in the initial commit (`git show` content
   assert); `--remote ""` fails; `--remote` + existing store.yaml
   fails with hand-edit fix; setup without `--remote` byte-identical
   store.yaml; `--no-init-git` records remote without commit; register
   records origin (TEST-NET URL), refreshes on re-register, no-op
   rerun preserves it (`already_registered: true`), no-origin leaves
   unset, no commits, existing store.yaml untouched; conversion
   metadata remote-free; doctor JSON + human incl. disagreement (both
   shown, no diagnostic) and the no-remote no-noise case; `--store`
   resolution against a remote-bearing store.yaml behaves identically.
   Fixture mechanics: TEST-NET pin via `git init` + `git remote add
   origin https://192.0.2.1/x.git` (NEVER clone from it — get-url
   reads config only); disagreement via `remote add origin A` +
   hand-edited `store.yaml` remote B.

### Checkpoint 2 — references with remotes, e2e, docs (commit)

1. `project-config.ts`: `ReferenceDeclaration {id, remote?}`; the
   ZOD schema's `references` field changes too
   (`z.array(z.union([z.string(), z.object({...})]))` or decouple the
   inferred type — `ProjectConfig` is `z.infer`, project-config.ts:60);
   parser accepts `string | map` entries (map without string id →
   dropped with warning; non-string remote → dropped with warning, id
   kept); dedup by id keeps the first position, and the FIRST entry
   carrying a remote supplies it — a later duplicate fills a missing
   remote, never overrides (pin `[x, {id: x, remote: r}]` explicitly).
2. `references.ts`: `AssembleReferenceIndexInput.references:
   ReferenceDeclaration[]`; the id loop walks declarations;
   `registerFix(id, remote?)` renders the clone form with the home
   directory ABSOLUTE via `os.homedir()`
   (`git clone <remote> <home>/openspec/<id> && openspec store
   register <home>/openspec/<id> --id <id>`) when remote present,
   today's wording otherwise; invalid-id check runs before remote use
   (map-with-invalid-id is an ASSEMBLER test, not a parser test).
3. `instructions.ts`: `loadConfigAndReferences` passes declarations
   through (type ripple only).
4. Tests: parser both shapes + the pinned mixed duplicate;
   assembler unresolved fix with/without remote + map-with-invalid-id;
   both shapes index identically once registered; e2e onboarding —
   local-path remote, fresh XDG state AND a scratch HOME in env (so
   `os.homedir()` in both the CLI and the rendered fix point inside
   the temp dir), instructions print the absolute-path fix, the test
   splits it on `&& `, runs the git half via the git helper and the
   register half via runCLI (no shell — which is exactly why the fix
   renders absolute paths), rerun shows the resolved index.
5. `docs/cli.md`: `--remote` on setup, the `store.yaml` field, the
   reference-with-remote form, one onboarding example.
6. Full suite; built-binary smoke of the UX transcript.

## Risks And Guardrails

- **The rerun no-op is the regression magnet**: `storeBackendsMatch`
  compares remotes, so BOTH flows must produce the same backend for
  the same checkout. The no-op tests (setup rerun, register rerun)
  are the net; run them against a checkout WITH an origin.
- **Absolute fix paths are the contract**: `~` never expands outside
  a shell and agent JSON consumers execute argv directly, so
  `registerFix` renders `os.homedir()` absolute. The e2e sets HOME in
  env so the rendered path lands in the temp dir.
- **references type ripple**: `string[]` → `ReferenceDeclaration[]`
  touches project-config tests asserting raw arrays; update them with
  the normalized shape, keep the 3.1 semantics pins intact.
- **Doctor layout**: one added line, nothing else moves (3.2's
  byte-stable doctor expectations in store-lifecycle tests must keep
  passing untouched where no remote exists).
- **No new diagnostic codes** anywhere; the vocabulary sweep and
  allowlist tests stay untouched.

## Done Definition

- All spec acceptance scenarios pass; both checkpoints green on the
  full suite and committed.
- The e2e onboarding journey executes the printed fix verbatim and
  continues to a resolved index.
- Roadmap 3.3 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to 3.4.
