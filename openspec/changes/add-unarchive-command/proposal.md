## Why

`openspec archive` does two things at once: it **merges** a change's delta specs into `openspec/specs/` and **moves** the change folder into `openspec/changes/archive/`. There is **no command to undo it.** When a change is archived by mistake — or peer-review feedback lands after the archive has — the user is left with manual `git` surgery the maintainer has to walk people through case by case ([Discord, 2026-06], where he committed to "follow up with a PR to add `/opsx:unarchive` (or `openspec unarchive <name>`)").

`git revert` only works when the archive is its own clean commit. The motivating case is the hard one: *"the archive is part of a commit with other changes, so I cannot simply revert. Am I in a bind?"* This proposal adds the inverse command — `openspec unarchive [change-name]` plus a thin `/opsx:unarchive` skill — and closes the one archive-side gap that makes a **deterministic** reversal possible at all.

## Background: archive is a one-way door, and the delta is not self-inverting

Verified against `Fission-AI/OpenSpec` at `main` (commit `546224e`, #1248) on 2026-06-29. Two facts define the whole design.

**1. The forward merge is deterministic; the reverse is not free.** `buildUpdatedSpec` ([src/core/specs-apply.ts:240-307](../../../src/core/specs-apply.ts)) builds a `name → requirement-block` map from the base spec and applies operations in a fixed order — RENAMED → REMOVED → MODIFIED → ADDED. Inverting each operation is asymmetric:

| Delta op | Forward effect | Invertible from the delta alone? |
|---|---|---|
| **ADDED** | inserts a new requirement block | **Yes** — the block carries its own name; remove it by name. |
| **RENAMED** | `FROM`→`TO`, body preserved | **Yes** — both names are stored; rename `TO`→`FROM`. |
| **REMOVED** | deletes a requirement | **No** — the delta stores only the *name* (`plan.removed: string[]`) plus a prose reason. The deleted body is gone. |
| **MODIFIED** | whole-block replace, keyed by name | **No** — the delta stores only the *new* block, never the prior one. |

The conventions spec makes the loss explicit: a MODIFIED delta must "include the complete modified requirement (not a diff)" ([openspec/specs/openspec-conventions/spec.md](../../specs/openspec-conventions/spec.md)). So the pre-image — the bytes that were in `specs/` *before* the archive — is **not** retained anywhere after a forward archive. [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) independently documents this exact `nameToBlock.set(key, mod)` whole-block replace as a *forward-direction* data-loss bug ("discarding any sibling scenarios"), which is the same mechanism that makes MODIFIED non-invertible in reverse.

**2. Archive is non-transactional and has no rollback.** The hook-design discussion states it plainly: *"the current archive operation is not transactional — if a step fails partway, there's no rollback"* ([#682](https://github.com/Fission-AI/OpenSpec/issues/682)). Unarchive is, in effect, the rollback that archive never had — so it must itself be atomic.

**The consequence:** a reversal that only reads the archived delta can faithfully undo ADDED and RENAMED, but **cannot** restore a REMOVED or MODIFIED requirement. A command that silently "reverses" by deleting the modified requirement (or leaving a hole) would corrupt `specs/` — the precise failure mode OpenSpec already treats as a cardinal sin ([#1246](https://github.com/Fission-AI/OpenSpec/issues/1246); the `prevent-silent-spec-drop` work). True determinism requires capturing the pre-image **at archive time**, when it still exists.

## What Changes

The design principle mirrors the one the project is converging on (deterministic CLI, thin agent): **the reversal is a pure, code-only transform the CLI owns; the agent does none of it.** Ordered by leverage:

1. **REVERSAL SNAPSHOT — make archive reversible (`cli-archive`, MODIFIED).** When `openspec archive` rewrites `specs/`, it also writes a small, self-contained **reversal snapshot** *inside the change folder* (so it moves into the archive with everything else and survives in git): for each affected spec it records the pre-merge file content (the pre-image, or "absent" for a newly-created spec) and the post-merge content digest. This is the one missing primitive. It is forward-only metadata — it changes nothing about how archive merges or moves — and it is what lets unarchive restore `specs/` **byte-for-byte deterministically**, uniformly across ADDED/MODIFIED/REMOVED/RENAMED/created/deleted, with no re-parsing and no inference. (Conceptually adjacent to [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)'s proposed base-fingerprint, generalized from a hash to the full pre-image.)

2. **THE COMMAND — `openspec unarchive [change-name]` (`cli-unarchive`, NEW).** The deterministic inverse of archive:
   - **Resolve** the archived folder. `unarchive` accepts either the change `<name>` or the full archived directory id. The leading prefix is treated as **opaque up to the name** — it strips a `YYYY-MM-DD-` prefix today and tolerates the sequence/`NNN-` and configurable prefixes proposed in [#409](https://github.com/Fission-AI/OpenSpec/issues/409)/[#787](https://github.com/Fission-AI/OpenSpec/pull/787)/[#1192](https://github.com/Fission-AI/OpenSpec/issues/1192). When several archived entries share one name, it **never silently picks**: interactive mode prompts; `--json`/non-interactive requires the full id or errors with the candidate list. Resolution reuses the archive-reading plumbing added in [#399](https://github.com/Fission-AI/OpenSpec/pull/399) (`getArchivedChangesData()`).
   - **Reverse the spec merge**, deterministically, from the snapshot: restore each affected spec's recorded pre-image (recreating deleted specs, deleting specs that archive created). Guarded by a **drift check** — if a spec no longer matches the post-merge image the snapshot recorded (e.g. a later change touched the same requirement; the stacked-archive hazard of [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md) and [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)), unarchive **refuses** rather than clobber, and points the user at `--keep-specs`.
   - **Move** the folder back from `changes/archive/<dir>/` to `changes/<name>/`, reusing the Windows-safe `moveDirectory()` helper ([src/core/archive.ts:116-128](../../../src/core/archive.ts), the EPERM/EXDEV fallback from [#605](https://github.com/Fission-AI/OpenSpec/pull/605)); error if an active `changes/<name>/` already exists (mirrors archive's no-overwrite contract).
   - **Atomicity**: stage and validate the whole reversal first; on any failure, *"Abort. No files were changed."* — matching archive's existing abort contract and the failure surface [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) defines, and finally giving archive the rollback [#682](https://github.com/Fission-AI/OpenSpec/issues/682) noted it lacks.
   - **`--keep-specs`**: restore the folder *without* touching `specs/`. Always deterministic and always safe (a pure folder move). It is the literal mirror of archive's `--skip-specs` ([#28](https://github.com/Fission-AI/OpenSpec/pull/28)) and the escape hatch for any case the snapshot can't cover.
   - **Graceful degradation for pre-snapshot archives.** Changes archived before this feature have no snapshot. Unarchive then restores ADDED/RENAMED by delta inversion (the self-invertible half), and for any REMOVED/MODIFIED it **refuses to guess** — it reports exactly what it cannot safely reverse and directs the user to `--keep-specs` (optionally assisted by git). It never silently produces a wrong spec.

3. **THE SKILL — `/opsx:unarchive` (`opsx-unarchive-skill`, NEW).** A thin wrapper that **delegates to the `openspec unarchive` CLI** rather than re-implementing the move-and-un-merge in prose. This is the maintainers' stated direction after the `/opsx:archive` skill drifted from the CLI ([#863](https://github.com/Fission-AI/OpenSpec/issues/863), [#799](https://github.com/Fission-AI/OpenSpec/issues/799), [#656](https://github.com/Fission-AI/OpenSpec/issues/656)): the deterministic reversal lives in TypeScript, the skill only selects the change, confirms, and renders results. It ships in the **expanded** workflow profile, not the deliberately-minimal core ([#913](https://github.com/Fission-AI/OpenSpec/issues/913), [#762](https://github.com/Fission-AI/OpenSpec/issues/762)), and because it calls the CLI it carries no dependency on another skill being installed (the [#913](https://github.com/Fission-AI/OpenSpec/issues/913) failure mode).

### Companion (separable): a model-free CI drift gate

This thread answers the question the same Discord conversation ended on — *"this means that inference is needed in the CI… any recommendations here?"* — when the user observed that letting the archive-time `sync` run through the agent makes the merged `specs/` non-deterministic, so a naive CI gate would have to run a model.

**Recommendation: don't put a model in CI.** The delta merge is mechanical and already deterministic in code; only the agent-driven `/opsx:sync` path introduces wording drift. The clean fix is to let the agent author locally and have CI verify the deterministic output as a plain binary. Today that is impossible: the deterministic engine `applySpecs()` ([src/core/specs-apply.ts:391](../../../src/core/specs-apply.ts)) has **zero callers** — it is reachable only *inside* `openspec archive`, bundled with the folder move. There is no standalone command that applies (or just checks) the merge.

The fix is small and reuses the engine this PR is already exercising: expose it as `openspec sync [change]` (apply deltas to `specs/` without archiving) with a `--check` mode that exits non-zero when committed `specs/` differ from the regenerated output — a codegen/IaC-style drift gate CI runs without any model. **This PR de-risks that companion directly:** the reversal snapshot makes `archive` → `unarchive` a verifiable, byte-exact round-trip on `specs/`, which is the determinism property the CI gate depends on.

It is called out as **separable** so the owner can decide whether it lands in this PR or a fast follow-up; the unarchive core does not depend on it. (Scoped here, fully argued in [design.md](./design.md) Decision 6, but no `cli-sync` spec delta is included in this PR.)

## Capabilities

### New Capabilities

- `cli-unarchive`: the `openspec unarchive [change-name]` command — the deterministic inverse of `openspec archive`. It resolves an archived change (prefix-tolerant, never auto-picking among ambiguous matches), moves the folder back to active, and reverses the spec merge from the archive's reversal snapshot under a drift guard, atomically (abort leaves no partial state). `--keep-specs` restores the folder without touching `specs/`; pre-snapshot archives degrade gracefully (reverse the self-invertible half, refuse to guess the rest).
- `opsx-unarchive-skill`: a `/opsx:unarchive` workflow skill that delegates to the `openspec unarchive` CLI for the deterministic work, handling only change selection, confirmation, and result rendering. Ships in the expanded profile; carries no cross-skill dependency.

### Modified Capabilities

- `cli-archive`: when archive rewrites `specs/`, it additionally captures a self-contained **reversal snapshot** inside the change folder (per-spec pre-image plus post-merge digest) so the operation becomes deterministically reversible. Forward-only and backward-compatible — it does not change how archive merges, moves, validates, or what it prints; archives created before this feature simply have no snapshot.

### Companion capability (separable; not specced in this PR)

- `cli-sync` (recommended follow-up): a deterministic `openspec sync [change]` that applies delta specs to `specs/` without archiving, plus a `--check` drift-gate mode for model-free CI. Enabled and de-risked by this PR's snapshot/round-trip work; included here as a design recommendation so the owner can decide PR-vs-follow-up.

## Impact

- `src/core/archive.ts` — at the point specs are rewritten (`buildUpdatedSpec`/`writeUpdatedSpec`, ~414-472), also write the reversal snapshot (pre-image + post-merge digest) into the change folder before the move. No change to merge/move/validate behavior or output. Reuse `moveDirectory()`/`copyDirRecursive()` (116-128).
- `src/core/unarchive.ts` (**new**) — `UnarchiveCommand` mirroring `ArchiveCommand`'s shape (human + `--json` modes, `ResolvedOpenSpecRoot`, blocked-error → diagnostic): resolve archived dir, drift-check, restore pre-images (or delta-invert / refuse for pre-snapshot), move folder back, atomic abort.
- `src/core/specs-apply.ts` — factor the invertible half (delta-inversion for ADDED/RENAMED used by the pre-snapshot fallback) alongside the existing `buildUpdatedSpec`; no change to forward behavior.
- `src/core/list.ts` / `src/core/view.ts` — reuse `getArchivedChangesData()` ([#399](https://github.com/Fission-AI/OpenSpec/pull/399)) to resolve/disambiguate archived candidates; after unarchive the entry leaves `list --archived` and returns to active `list`.
- `src/cli/index.ts` — register `unarchive [change-name]` with `--keep-specs`, `-y/--yes`, `--no-validate`, `--json`, `--store` (mirrors the archive registration at 326-343).
- `src/core/templates/workflows/unarchive-change.ts` (**new**) — `getUnarchiveChangeSkillTemplate()` + `getOpsxUnarchiveCommandTemplate()`, modeled on `archive-change.ts` but delegating to the CLI.
- Registration/wiring — export from `skill-templates.ts`; add `unarchive` to `ALL_WORKFLOWS` ([src/core/profiles.ts:19](../../../src/core/profiles.ts)) and `WORKFLOW_TO_SKILL_DIR` ([src/core/init.ts:65](../../../src/core/init.ts)); **not** added to `CORE_WORKFLOWS`. Command generation is generic (no adapter changes). Add a `/opsx:unarchive` row to `docs/opsx.md`.
- Tests — mirror `test/core/archive.test.ts`: resolve/disambiguate, byte-exact round-trip (`archive` then `unarchive` restores `specs/` exactly), drift refusal, `--keep-specs`, destination-collision abort, pre-snapshot degradation, atomic "no files changed" on failure, Windows `moveDirectory` path, and template-generation snapshots. Per [openspec/config.yaml](../../config.yaml), run on Windows CI.

## Issues addressed

All references verified against `Fission-AI/OpenSpec` at `main` (`546224e`) on 2026-06-29. No prior unarchive/rollback/restore issue or PR exists — this is greenfield.

Closes / delivers:

- The maintainer's Discord commitment to add `/opsx:unarchive` (or `openspec unarchive <name>`) that "moves the folder back and reverses the spec merge for you," including the hard case where the archive is buried in a multi-file commit so `git revert` is not an option.

Directly enables / strengthens:

- [#682](https://github.com/Fission-AI/OpenSpec/issues/682) — archive "is not transactional… there's no rollback." Unarchive is that rollback, and is itself atomic.
- [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) — confirms the MODIFIED whole-block-replace loses the pre-image. The reversal snapshot retains it (generalizing #1246's proposed base-fingerprint), and unarchive's drift guard refuses to clobber a requirement a later change has since touched.
- [#863](https://github.com/Fission-AI/OpenSpec/issues/863), [#799](https://github.com/Fission-AI/OpenSpec/issues/799), [#656](https://github.com/Fission-AI/OpenSpec/issues/656) — "the archive skill re-implements merge/move instead of calling the CLI." `/opsx:unarchive` is CLI-first by construction, the pattern these issues ask for.

Companion answers (the CI-determinism thread):

- The Discord "inference in CI" question and the [#863](https://github.com/Fission-AI/OpenSpec/issues/863)/[#656](https://github.com/Fission-AI/OpenSpec/issues/656) "why not the deterministic CLI" cluster → recommend a model-free `openspec sync --check` drift gate (companion; see design Decision 6), de-risked by this PR's round-trip determinism.

Delineated from adjacent work (coordinate, don't collide):

- [#409](https://github.com/Fission-AI/OpenSpec/issues/409) / [#787](https://github.com/Fission-AI/OpenSpec/pull/787) / [#1192](https://github.com/Fission-AI/OpenSpec/issues/1192) (archive-folder prefix scheme: date → sequence/configurable) — unarchive's resolver is built prefix-tolerant so it survives whichever scheme lands; it does not pick a scheme.
- [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md) — planning-time archive ordering and "parallel work reintroducing assumptions another change removed." Unarchive's drift guard is the runtime counterpart at the spec layer; the two compose (ordering metadata up front, drift refusal at reversal time).
- [#704](https://github.com/Fission-AI/OpenSpec/issues/704) / [#682](https://github.com/Fission-AI/OpenSpec/issues/682) (archive hooks) — if `pre/post-archive` hooks land, a symmetric `pre/post-unarchive` point is the natural extension; named so it fits, not built here.
- [#709](https://github.com/Fission-AI/OpenSpec/issues/709) (`git mv` for archive) — unarchive reuses the same `moveDirectory()` helper, so a future switch to `git mv` covers both directions at once.

Related, out of scope (referenced, not closed):

- [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) — first-class lifecycle timestamps (`created`/`updated`/`archived`). Today archive does not persist an `archived` timestamp (only the folder-name prefix). If/when #1245 lands, unarchive should clear it on restore; this PR notes the hook but does not add the field.
- [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) — moving archive-time existence checks into `validate`. Unarchive adopts the same "Abort. No files were changed." contract; broadening `validate` itself is that issue's scope.
