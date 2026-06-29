# Tasks: `openspec unarchive` — deterministic inverse of archive

> Sequenced so each layer is independently testable: archive-side snapshot (the reversibility primitive) → resolution → deterministic reversal + guards → CLI surface → skill/wiring → docs → e2e. Cross-platform concerns (`path.join`, Windows `moveDirectory`, newline-normalized digests) are called out where relevant, per [openspec/config.yaml](../../config.yaml). The CI drift-gate companion (design Decision 6) is intentionally **not** in these tasks — it is a separable follow-up.

## 1. Archive-side: reversal snapshot (the reversibility primitive)

- [ ] 1.1 Define the snapshot format: a self-contained record inside the change folder (e.g. `.openspec/unarchive/` with a manifest + per-spec pre-image files) capturing, for each affected spec, its **pre-merge content** (or an explicit `absent` marker when archive creates the spec) and its **post-merge content digest** (newline-normalized CRLF→LF, scheme-tagged so future canonicalization changes are detectable). Document it in design if the shape shifts during build.
- [ ] 1.2 In `ArchiveCommand` ([src/core/archive.ts](../../../src/core/archive.ts)), at the spec-rewrite point (~414-472), capture each target's pre-image **before** `writeUpdatedSpec`, and the post-merge digest **after**, then persist the snapshot into the change folder **before** `moveDirectory` so it travels into `archive/`.
- [ ] 1.3 Strictly forward-only: assert archive's merge/move/validate behavior and stdout (human + `--json`) are byte-for-byte unchanged when no one reads the snapshot. Add a regression test pinning existing archive output.
- [ ] 1.4 Tests: snapshot present after archiving a change that ADDs/MODIFIEs/REMOVEs/RENAMEs/creates a spec; pre-image matches pre-archive bytes exactly; `absent` marker recorded for created specs; digest stable across CRLF vs LF; `--skip-specs` archive writes **no** snapshot (nothing was merged).

## 2. Resolve an archived change (prefix-tolerant, never auto-pick)

- [ ] 2.1 Add a resolver that maps a bare `<name>` or a full archived dir id to a candidate set under `changes/archive/`, treating the leading prefix as **opaque up to `<name>`** (strip `YYYY-MM-DD-`; tolerate `NNN-`/ISO/configurable per #409/#787/#1192). Reuse `getArchivedChangesData()` ([src/core/view.ts](../../../src/core/view.ts) / [src/core/list.ts](../../../src/core/list.ts), #399).
- [ ] 2.2 Ambiguity policy: >1 match → interactive prompt (most-recent first, never auto-select); `--json`/non-interactive → error listing candidates and require the full id.
- [ ] 2.3 Tests: single match resolves; date-prefixed and (simulated) sequence-prefixed dirs both resolve; bare-name with two matches → prompt (interactive) / error+candidates (`--json`); full-id always resolves unambiguously; unknown name → clean not-found error.

## 3. Deterministic reversal + guards (core)

- [ ] 3.1 Create `src/core/unarchive.ts` with `UnarchiveCommand` mirroring `ArchiveCommand` structure (human + `--json`, `resolveOpenSpecRoot`, blocked-error → diagnostic, exit codes).
- [ ] 3.2 Snapshot path: restore each affected spec's recorded pre-image (rewrite modified, recreate deleted, delete archive-created specs) — a byte-exact file restore, no re-parsing.
- [ ] 3.3 Drift guard: before restoring, compare each spec's current content to the snapshot's post-merge digest; on drift, **refuse** the spec reversal and direct the user to `--keep-specs`. (Same-scheme digests only; unknown scheme → treat as drift/unknown, refuse.)
- [ ] 3.4 Destination-collision guard: if `changes/<name>/` already exists, abort (mirror archive's no-overwrite).
- [ ] 3.5 Atomicity: stage + validate the full reversal first; commit order = restore specs → move folder (`moveDirectory`, reuse Windows EPERM/EXDEV fallback); on any failure, *"Abort. No files were changed."*, rolling back restored specs from the still-present snapshot if the move fails.
- [ ] 3.6 `--keep-specs`: skip all spec work; pure folder move; always succeeds when 3.4 passes.
- [ ] 3.7 Tests: byte-exact round-trip (`archive` then `unarchive` restores `specs/` exactly) for ADD/MODIFY/REMOVE/RENAME/create; drift → refusal (no writes); destination collision → abort; `--keep-specs` leaves `specs/` untouched; atomic abort leaves zero partial state; Windows `moveDirectory` path.

## 4. Backward compatibility: pre-snapshot archives (graceful degradation)

- [ ] 4.1 Factor the self-invertible half out of `specs-apply.ts`: delta-inversion for **ADDED** (remove by name) and **RENAMED** (rename `TO`→`FROM`, rewriting the header line). No change to forward `buildUpdatedSpec`.
- [ ] 4.2 When no snapshot exists, reverse ADDED/RENAMED via 4.1; for any REMOVED/MODIFIED, **refuse to guess** — list each requirement that cannot be safely restored and direct to `--keep-specs`.
- [ ] 4.3 (Optional, opt-in) git assist: if a clean pre-archive commit is identifiable, offer to recover the pre-image from git; never automatic.
- [ ] 4.4 Tests: pre-snapshot archive with only ADDED/RENAMED → fully reversed; with REMOVED/MODIFIED → refusal naming the requirements; `--keep-specs` always works regardless of snapshot presence.

## 5. CLI surface

- [ ] 5.1 Register `unarchive [change-name]` in [src/cli/index.ts](../../../src/cli/index.ts) mirroring archive (326-343): `--keep-specs` (with hidden `--skip-specs` alias), `-y/--yes`, `--no-validate`, `--json`, `--store`, hidden store-path; action → `new UnarchiveCommand().execute(...)`.
- [ ] 5.2 `--json` is non-interactive: ambiguity/drift/collision become machine-readable diagnostics with non-zero exit (mirror `ArchiveBlockedError`).
- [ ] 5.3 Tests: flag parsing, `--json` shape on success and each blocked path, `--store` resolution.

## 6. The `/opsx:unarchive` skill (delegates to the CLI)

- [ ] 6.1 Create `src/core/templates/workflows/unarchive-change.ts` with `getUnarchiveChangeSkillTemplate()` + `getOpsxUnarchiveCommandTemplate()`, modeled on `archive-change.ts` but **invoking `openspec unarchive`** for all deterministic work (selection via `openspec list --archived --json`; confirm; render CLI result). No hand-moving folders, no hand-editing specs (anti-#863).
- [ ] 6.2 Encode guardrails: never auto-select among ambiguous archives; surface the CLI's drift refusal and the `--keep-specs` option verbatim; do not re-implement reversal logic in prose.
- [ ] 6.3 Export from `skill-templates.ts`; add `unarchive` to `ALL_WORKFLOWS` ([src/core/profiles.ts:19](../../../src/core/profiles.ts)) and `WORKFLOW_TO_SKILL_DIR` ([src/core/init.ts:65](../../../src/core/init.ts)); **do not** add to `CORE_WORKFLOWS` (#913/#762).
- [ ] 6.4 Tests: template-generation snapshot; assert the template calls the CLI and contains no manual move/merge instructions.

## 7. Docs

- [ ] 7.1 Add a `/opsx:unarchive` row to the command table in `docs/opsx.md` and a short "Undoing an archive" section (covering `--keep-specs` and the drift-refusal behavior).
- [ ] 7.2 Note in docs that the deterministic reversal requires a change archived by this version or later; older archives degrade per design Decision 5.

## 8. End-to-end verification

- [ ] 8.1 E2E: scaffold a spec-driven change with one ADDED, one MODIFIED, one REMOVED, one RENAMED requirement; `archive`; `unarchive`; assert `specs/` is byte-identical to pre-archive and the folder is back under `changes/<name>/`.
- [ ] 8.2 E2E stacked-archive drift: archive change A (MODIFIES req X), then a second change re-MODIFIES X and is archived; `unarchive A` refuses spec reversal and `unarchive A --keep-specs` succeeds with `specs/` untouched.
- [ ] 8.3 E2E ambiguity: two archived entries for one name → `--json` errors with candidates; full-id resolves.
- [ ] 8.4 Validation: `openspec validate add-unarchive-command --strict` passes; `openspec status --change add-unarchive-command` shows artifacts complete.
- [ ] 8.5 Run the suite on macOS, Linux, and Windows CI.
