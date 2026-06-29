# Design: `/opsx:update` — graph-driven artifact update

## Context

OPSX models a change as a DAG of artifacts. Each schema declares artifacts with `requires` edges ([schemas/spec-driven/schema.yaml](../../../schemas/spec-driven/schema.yaml)); `ArtifactGraph` ([src/core/artifact-graph/graph.ts](../../../src/core/artifact-graph/graph.ts)) topologically sorts them and reports forward state (`getBuildOrder`, `getNextArtifacts`, `getBlocked`, `isComplete`). State is detected purely by filesystem existence ([src/core/artifact-graph/state.ts](../../../src/core/artifact-graph/state.ts)).

The graph is only ever traversed **forward** ("what can I build next?"). The update action requires the **backward** traversal ("I changed X — which downstream artifacts must be revisited?"). Notably, `getBuildOrder()` already constructs the reverse-edge `dependents` map (graph.ts:82-87) for Kahn's algorithm — computed and discarded — and `getUnlockedArtifacts()` already returns direct dependents for one node. This change exposes the transitive form and builds two thin, deterministic layers on top.

The orchestrating skills currently embed `proposal → specs → design → tasks` as hardcoded prose patterns that "override the schema instruction field" ([#777](https://github.com/Fission-AI/OpenSpec/issues/777)); `continue-change.ts` even contradicts its own guardrail ("Use the schema's artifact sequence, don't assume specific artifact names") — and the hardcoded block is duplicated across both templates in that file (the skill at lines 103-112 and the command variant at 225-234), so the de-hardcoding follow-up must fix both copies. The new skill must not repeat this — it reads ids and edges from CLI JSON.

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
- Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247) in full) — phase 2; see Decisions resolved.
- Regenerating *code* from updated artifacts — that is `/opsx:apply`'s job; `/opsx:update` stops at the plan and hands off.

## Decisions

### 1. Expose the reverse edges instead of re-deriving them
Add `getDependents(id)` (direct dependents) and `getDownstream(id)` (transitive closure of dependents, in topological order) to `ArtifactGraph`. This is not new logic so much as surfacing logic that already exists: `getBuildOrder()` builds the full reverse-adjacency `dependents` map (graph.ts:82-87) and discards it, and `getUnlockedArtifacts()` ([instruction-loader.ts:366](../../../src/core/artifact-graph/instruction-loader.ts)) already computes direct dependents (exposed as `unlocks`). Factor the reverse map into a shared helper; order `getDownstream` by the existing `getBuildOrder()`. Topological order guarantees a downstream walk revisits each artifact only after the upstreams it depends on — so a single pass converges (for spec-driven, editing `proposal` revisits `specs`, `design`, then `tasks`, never `tasks` before `specs`).

The result is **deterministic**: a pure function of `requires` edges and the change directory's files, identical on every run and platform, and therefore unit-testable (see tasks). That determinism is the reason it belongs in the CLI rather than the skill — and *not* computing it in the skill is precisely how we avoid the #777 hardcoding class.

Granularity is the **artifact** (the schema's unit), not the individual file. Editing one file under a glob artifact (e.g. one `specs/<cap>/spec.md` within the `specs` artifact) means the `specs` artifact changed, and its dependents (`tasks`) are downstream; sibling spec files are not "downstream" of each other. `getDownstream` terminates because the schema loader already rejects cyclic graphs (`artifact-graph`'s "Cyclic dependencies detected"), so the closure is finite by construction.

### 2. A grounded signal: content digests, not mtimes
The earlier draft detected staleness from filesystem mtimes. **Rejected.** mtime is not grounded in reality: `git checkout`/`clone`/`stash`, `touch`, editors, and formatters all rewrite mtime without changing content, and content can change while mtime is preserved (`git` does not restore historical mtimes). It is neither reproducible nor a true content signal — the opposite of what we want.

Instead, each artifact carries a **content digest**: SHA-256 over its output file(s), where each file contributes its **change-relative forward-slash path** plus its newline-normalized (CRLF→LF) content, and files are ordered by that relative path. Two cross-platform subtleties make this non-trivial and must be specified, not assumed:

- `resolveArtifactOutputs` returns **absolute, canonicalized** paths sorted with `.sort()` ([outputs.ts:34](../../../src/core/artifact-graph/outputs.ts)). Absolute-path order differs by OS (separators, drive letters, case-folding), so for a multi-file glob artifact (`specs/**/*.md`) a naive "concat in returned order" would hash to **different** values on Windows vs. POSIX. The digest helper therefore re-derives each file's path *relative to the change dir*, converts to forward slashes, and orders by that — independent of the OS.
- Including the relative path in the hash (not just content) means renaming or moving a file inside a glob artifact changes the digest, which is correct: the artifact's file set is part of its identity.

There is no content-hash utility in the repo today (verified: no `createHash`/`sha256` usage; only `crypto.randomUUID` in telemetry), so this is a small new helper in `outputs.ts`. The digest is exposed on read-only `openspec status --json`. It is deterministic, reproducible, and grounded in the actual bytes.

**Drift** is then defined deterministically: a downstream artifact *D* has drifted against upstream *U* iff `digest(U_now) ≠ digest(U_recorded_when_D_was_reconciled)`. The recorded baseline is a small per-change **digest ledger** (Decision 3). Until a baseline is recorded, drift is reported as **`unknown`**, never inferred — so the audit produces zero false positives, in contrast to the mtime heuristic which produced many.

[Risk] No baseline yet (e.g. pre-existing changes) → Mitigation: report `unknown`, fall back to the deterministic *structural* checks (missing/empty output — reusing [#1098](https://github.com/Fission-AI/OpenSpec/pull/1098)'s `artifactOutputComplete` rather than reinventing — and blocked/incomplete status) and the user-named targeted flow, which need no baseline.

### 3. The digest ledger (deterministic drift baseline) — in scope
To detect drift without the user naming what changed, record the baseline. Extend `ChangeMetadataSchema` (today just `schema`/`created`/`goal`/`affected_areas`/`initiative`) with an optional map: for each artifact, the digests of its **direct** upstream outputs at the moment it was last *reconciled* — where "reconciled" means the artifact was just (re)generated or explicitly confirmed up-to-date against those upstreams. If a direct upstream has no output when the baseline is recorded, it is stored as an explicit *absent* marker, so that later creating that upstream registers as drift rather than being silently missed.

Recording is a **dedicated, explicit write operation** (working name `openspec reconcile <change> --artifact <id>`), invoked by `/opsx:update` after each confirmed edit and available for the generating flows (`propose`/`continue`/`ff`) to call after they write an artifact — so the agent triggers a deterministic write and never computes hashes. It is deliberately **not** a flag on `openspec status`: `status` is read-only, and a read command that silently mutates a baseline is a footgun (every status call would move the reference the next drift check compares against). Keeping the read (`status`) and the write (`reconcile`) on separate verbs preserves that invariant. For changes that predate the ledger (no recorded baseline), drift is reported `unknown` and the audit falls back to the structural checks — honest, never a false positive.

Tracking **direct** (not transitive) upstreams is deliberate and makes drift compose correctly through the DAG: if `proposal` changes, `specs` drifts (its recorded `proposal` digest no longer matches); reconciling `specs` rewrites its content, which changes `specs`'s own digest, which in turn makes `tasks` drift. Transitive staleness therefore emerges one hop at a time as the user works downstream — no transitive bookkeeping required, and the order matches the revisit order from Decision 1.

**Why in scope (not deferred):** the ledger is what makes audit-mode drift *deterministic* rather than agent-guessed; deferring it would ship audit as "structural facts + ask," which is the weaker half. The cost is contained — one optional metadata field and one dedicated `reconcile` write path — and the generating-flow integration is optional (absent baseline degrades gracefully to `unknown`), so this does not block on touching `propose`/`continue`/`ff`.

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
`openspec update [path]` already regenerates AI tool/skill files ([src/cli/index.ts:202](../../../src/cli/index.ts)). Reusing it would overload one verb with two unrelated meanings. Decision: the artifact-update action is the **skill** `/opsx:update`; CLI support is read-only additions to `openspec status` (`--impact`, extra JSON fields) plus one small write verb `openspec reconcile` for the drift baseline (kept off `status` to preserve its read-only invariant — Decision 3). No new `openspec update*` verb; the only new verb is `reconcile`, named for what it does.

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

**Answering #783's form question (skill vs. extend `validate`).** Both, split by determinism: the checks that are pure functions of content and graph — drift (digests), structural completeness (#1098), capability coverage (#1277) — are CLI-shaped and are the natural content of a future schema-aware `openspec validate` coherence rule (aligns with [#829](https://github.com/Fission-AI/OpenSpec/issues/829)); the cross-artifact *semantic* review (scope contradictions, duplication with existing specs, missing abstractions) cannot be deterministic and is the skill's job. This change ships the `status` data + skill; surfacing the deterministic subset in `validate` for a CI gate is a scoped follow-up (Decisions resolved, item 6).

## Risks / Trade-offs

- **Digest stability across platforms** → newline-normalize before hashing (Decision 2); a cross-platform test pins identical digests on CRLF and LF inputs.
- **No baseline → no auto-drift** → the deterministic spine (impact set) and structural checks still work with zero baseline; drift is `unknown`, never a false positive.
- **Convergence** depends on a correct DAG. If `requires` edges are wrong (e.g. [#695](https://github.com/Fission-AI/OpenSpec/issues/695): `design` omits `specs`), propagation misses a real dependency. Trade-off: surface the consequence; the edge fix is #695's, not ours.
- **Scope creep into cross-change audit** ([#247](https://github.com/Fission-AI/OpenSpec/issues/247)) → explicitly phase 2; intra-change first.
- **Skill drift back to hardcoding** → covered by a test asserting the update template contains no literal `proposal`/`specs`/`design`/`tasks` artifact-name branching (it must read ids from JSON).

## Migration Plan

Backward-compatible and additive. New graph methods; new status JSON fields (`requires`/`dependents`/`digest`/`drift`); a new read-only `--impact` flag and a separate `reconcile` write command; one new optional field on `ChangeMetadataSchema` (absent on existing changes → drift `unknown`, no migration); one new skill template behind the expanded-workflow profile. No existing command changes its default human-readable behavior. The superseded stub (`add-artifact-regeneration-support`) is removed or folded in the same PR to avoid two competing proposals in the tree.

## Decisions resolved (for build-out)

These were open; each is now committed to the happy path so build-out has no dangling forks. Boundaries are deliberate scope lines, not deferrals of the core feature.

1. **Digest ledger: in scope.** Drift is deterministic via the recorded baseline (Decision 3), not agent-guessed. Pre-existing changes without a baseline degrade to `unknown` + structural checks.
2. **Targeted-mode entry point: baseline-aware.** When a recorded baseline exists, the skill defaults to the drifted set and asks the user to confirm/override; with no baseline it asks which artifact changed. It does not silently act on inference.
3. **Relationship to `/opsx:apply`: standalone.** `/opsx:update` is its own action; `apply` does not embed it. Where `apply` re-reads artifacts and detects upstream drift, it points the user to `/opsx:update` rather than updating planning artifacts itself (keeps apply's job = code, update's job = plan).
4. **Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247)): out of scope, named follow-up.** This change is intra-change. Cross-change ("config/guideline changed → re-audit every active change") reuses the same impact/digest primitives and is a clean follow-up proposal once those land — explicitly not blocked on, and not crammed in.
5. **Retire hardcoded patterns in `continue`/`ff` ([#777](https://github.com/Fission-AI/OpenSpec/issues/777)): fast-follow.** This change establishes the graph-driven pattern and proves it in the new skill (with the anti-hardcoding test); applying it to the existing `continue`/`ff` templates is a focused follow-up so this change does not also rewrite two unrelated templates.
6. **Deterministic coherence in `openspec validate` ([#783](https://github.com/Fission-AI/OpenSpec/issues/783) option B, [#829](https://github.com/Fission-AI/OpenSpec/issues/829)): coordinated follow-up.** The drift/completeness data lives in `status` for the skill now; promoting it to a CI-runnable `validate` rule is valuable but overlaps the #1277/#1098/#829 validate surfaces, so it lands once those settle rather than widening this change.
7. **Naming: `/opsx:update` (umbrella).** It is the missing first-class *action* and covers both propagate and audit; #783's `/opsx:refine` reads as audit mode and would, as a second command for one action, reintroduce the sprawl #1263 flags. If the team wants the word "refine," it aliases the same skill rather than splitting the action.
