# Tasks: `/opsx:update` — graph-driven artifact update

> Sequenced so each layer is independently testable: deterministic graph/digest primitives → drift baseline → CLI surface → skill → docs/verification. Cross-platform (`path.join`, newline-normalized digests) and Windows CI are called out where relevant, per `openspec/config.yaml`. The digest ledger (section 7) is in scope (design Decision 3); it degrades gracefully to `unknown` for changes without a recorded baseline.

## 1. Artifact graph: reverse traversal (deterministic)

- [ ] 1.1 Factor the reverse-adjacency `dependents` map (built and discarded inside `getBuildOrder()`, graph.ts:82-87; same relation `getUnlockedArtifacts` computes for one node) into a shared helper.
- [ ] 1.2 Add `getDependents(id)` — direct dependents; throw a descriptive error on unknown id.
- [ ] 1.3 Add `getDownstream(id)` — transitive dependents ordered by the existing `getBuildOrder()`, excluding `id`; throw on unknown id.
- [ ] 1.4 Unit tests: linear chain, diamond ordering, leaf (empty), unknown-id error, self-exclusion; assert results are identical across repeated calls (determinism).

## 2. Artifact graph: content digest (deterministic, grounded)

- [ ] 2.1 Add `artifactDigest(changeDir, generates)` in `outputs.ts`: read the files from `resolveArtifactOutputs` (already sorted deterministically), normalize newlines (CRLF→LF), SHA-256 over the concatenation; return undefined when no output exists. (New helper — no content-hash utility exists in the repo; only `crypto.randomUUID` in telemetry.) Lives alongside #1098's `artifactOutputComplete`/`artifactOutputContentValid`; coordinate so structural-completeness reuses #1098 rather than duplicating.
- [ ] 2.2 Unit tests: identical content → identical digest; changed content → changed digest; **CRLF vs LF inputs → identical digest** (cross-platform); glob multi-file determinism; missing output → undefined.

## 3. CLI: surface edges, digest, and impact on `status`

- [ ] 3.1 Extend `formatChangeStatus` (instruction-loader.ts, the `ArtifactStatus` objects ~397-426) to add `requires`, `dependents`, and `digest` per artifact; the existing build-order sort (line 429) already yields revisit order.
- [ ] 3.2 Add `impact?: string` to `StatusOptions` and the `--impact <artifact>` option (`src/commands/workflow/status.ts`, registered at `src/cli/index.ts:488`); when set, output the ordered downstream set with each artifact's resolved paths, digest, and existence/status (so consumers can tell which exist to revise vs. which would need creating); error on unknown artifact id.
- [ ] 3.3a Add per-artifact `drift` (`drifted`/`clean`/`unknown` + changed-upstream ids) to status JSON, comparing current upstream digests to the recorded baseline (section 7). Add `--record <artifact>` to write/refresh that baseline.
- [ ] 3.3 Keep default (non-`--json`, non-`--impact`) human-readable output byte-for-byte unchanged; add a regression test asserting this.
- [ ] 3.4 Tests: JSON edge fields, per-artifact digest present/stable, `--impact` ordering + determinism (repeat-run equality), `--impact` leaf (empty), `--impact` unknown-id error. Verify on Windows CI.

## 4. The `/opsx:update` skill (thin wrapper over the deterministic spine)

- [ ] 4.1 Create `src/core/templates/workflows/update-change.ts` with `getUpdateChangeSkillTemplate()` (skill) and `getOpsxUpdateCommandTemplate()` (command), mirroring `continue-change.ts` structure.
- [ ] 4.2 Instruction body: select change (infer/prompt via `openspec list --json`) → read `openspec status --change <id> --json` → branch into targeted vs audit mode → obtain the impact set/order from `--impact` (never compute it) → propose/confirm/apply/`--record`/re-check, reading ids/paths/edges/digests/drift from JSON only. Targeted entry is baseline-aware: with a baseline, default to the drifted set and confirm; without one, ask which artifact changed. Audit mode additionally performs the cross-artifact semantic review of #783 (scope contradictions, spec gaps, duplication) that the deterministic signals cannot detect.
- [ ] 4.3 Encode the guardrails explicitly: (a) planning artifacts only — never edit code, hand off to `/opsx:apply`; (b) graph-driven — no literal `proposal`/`specs`/`design`/`tasks` branching; ids and order come from the CLI; (c) audit without a baseline does not guess — it uses structural facts and asks; (d) revise only existing downstream artifacts — defer not-yet-created ones to `/opsx:continue`.
- [ ] 4.4 Encode the intent-change guard: recommend `/opsx:new` when the revision changes intent (reference the "Update vs. Start Fresh" heuristic).
- [ ] 4.5 Register the skill/command and add it to the expanded-workflow profile alongside `continue`/`ff`/`verify`.
- [ ] 4.6 Test: template generation snapshot; assert the template contains NO hardcoded artifact-name branching and NO self-computed ordering (it must read ids/order from JSON) — the anti-#777 guard.

## 5. Supersede the stub & docs

- [ ] 5.1 Remove (or fold) `openspec/changes/add-artifact-regeneration-support/` so the tree has a single, graph-driven update proposal; preserve its staleness idea (now via content digest) in this change's design.
- [ ] 5.2 Add a `/opsx:update` row to the command table in `docs/opsx.md`; add a short "Updating a change" usage section that uses targeted and audit modes.
- [ ] 5.3 Update any generated-skill manifests/fixtures that enumerate workflow skills so `openspec-update-change` is included.

## 6. End-to-end verification

- [ ] 6.1 E2E: create a spec-driven change, edit `proposal.md`, run `openspec status --impact proposal --json`, assert the downstream set is exactly `[specs, design, tasks]` in build order with correct paths/digests, and that code is never touched by the skill flow.
- [ ] 6.2 E2E with a custom (non-default ids) schema fixture: confirm propagation works with no skill changes.
- [ ] 6.3 Full validation: `openspec validate add-update-workflow --strict` passes; `openspec status --change add-update-workflow` shows all artifacts complete.
- [ ] 6.4 Run the suite on macOS, Linux, and Windows CI.

## 7. Deterministic drift baseline — the digest ledger

> In scope (design Decision 3). Powers unattended/audit drift; consumed by 3.3a's drift signal and 4.x's record-after-edit.

- [ ] 7.1 Extend `ChangeMetadataSchema` (`src/core/change-metadata/schema.ts`) with an optional per-artifact map of recorded **direct** upstream digests.
- [ ] 7.2 Record the baseline deterministically: on artifact (re)generation in `propose`/`continue`/`ff` and after each confirmed `/opsx:update` edit, write the current direct-upstream digests for the affected artifact ("reconciled").
- [ ] 7.3 CLI drift report: an artifact is drifted iff a current direct-upstream digest differs from its recorded baseline; no baseline → `unknown` (never a false positive). Verify transitive drift emerges hop-by-hop: changing `proposal` drifts `specs`; reconciling `specs` then drifts `tasks`.
- [ ] 7.4 Tests: record→no-drift; modify upstream→drift on exactly the direct dependents; hop-by-hop transitive drift; absent baseline→`unknown`; ledger round-trips through metadata read/write.
