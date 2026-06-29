# Tasks: `/opsx:update` — graph-driven artifact update

> Sequenced so each layer is independently testable: graph primitives → CLI surface → skill → docs/cleanup. Cross-platform (`path.join`, mtime) and Windows CI are called out where paths are involved, per `openspec/config.yaml`.

## 1. Artifact graph: reverse traversal

- [ ] 1.1 Factor the reverse-edge `dependents` map (currently built and discarded inside `getBuildOrder()`, `graph.ts:98`) into a memoized field shared by forward and backward queries.
- [ ] 1.2 Add `getDependents(id)` — direct dependents; throw a descriptive error on unknown id.
- [ ] 1.3 Add `getDownstream(id)` — transitive dependents in topological order, excluding `id`; throw on unknown id.
- [ ] 1.4 Unit tests: linear chain, diamond, leaf (empty), unknown-id error, self-exclusion (mirror existing `artifact-graph` spec scenarios).

## 2. Artifact graph: staleness signal

- [ ] 2.1 In `outputs.ts`, add a helper to resolve an artifact's output modification time (newest matching file for glob outputs; absent when no output exists). Use `path.join`; no hardcoded separators.
- [ ] 2.2 In `state.ts`, add staleness computation: an artifact is stale when its output mtime is older than the newest output mtime among its transitive `requires`; return `{ stale, staleAgainst[] }` per artifact. Missing output → not present (not stale); root artifact → never stale.
- [ ] 2.3 Unit tests including a Windows path case: upstream-newer, downstream-newer, glob newest-file, missing output, root artifact.

## 3. CLI: surface edges, staleness, and impact on `status`

- [ ] 3.1 Extend the status JSON builder (`instruction-loader.ts` + `src/commands/workflow/instructions.ts` status path) to add `requires`, `dependents`, `stale`, `staleAgainst` to each artifact.
- [ ] 3.2 Add the `--impact <artifact>` option to `status` (`src/cli/index.ts`); when set, return the ordered downstream set with each artifact's resolved output path; error on unknown artifact id.
- [ ] 3.3 Keep default (non-`--json`, non-`--impact`) human-readable output byte-for-byte unchanged; add a regression test asserting this.
- [ ] 3.4 Tests: JSON edge fields, stale/staleAgainst, `--impact` ordering, `--impact` leaf (empty), `--impact` unknown-id error. Verify on Windows CI.

## 4. The `/opsx:update` skill

- [ ] 4.1 Create `src/core/templates/workflows/update-change.ts` with `getUpdateChangeSkillTemplate()` (skill) and `getOpsxUpdateCommandTemplate()` (command), mirroring `continue-change.ts` structure.
- [ ] 4.2 Instruction body: select change (infer/prompt via `openspec list --json`) → read `openspec status --change <id> --json` → branch into targeted vs audit mode → walk downstream via `--impact` → propose/confirm/apply/re-check, reading ids/paths/edges from JSON only.
- [ ] 4.3 Encode the two guardrails explicitly: (a) planning artifacts only — never edit code, hand off to `/opsx:apply`; (b) graph-driven — no literal `proposal`/`specs`/`design`/`tasks` branching; use schema ids from the CLI.
- [ ] 4.4 Encode the intent-change guard: recommend `/opsx:new` when the revision changes intent (reference the "Update vs. Start Fresh" heuristic).
- [ ] 4.5 Register the skill/command and add it to the expanded-workflow profile alongside `continue`/`ff`/`verify`.
- [ ] 4.6 Test: template generation snapshot; assert the template contains NO hardcoded artifact-name branching (it must read ids from JSON) — the anti-#777 guard.

## 5. Supersede the stub & docs

- [ ] 5.1 Remove (or fold) `openspec/changes/add-artifact-regeneration-support/` so the tree has a single, graph-driven update proposal; preserve its staleness idea in this change's design.
- [ ] 5.2 Add a `/opsx:update` row to the command table in `docs/opsx.md`; add a short "Updating a change" usage section that uses targeted and audit modes.
- [ ] 5.3 Update any generated-skill manifests/fixtures that enumerate workflow skills so `openspec-update-change` is included.

## 6. End-to-end verification

- [ ] 6.1 E2E: create a spec-driven change, edit `proposal.md`, run the impact/audit surface, confirm `specs`/`design`/`tasks` are reported stale in revisit order and code is never touched.
- [ ] 6.2 E2E with a custom (non-default ids) schema fixture: confirm propagation works with no skill changes.
- [ ] 6.3 Full validation: `openspec validate add-update-workflow --strict` passes; `openspec status --change add-update-workflow` shows all artifacts complete.
- [ ] 6.4 Run the suite on macOS, Linux, and Windows CI.
