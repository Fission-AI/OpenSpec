# Assemble Working Context Plan (4.1)

## Status

Spec locked 2026-06-11 after two adversarial rounds (binding.ts dies
whole; the five template guards join; the member-mapping table; pinned
write semantics; getRepoPath deleted). Plan drafted 2026-06-11.
Implementation not started.

The main move:

```text
Delete the dead opening machinery, extract doctor's gather, and the
working set becomes one thin command over data Phase 3 already built.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(Phase 4 + the absorbed 2.3), the deletion ledger
(`../delete-legacy-command-groups/deletion-ledger.md` — updated by this
slice), `../relationship-health/spec.md` (the consumed data shapes).

## Current Code Map (verified during spec review)

- **Deletion targets and their consumers**:
  - `src/core/workspace/` (897 lines): imported by `planning-home.ts`
    and the `src/core/index.ts` barrel only (plus its own tests).
  - `src/core/store/binding.ts` (~300 lines): imported by
    `workspace/foundation.ts` and the `store/index.ts` barrel; tests in
    `test/core/store/registry.test.ts` (the binding describe block).
  - `planning-home.ts`: `PlanningHomeKind = 'repo' | 'workspace'`,
    the workspace state read, `WORKSPACE_DEFAULT_SCHEMA`; consumers of
    `PlanningHome` never branch on `kind === 'workspace'` in production
    (verified — `toPlanningHome` hardcodes repo;
    `resolveCurrentPlanningHomeSync`'s workspace branch is the
    CLI-unreachable carve-out).
  - `change-status-policy.ts` cascade: `summarizeAffectedAreas`,
    `AffectedAreasSummary`, `ChangeNextStepsInput.affectedAreas`,
    workspace next-steps (~:130-135), `PlanningHomeSummary
    .workspaceName`, the `'workspace-planning'` mode member;
    instruction-loader plumbing at `instruction-loader.ts:465-496`.
  - The five template guards:
    `src/core/templates/workflows/{apply-change.ts:57,
    verify-change.ts:41, archive-change.ts:40,
    bulk-archive-change.ts:47, sync-specs.ts:39}` + mirrored second
    occurrences — grep `workspace-planning` in templates to catch all.
  - `getRepoPath` (`store/registry.ts`) + its unit tests.
  - Test deletions: `planning-home.test.ts` workspace cases; the
    legacy-groups workspace-planning LIBRARY pin (:185-203);
    `test/core/workspace/{foundation,legacy-state}.test.ts`.
  - Ledger updates: carve-outs → executed; Surviving tokens pruned;
    `workspace_skills` allowlist entry removed
    (`test/vocabulary-sweep.test.ts:79`).
- **Assembly anchors**: doctor's `gatherHealth`
  (`src/commands/doctor.ts:37-141`) — the DATA half (snapshot +
  health-mode index + targets + root inspection ≈ :42-75) extracts to
  `src/commands/shared-gather.ts`; `readRegistrySnapshot`
  (`store/registry.ts`); `inspectRelationships`
  (`core/relationship-health.ts`); `fetchRecipe` (module-private at
  `references.ts:133` — export); `RelationshipHealth.targets` =
  `HealthTargetEntry[]`; the failure-payload mechanism
  (`resolveRootForCommand` + `failurePayload`, doctor precedent).
- **Command registration**: doctor precedent
  (`src/commands/doctor.ts:registerDoctorCommand`, `cli/index.ts`,
  completions `command-registry.ts`, `STORE_SELECTION_GUIDANCE`,
  parity hashes).

## Implementation Plan

### Checkpoint 1 — the deletions (commit)

Order: leaves first, compiler-verified after each tranche.

1. Templates: remove the five workspace-planning guards (grep-driven);
   regenerate parity hashes + `.codex` guidance; FLIP the parity
   test's guard assertion (skill-templates-parity.test.ts:179 asserts
   the guards exist — it becomes an absence assertion: no generated
   template contains `workspace-planning`).
2. `change-status-policy.ts` cascade + instruction-loader plumbing
   (incl. `ChangeStatus.affectedAreas` and the
   `artifact-graph/index.ts` barrel re-export of
   `AffectedAreasSummary`); the legacy-groups library pin dies; the
   six CLI-surface pins stay green untouched.
3. `planning-home.ts`: collapse to repo-only (keep the interface);
   delete the workspace import; `planning-home.test.ts` workspace
   cases die.
4. `src/core/workspace/` whole + `core/index.ts` barrel line +
   `test/core/workspace/{foundation,legacy-state}.test.ts`.
5. `store/binding.ts` whole + `store/index.ts` barrel line + the two
   binding `it` cases in `registry.test.ts` (:356, :414) and their
   imports.
6. `getRepoPath` + its tests; amend the repo-map ledger note.
7. Ledger + vocabulary-allowlist updates; full suite green; net-LOC
   note in the commit message.

### Checkpoint 2 — assembly: core + command + e2e + docs (commit)

1. `references.ts`: export `fetchRecipe`.
2. `src/commands/shared-gather.ts`: `gatherRelationshipData(root)` →
   `{registrySnapshot, referenceEntries, effectiveTargets,
   storeTargets, projectConfig, storeConfigPath, rootInspection}` —
   doctor refactors onto it (behavior byte-identical; doctor e2e is
   the net), context consumes it.
3. `src/core/working-set.ts` (pure):
   - `WorkingSet {root: {path, source, store_id?, role}, members:
     WorkingSetMember[], status: []}`;
     `WorkingSetMember {role, id, path?, remote?, fetch?, status}`.
   - `assembleWorkingSet({root, referenceEntries, targets,
     registryUnreadable})`: the spec's member-mapping table
     (available = path + empty status; references before targets;
     synthesized entries appended; fetch recipes on available stores).
   - `buildCodeWorkspaceJson(workingSet, rootName)`: pure string
     builder, available members only, `ref:`/`repo:` prefixes.
4. `src/commands/context.ts`: resolution like doctor
   (`allowImplicitRoot: false`, failure payload
   `{root: null, members: []}`); the shared gather;
   human listing (Available sections + "Not available on this
   machine"); `--json`; `--code-workspace <path>` (+`--force`): refuse
   `context_file_exists` exit 1 (spec-amended name — the draft's
   `code_workspace_exists` trips the sweep's `workspace_*` ban);
   missing parent dir → clear error, no mkdir; stderr confirmation
   under `--json`; unresolved members reported on stderr during
   writes; try/catch via `emitFailure` (the 3.6 lesson). CLI +
   completions + `STORE_SELECTION_GUIDANCE` + parity hashes.
5. Tests: working-set unit (mapping table incl. stale-path,
   invalid-id, registry-unreadable-bare members; ordering; fetch);
   builder unit (folders, prefixes, omission); command e2e (three
   session shapes; JSON exact shape; nothing-declared; the write
   matrix — fresh/exists/force/nested-missing-parent/json-stderr;
   read-only snapshot; failure payloads).
6. `docs/cli.md`: context section + summary row + doctor cross-link +
   the project-context vs working-context disambiguation sentence.
7. Full suite; built-binary smoke of the UX transcript.

## Risks And Guardrails

- **Deletion order is the spine**: each tranche compiles and the full
  suite passes before the next; never delete ahead of the compiler.
- **Doctor must not change**: the shared-gather extraction is a pure
  refactor; doctor's e2e suite is the net (behavior-identical — the
  suite asserts fields and sections, not full-output bytes).
- **The six legacy-groups CLI pins** and the user-data byte-identity
  test stay untouched and green — they are the proof the deletions
  changed no repo-local behavior.
- **Parity churn is deliberate twice** (template guards in CP1,
  guidance in CP2) — update hashes from the test diff, never loosen.
- **No new diagnostic codes except `context_file_exists`** (the one
  write needs the one refusal). Implementation amendment: the
  missing-parent-directory failure also got a typed code
  (`context_output_dir_missing`) — the spec pinned only "fails with a
  clear error" with no code, and a typed code serves JSON consumers
  better than the generic fallback; recorded here rather than left as
  silent drift.
- **Vocabulary**: 'working context' in user-facing strings; never
  'workspace' — enforced by manual review + the Done-Definition grep
  (the sweep bans only the compound and `workspace_*` tokens, not the
  bare word).

## Done Definition

- Both checkpoints green on the full suite and committed.
- `grep -r workspace src/` returns only the `.code-workspace` file
  format references and historical comments (verify; the sweep
  allowlist reflects reality).
- Roadmap 4.1 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to the Phase 5 remainder.
