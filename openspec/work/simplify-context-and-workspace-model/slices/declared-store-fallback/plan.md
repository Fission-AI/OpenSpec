# Declared Store Fallback Plan (3.2)

## Status

Spec locked 2026-06-11 after two adversarial rounds (the store-selected
predicate adopted by all seven source-keyed consumers; init's pointer
guard; malformed-pointer errors; one-hop rule; warning-silent resolver
reads; the recorded doctor-wording amendment). Plan drafted 2026-06-11.
Implementation not started.

The main move:

```text
One predicate ("a store-selected root has storeId"), one pointer branch
in the resolver, one init guard — and externalized planning needs no
flags.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(Phase 3 precedence lock + the recorded amendment),
`../store-references/spec.md` (3.1 config patterns),
`../store-lifecycle-proof/spec.md` (hint-continuity contracts).

## Current Code Map (verified during spec review)

- **Resolver**: `resolveOpenSpecRoot` (`src/core/root-selection.ts:258-314`);
  the nearest-root arm at 277-280 (`findRepoPlanningRootSync` returns
  the project root whose `openspec/` exists and terminates at the
  nearest ancestor — `planning-home.ts:52-77`); the stores-hint error
  at 293-302; implicit at 305-313. `resolveStoreRoot` (134-218, module
  private, same file) is the pipeline the pointer branch calls.
- **Source-keyed consumers to switch to the predicate** (all EIGHT
  checks — plan review found the spec's "seven" missed one):
  `emitStoreRootBanner` (`root-selection.ts:339`), `withStoreFlag`
  (`root-selection.ts:349`), new-change path display
  (`src/commands/workflow/new-change.ts:77`), status storeId
  threading (`src/commands/workflow/status.ts:106` → `buildNextSteps`
  appends `--store`), validate noun-suggestion suppression
  (`src/commands/validate.ts:136`), show noun-suggestion suppression in
  BOTH branches (`src/commands/show.ts:138` and
  `printNonInteractiveHint` at `show.ts:160`), archive absolute display
  paths (`src/core/archive.ts:446`). Spec amendment recorded in the
  changelog: eight checks, not seven.
- **Config**: `ProjectConfigSchema`/`readProjectConfig`
  (`src/core/project-config.ts`); the resolver does NOT reuse
  `readProjectConfig` (it would re-emit field warnings) — it does a
  targeted read.
- **Init**: `InitCommand.execute` → `createDirectoryStructure`
  (`src/core/init.ts:144, 455-487`) unconditionally scaffolds under an
  existing `openspec/`; the guard goes before that.
- **Tests**: `test/core/root-selection.test.ts` (resolver unit),
  `test/commands/store-root-selection.test.ts` (CLI),
  `test/core/init.test.ts`, `test/cli-e2e/` harness,
  `test/helpers/openspec-fixtures.ts` (shared fixtures from 3.1).

## Implementation Plan

### Checkpoint 1 — resolver + predicate (commit)

1. `src/core/project-config.ts`: add `store: z.string().optional()` to
   the schema; resilient parse keeps a string, drops non-strings with
   a warning (the parser's behavior is unchanged in spirit — the
   RESOLVER, not the parser, owns the malformed-pointer error, and it
   reads the file itself).
2. `src/core/root-selection.ts`:
   - `OpenSpecRootSource` gains `'declared'`.
   - New `isStoreSelectedRoot(root)` predicate (`storeId !== undefined`);
     `emitStoreRootBanner` and `withStoreFlag` switch to it.
   - In the nearest-root arm: stat `openspec/specs` and
     `openspec/changes` as directories. Planning shape → today's path,
     plus the both-shapes check: a targeted, warning-silent read of
     `openspec/config.{yaml,yml}` (small local helper: read file, YAML
     parse in try/catch, pluck `store`) and one stderr warning when a
     `store` key exists ("openspec/config.yaml declares store 'x', but
     this directory is a real OpenSpec root; the declaration is
     ignored.").
   - Config-only → targeted read: no config or no `store` key → today's
     nearest behavior; unparseable config or non-string `store` →
     `invalid_store_pointer` RootSelectionError naming the actual file
     read; a string → call `resolveStoreRoot(id, globalDataDir,
     'declared')` inside a try/catch that **rewraps** any thrown
     `RootSelectionError`/store error with the message prefix
     "Declared in <abs path>: " while preserving `code`, `target`, and
     an UNPREFIXED `fix` — one wrapper covers all ~7 throw paths
     including the `fromStoreError` pass-throughs
     (`root-selection.ts:138,146`), no per-template surgery.
   - `resolveStoreRoot` gains only a source parameter (default
     `'store'`; `makeRoot` already takes source as its second arg).
   - The targeted read is a small exported helper (host it next to
     `readProjectConfig` in `project-config.ts`, reusing its
     `.yaml`/`.yml` preference): read file, YAML parse in try/catch,
     pluck `store` — returning `{value?, malformed?, filePath}`. The
     both-shapes warning fires only for STRING values (a non-string in
     a real root is not a pointer; the resilient parser's later
     drop-warning covers it).
3. Command-layer predicate adoption: new-change display, status
   threading, validate/show suppression, archive display paths — each
   switched from `source === 'store'` to the shared predicate (import
   from root-selection).
4. Tests (resolver unit + CLI):
   - Pointer resolves: source `declared`, store_id set, banner, hints
     carry `--store`, absolute paths in new-change/archive output, and
     the show nothing-to-show hint suppresses noun-form suggestions
     (the eighth consumer).
   - `--store` beats the pointer, asserting `source === 'store'`.
   - Real root + pointer: stdout byte-identical to a no-pointer run —
     same directory, add/remove the line in place, using deterministic
     commands (`status --json`, `list --json`; normalize or avoid
     `durationMs`-bearing outputs like validate's) — plus exactly one
     stderr warning per invocation in human AND JSON modes, JSON stdout
     clean.
   - Config-only without pointer (positive assertions — no "today"
     binary exists to diff): `source === 'nearest'`, path is the
     config-only dir, zero stderr warnings, registry never consulted.
   - Malformed pointer (non-string, unparseable YAML) →
     `invalid_store_pointer` with origin AND a no-write assertion (the
     pointer dir is untouched); invalid grammar → `invalid_store_id`
     with the declared prefix; ALL five taxonomy codes prefixed
     (`unknown_store`, `no_registered_stores`, `unhealthy_store_root`,
     `store_identity_mismatch`, `invalid_store_id`), each asserting
     the prefixed `diagnostic.message` and an UNPREFIXED
     `diagnostic.fix`.
   - One hop: pointer → store whose config has `store:` → resolves to
     the first store.
   - `.yml` origin naming.
   - No-pointer no-root: stores-hint error byte-identical.

### Checkpoint 2 — init guard, e2e, docs (commit)

1. `src/core/init.ts`: the guard goes **immediately after `validate()`
   returns `extendMode`** (`init.ts:111`) — before legacy cleanup
   (`:114`, which mutates project files), migration (`:121`, which
   writes global config), and the interactive prompts — so the refusal
   truly creates and changes nothing. Detection: `extendMode` and the
   shared targeted-read helper reports a string `store:` in a
   config-only `openspec/`. Test asserts: refusal with the conversion
   guidance; NO filesystem changes (project tree snapshot identical;
   global data dir untouched); after removing the line, a rerun
   scaffolds `openspec/specs/` and `openspec/changes/` normally.
2. e2e externalized-planning journey (`test/cli-e2e/` or
   `test/commands/`, runCLI): rootless app repo with pointer →
   `new change`, `status`, `instructions` (+ references composition:
   the store's own `references:` appear per 3.1 symmetry), artifact
   writes, `validate`, `list`, `show`, `archive` — no `--store`
   anywhere; work lands in the store; pointer dir never gains
   `specs/`/`changes/` (snapshot); banner + JSON root block assert
   `declared`.
3. `docs/cli.md`: "Declaring a default store" subsection next to the
   references one (the pointer, precedence, the init conversion note).
4. Full suite; built-binary smoke of the UX transcript.

## Risks And Guardrails

- **Predicate adoption must not change `--store` behavior**: the
  predicate is true for both sources; every switched site already
  behaved this way for explicit stores — the suite's existing
  store-root expectations are the net.
- **Resolver read cost**: the targeted read happens only when the
  nearest root exists (one stat for the config file in the
  planning-shape case; full read only in the config-only case or for
  the both-shapes warning). Keep it synchronous-fs and tiny; no
  `readProjectConfig` reuse (its warnings would double-fire — the
  3.1-recorded behavior).
- **`invalid_store_pointer` is a new code**: document it in the slice
  artifacts; additive to the resolver taxonomy (the capstone
  agent-contract inventory picks it up).
- **planning-home untouched**: `findRepoPlanningRootSync` semantics
  stay; only `resolveOpenSpecRoot` classifies the found dir. The
  legacy planning-home workspace branch is unaffected.
- **Byte-identity pins**: the no-pointer baseline assertions must run
  the SAME fixture twice (with/without the line), not rely on
  hand-written expectations.

## Done Definition

- All spec acceptance scenarios pass; both checkpoints green on the
  full suite and committed.
- The e2e journey proves externalized planning end to end without
  flags, including the 3.1 composition.
- Roadmap 3.2 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to 3.3.
