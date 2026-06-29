# Design: `/opsx:update` — graph-driven artifact update

## Context

OPSX models a change as a DAG of artifacts. Each schema declares artifacts with `requires` edges ([schemas/spec-driven/schema.yaml](../../../schemas/spec-driven/schema.yaml)); `ArtifactGraph` ([src/core/artifact-graph/graph.ts](../../../src/core/artifact-graph/graph.ts)) topologically sorts them and reports forward state (`getBuildOrder`, `getNextArtifacts`, `getBlocked`, `isComplete`). State is detected purely by filesystem existence ([src/core/artifact-graph/state.ts](../../../src/core/artifact-graph/state.ts)).

The graph is only ever traversed **forward** ("what can I build next?"). The update action requires the **backward** traversal ("I changed X — which downstream artifacts must be revisited?"). Notably, `getBuildOrder()` already constructs the reverse-edge `dependents` map (graph.ts:82-87) for Kahn's algorithm — computed and discarded — and `getUnlockedArtifacts()` already returns direct dependents for one node. This change exposes the transitive form and builds two thin, deterministic layers on top.

The orchestrating skills currently embed `proposal → specs → design → tasks` as hardcoded prose patterns that "override the schema instruction field" ([#777](https://github.com/Fission-AI/OpenSpec/issues/777)); `continue-change.ts:103-112` even contradicts its own guardrail ("Use the schema's artifact sequence, don't assume specific artifact names"). The new skill must not repeat this — it reads ids and edges from CLI JSON.

## Goals / Non-Goals

**Goals**
- A `/opsx:update` action that propagates an edit to one artifact across exactly its downstream dependents, and an audit mode that checks a whole change for incoherence.
- Drive everything from the schema's artifact graph — zero hardcoded artifact names — so custom schemas work.
- Edit planning artifacts only; never touch code. Confirm every edit with the user.
- Reuse the graph the engine already has; add the minimum surface (one reverse query + one content-digest signal + status fields). Keep correctness-critical logic deterministic and in the CLI; keep the agent's role to semantic rewriting only.

**Non-Goals**
- Automatic, unattended regeneration (the user always chooses — same stance as the superseded stub).
- A new top-level `openspec update*` CLI verb (name is taken; see Decision 4).
- Content-level completion validation of artifacts ([#1084](https://github.com/Fission-AI/OpenSpec/issues/1084)) — distinct change.
- Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247) in full) — phase 2; see Open Questions.
- Regenerating *code* from updated artifacts — that is `/opsx:apply`'s job; `/opsx:update` stops at the plan and hands off.

## Decisions

### 1. Expose the reverse edges instead of re-deriving them
Add `getDependents(id)` (direct dependents) and `getDownstream(id)` (transitive closure of dependents, in topological order) to `ArtifactGraph`. This is not new logic so much as surfacing logic that already exists: `getBuildOrder()` builds the full reverse-adjacency `dependents` map (graph.ts:82-87) and discards it, and `getUnlockedArtifacts()` ([instruction-loader.ts:366](../../../src/core/artifact-graph/instruction-loader.ts)) already computes direct dependents (exposed as `unlocks`). Factor the reverse map into a shared helper; order `getDownstream` by the existing `getBuildOrder()`. Topological order guarantees a downstream walk revisits each artifact only after the upstreams it depends on — so a single pass converges (for spec-driven, editing `proposal` revisits `specs`, `design`, then `tasks`, never `tasks` before `specs`).

The result is **deterministic**: a pure function of `requires` edges and the change directory's files, identical on every run and platform, and therefore unit-testable (see tasks). That determinism is the reason it belongs in the CLI rather than the skill — and *not* computing it in the skill is precisely how we avoid the #777 hardcoding class.

Granularity is the **artifact** (the schema's unit), not the individual file. Editing one file under a glob artifact (e.g. one `specs/<cap>/spec.md` within the `specs` artifact) means the `specs` artifact changed, and its dependents (`tasks`) are downstream; sibling spec files are not "downstream" of each other. `getDownstream` terminates because the schema loader already rejects cyclic graphs (`artifact-graph`'s "Cyclic dependencies detected"), so the closure is finite by construction.

### 2. A grounded signal: content digests, not mtimes
The earlier draft detected staleness from filesystem mtimes. **Rejected.** mtime is not grounded in reality: `git checkout`/`clone`/`stash`, `touch`, editors, and formatters all rewrite mtime without changing content, and content can change while mtime is preserved (`git` does not restore historical mtimes). It is neither reproducible nor a true content signal — the opposite of what we want.

Instead, each artifact carries a **content digest**: `sha256(normalizeNewlines(concat(sortedOutputFiles)))`. Newlines are normalized (CRLF→LF) so the digest is identical on Windows and POSIX ([openspec/config.yaml](../../config.yaml) cross-platform rules); files are concatenated in the deterministic sorted order `resolveArtifactOutputs` already returns. There is no content-hash utility in the repo today (only `crypto.randomUUID` in telemetry), so this is a small new helper in `outputs.ts`. The digest is exposed on `openspec status --json`. It is deterministic, reproducible, and grounded in the actual bytes.

**Drift** is then defined deterministically: a downstream artifact *D* has drifted against upstream *U* iff `digest(U_now) ≠ digest(U_recorded_when_D_was_reconciled)`. The recorded baseline is a small per-change **digest ledger** (Decision 3). Until a baseline is recorded, drift is reported as **`unknown`**, never inferred — so the audit produces zero false positives, in contrast to the mtime heuristic which produced many.

[Risk] No baseline yet (e.g. pre-existing changes) → Mitigation: report `unknown`, fall back to the deterministic *structural* checks (missing/empty output — reusing [#1098](https://github.com/Fission-AI/OpenSpec/pull/1098)'s `artifactOutputComplete` rather than reinventing — and blocked/incomplete status) and the user-named targeted flow, which need no baseline.

### 3. The digest ledger (deterministic drift baseline) — separable layer
To detect drift without the user naming what changed, record the baseline. Extend `ChangeMetadataSchema` (today just `schema`/`created`/`goal`/`affected_areas`/`initiative`) with an optional map: for each artifact, the digests of its **direct** upstream outputs at the moment it was last *reconciled* — where "reconciled" means the artifact was just (re)generated or explicitly confirmed up-to-date against those upstreams. Writing the ledger is itself a deterministic CLI operation (`openspec status` can record on read, or an explicit `--record`), invoked by the generating flows (`propose`/`continue`/`ff`) and by `/opsx:update` after each confirmed edit — so the agent triggers a deterministic write, it does not compute hashes.

Tracking **direct** (not transitive) upstreams is deliberate and makes drift compose correctly through the DAG: if `proposal` changes, `specs` drifts (its recorded `proposal` digest no longer matches); reconciling `specs` rewrites its content, which changes `specs`'s own digest, which in turn makes `tasks` drift. Transitive staleness therefore emerges one hop at a time as the user works downstream — no transitive bookkeeping required, and the order matches the revisit order from Decision 1.

This layer is **cleanly separable**: the deterministic spine (Decision 1) and the digest signal (Decision 2) deliver the primary targeted flow without it; the ledger only powers unattended audit. It is a candidate to land in a fast-follow if we prefer to keep this change's surface minimal (Open Questions).

*Alternatives rejected:* (a) mtime — see Decision 2. (b) Pure git diff — deterministic only for committed files, but planning artifacts are routinely uncommitted while being drafted, so it misses the common case. Digests work regardless of git state.

### 4. The determinism boundary (what the agent may and may not decide)
The CLI owns every decision that is a function of the graph and the bytes: **which** artifacts are downstream, **what order** to revisit them, **which** files each maps to, and **whether** content has drifted. The agent owns only the irreducibly semantic act: reading a downstream artifact against its changed upstream and **rewriting its prose** to restore coherence. The skill MUST obtain the file list and order from `openspec status --impact` — it may not enumerate or order artifacts itself. This is the same split #1277 applies to archive/validate, and it is what makes the feature "deterministic" rather than "an agent that usually gets it right."

### 5. The skill flow (thin wrapper over the deterministic spine)
`/opsx:update` mirrors `continue-change.ts`'s shape (select change → `openspec status --json` → act) but **only reads ids/paths/edges/digests from JSON** — no embedded artifact-name patterns. Flow:

1. Resolve the change (infer from context or prompt via `openspec list --json`, like `/opsx:continue`).
2. `openspec status --change <id> --json` → artifacts with `requires`, `dependents`, `digest`, resolved paths.
3. Pick mode:
   - **Targeted**: user names the artifact they changed / want to change (or the skill infers it and confirms). `openspec status --impact <artifact> --json` → ordered downstream set. For each *existing* downstream artifact *in the CLI-given order*: read it + its changed upstreams, propose a concrete diff, **ask**, apply, re-check. Downstream artifacts that do not exist yet are not invented here — the skill notes them and points to `/opsx:continue` (update revises; continue creates).
   - **Audit**: no target → ask the CLI which artifacts have drifted (digest vs. recorded baseline); where no baseline exists, present the deterministic structural facts already available from `status` — an artifact whose output is missing or empty, or one still `blocked`/incomplete — and ask. (When #1277's `validateChangeCapabilityCoverage` is present, declared-capability-without-spec joins this set.) Offer per-artifact fixes in revisit order.
4. Stop at the planning boundary. Never edit code. If a spec/tasks change implies code rework, point to `/opsx:apply`.

**Intent-change guard.** If the user's revision changes the *intent* (not a refinement), apply the existing "Update vs. Start Fresh" heuristic ([docs/opsx.md:216-300](../../../docs/opsx.md)) and recommend `/opsx:new` rather than mutating the proposal into different work.

[Risk] Agent edits code while "updating the plan" (the [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188) complaint) → Mitigation: explicit, repeated guardrail "planning artifacts only; if implementation must change, hand to `/opsx:apply`"; the skill's write targets are constrained to `resolvedOutputPath`s from the graph.

### 6. Naming: `/opsx:update` skill, not `openspec update` CLI
`openspec update [path]` already regenerates AI tool/skill files ([src/cli/index.ts:202](../../../src/cli/index.ts)). Reusing it would overload one verb with two unrelated meanings. Decision: the artifact-update action is the **skill** `/opsx:update`; CLI support is **read-only additions to `openspec status`** (`--impact`, extra JSON fields). No new top-level verb.

Alternatives considered: (a) `openspec regen --from <artifact>` as #705 literally asks — rejected: a mutating CLI verb that rewrites artifacts duplicates the skill's job and bypasses user confirmation; the value is in the agent's semantic revision, not a CLI rewrite. (b) `openspec update artifacts …` subcommand — rejected: still collides conceptually and splits the action across two surfaces.

### 7. Compose with #1277 and #1098
The status-JSON additions live in `formatChangeStatus` ([instruction-loader.ts](../../../src/core/artifact-graph/instruction-loader.ts)) and the `status` command ([src/commands/workflow/status.ts](../../../src/commands/workflow/status.ts)); [#1277](https://github.com/Fission-AI/OpenSpec/pull/1277) touches the same status path and adds deterministic capability-coverage helpers (`extractDeclaredCapabilities`, `validateChangeCapabilityCoverage`), and [#1098](https://github.com/Fission-AI/OpenSpec/pull/1098) adds `artifactOutputComplete`/`artifactOutputContentValid` in `outputs.ts` — the exact file the digest helper (Decision 2) lives in. None are in this branch's base (main), so audit's structural checks should *reuse* them as they land rather than reimplement; the JSON additions here are purely additive fields and compose cleanly.

### 8. The command family: one action, distinct surfaces
The tracker has accumulated several adjacent requests; good design means one coherent action, not five overlapping commands ([#1263](https://github.com/Fission-AI/OpenSpec/issues/1263) and #783 both flag skill-count growth). The boundaries:

| Command | Scope | Reads | Writes |
|---|---|---|---|
| `/opsx:clarify` ([#702](https://github.com/Fission-AI/OpenSpec/pull/702)) | *within* one artifact (ambiguity Q&A) | one artifact | that artifact |
| **`/opsx:update`** (this) | *across* a change's planning artifacts (propagate + audit) | the artifact graph | planning artifacts |
| `/opsx:review` ([#1251](https://github.com/Fission-AI/OpenSpec/pull/1251)), [#1073](https://github.com/Fission-AI/OpenSpec/issues/1073) | plan *vs. code* | artifacts + code | nothing (read-only) |
| `/opsx:verify` | archive readiness | artifacts + code | nothing |

`/opsx:update` deliberately **subsumes** the update/regen/refine cluster (#1188/#705/#673/#783/#1206) into its two modes instead of spawning `/opsx:regen`, `/opsx:rebuild`, and `/opsx:refine` separately. It composes with clarify (a within-artifact step that often precedes an update) and review (a code-side check that follows apply); it never overlaps their read/write surfaces.

**Answering #783's form question (skill vs. extend `validate`).** Both, split by determinism: the checks that are pure functions of content and graph — drift (digests), structural completeness (#1098), capability coverage (#1277) — are CLI-shaped and are the natural content of a future schema-aware `openspec validate` coherence rule (aligns with [#829](https://github.com/Fission-AI/OpenSpec/issues/829)); the cross-artifact *semantic* review (scope contradictions, duplication with existing specs, missing abstractions) cannot be deterministic and is the skill's job. This change ships the `status` data + skill; surfacing the deterministic subset in `validate` for a CI gate is a scoped follow-up (Open Questions).

## Risks / Trade-offs

- **Digest stability across platforms** → newline-normalize before hashing (Decision 2); a cross-platform test pins identical digests on CRLF and LF inputs.
- **No baseline → no auto-drift** → the deterministic spine (impact set) and structural checks still work with zero baseline; drift is `unknown`, never a false positive.
- **Convergence** depends on a correct DAG. If `requires` edges are wrong (e.g. [#695](https://github.com/Fission-AI/OpenSpec/issues/695): `design` omits `specs`), propagation misses a real dependency. Trade-off: surface the consequence; the edge fix is #695's, not ours.
- **Scope creep into cross-change audit** ([#247](https://github.com/Fission-AI/OpenSpec/issues/247)) → explicitly phase 2; intra-change first.
- **Skill drift back to hardcoding** → covered by a test asserting the update template contains no literal `proposal`/`specs`/`design`/`tasks` artifact-name branching (it must read ids from JSON).

## Migration Plan

Purely additive. New graph methods, new optional status fields/flag, one new skill template behind the expanded-workflow profile. No existing command changes behavior; no data migration. The superseded stub (`add-artifact-regeneration-support`) is removed or folded in the same PR to avoid two competing proposals in the tree.

## Open Questions

1. **Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247)).** When `openspec/config.yaml` or a project guideline changes, the user wants *every active change* re-audited. Phase 2: `openspec status --impact` generalizes, but "config changed → which changes are stale" needs a dependency from changes to project config. Worth a follow-up proposal.
2. **Land the digest ledger now, or fast-follow?** The deterministic spine + targeted flow ship without it; the ledger (Decision 3) only powers unattended audit and adds a `ChangeMetadataSchema` field plus a record step in the generating flows. Recommend deciding scope before build-out — minimal change (spine only) vs. full (spine + ledger).
3. **Targeted-mode entry point.** Should the skill infer the changed artifact from `git diff` (deterministic for committed files) and confirm, or always ask? Lean: when a baseline exists, default to the drifted set; otherwise ask.
4. **Relationship to `/opsx:apply`'s mid-flight edits.** `apply` already re-reads artifacts each run; should `/opsx:update` be invocable *from within* an apply session, or strictly before it? Lean: standalone, with apply pointing to it when it detects upstream drift.
5. **Retire hardcoded patterns in `continue`/`ff` now or later?** ([#777](https://github.com/Fission-AI/OpenSpec/issues/777)) Doing it here widens scope; deferring risks the new skill being the only graph-driven one. Recommend a fast-follow change.
6. **Surface the deterministic coherence checks in `openspec validate` too?** ([#783](https://github.com/Fission-AI/OpenSpec/issues/783) option B, [#829](https://github.com/Fission-AI/OpenSpec/issues/829)) A schema-aware `validate` drift/completeness rule would give a CI gate independent of the agent. Natural fit, but it overlaps #1277/#1098/#829 surfaces — recommend landing as a coordinated follow-up rather than widening this change.
7. **Naming.** [#783](https://github.com/Fission-AI/OpenSpec/issues/783) suggests `/opsx:refine` for the cross-artifact review. We keep `/opsx:update` as the umbrella (it is the missing first-class *action*, and covers both propagate and audit); "refine" reads as audit mode. If the team prefers `refine` for the audit half, it can alias the same skill — but two commands for one action reintroduces the sprawl #1263 flags.
