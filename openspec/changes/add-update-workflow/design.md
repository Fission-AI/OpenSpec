# Design: `/opsx:update` — graph-driven artifact update

## Context

OPSX models a change as a DAG of artifacts. Each schema declares artifacts with `requires` edges ([schemas/spec-driven/schema.yaml](../../../schemas/spec-driven/schema.yaml)); `ArtifactGraph` ([src/core/artifact-graph/graph.ts](../../../src/core/artifact-graph/graph.ts)) topologically sorts them and reports forward state (`getBuildOrder`, `getNextArtifacts`, `getBlocked`, `isComplete`). State is detected purely by filesystem existence ([src/core/artifact-graph/state.ts](../../../src/core/artifact-graph/state.ts)).

The graph is only ever traversed **forward** ("what can I build next?"). The update action requires the **backward** traversal ("I changed X — what downstream is now stale?"). Notably, `getBuildOrder()` already constructs the reverse-edge `dependents` map (graph.ts:98) for Kahn's algorithm — it is computed and discarded. This change exposes it and builds two thin layers on top.

The orchestrating skills currently embed `proposal → specs → design → tasks` as hardcoded prose patterns that "override the schema instruction field" ([#777](https://github.com/Fission-AI/OpenSpec/issues/777)); `continue-change.ts:103-112` even contradicts its own guardrail ("Use the schema's artifact sequence, don't assume specific artifact names"). The new skill must not repeat this — it reads ids and edges from CLI JSON.

## Goals / Non-Goals

**Goals**
- A `/opsx:update` action that propagates an edit to one artifact across exactly its downstream dependents, and an audit mode that checks a whole change for incoherence.
- Drive everything from the schema's artifact graph — zero hardcoded artifact names — so custom schemas work.
- Edit planning artifacts only; never touch code. Confirm every edit with the user.
- Reuse the graph the engine already has; add the minimum surface (one reverse query + one staleness signal + status fields).

**Non-Goals**
- Automatic, unattended regeneration (the user always chooses — same stance as the superseded stub).
- A new top-level `openspec update*` CLI verb (name is taken; see Decision 4).
- Content-level completion validation of artifacts ([#1084](https://github.com/Fission-AI/OpenSpec/issues/1084)) — distinct change.
- Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247) in full) — phase 2; see Open Questions.
- Regenerating *code* from updated artifacts — that is `/opsx:apply`'s job; `/opsx:update` stops at the plan and hands off.

## Decisions

### 1. Expose the reverse edges instead of re-deriving them
Add `getDependents(id)` (direct dependents) and `getDownstream(id)` (transitive closure of dependents, in topological order) to `ArtifactGraph`. The direct map is already built inside `getBuildOrder()`; factor it into a memoized field so both forward and backward traversals share it. Topological order means a downstream walk revisits each artifact only after the upstreams it depends on have themselves been revisited — so a single pass converges (e.g. for spec-driven, editing `proposal` revisits `specs`, `design`, then `tasks`, never `tasks` before `specs`).

*Why not compute in the skill?* Because that is exactly the hardcoding #777 is about. The graph is the single source of truth for "how artifacts relate"; the skill must ask it.

### 2. Staleness from `requires`-edge mtimes — advisory, not authoritative
An artifact is *stale* if `mtime(artifact_output) < max(mtime(output) for each transitive upstream it requires)`. For glob outputs (`specs/**/*.md`) use the newest matching file's mtime. This needs no metadata file and no pattern matching — it walks the **explicit** `requires` edges and the **explicit** `generates` outputs, satisfying [openspec/config.yaml](../../config.yaml)'s "explicit list lookup, not pattern matching" and "if we generate it, we track it by name" rules.

Staleness is **advisory**: it is a cheap filter that points the audit at edges worth a semantic look. mtime is noisy (a `git checkout`, a `touch`, or formatting all perturb it), so the signal never *acts* on its own — the skill confirms semantically and always asks before editing. Design records the limitation; Open Questions tracks a git-aware refinement and the [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) timestamp option.

[Risk] mtime false positives/negatives → Mitigation: advisory-only; skill re-reads and reasons about content; audit lists candidates, never auto-edits.

### 3. The skill is a thin, graph-driven wrapper
`/opsx:update` mirrors `continue-change.ts`'s shape (select change → `openspec status --json` → act) but **only reads ids/paths/edges from JSON** — no embedded artifact-name patterns. Flow:

1. Resolve the change (infer from context or prompt via `openspec list --json`, like `/opsx:continue`).
2. `openspec status --change <id> --json` → artifacts with `requires`, `dependents`, `stale`, `staleAgainst`, resolved paths.
3. Pick mode:
   - **Targeted**: user names the artifact they changed / want to change (or the skill infers it). `openspec status --impact <artifact> --json` → ordered downstream set. For each downstream artifact: read it + its changed upstreams, assess coherence, propose a concrete diff, **ask**, apply, re-check.
   - **Audit**: no target → walk every `stale` edge; present the list; offer per-artifact fixes in revisit order.
4. Stop at the planning boundary. Never edit code. If `tasks`/specs change implies code rework, point to `/opsx:apply`.

**Intent-change guard.** If the user's revision changes the *intent* (not a refinement), apply the existing "Update vs. Start Fresh" heuristic ([docs/opsx.md:216-300](../../../docs/opsx.md)) and recommend `/opsx:new` rather than mutating the proposal into different work.

[Risk] Agent edits code while "updating the plan" (the [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188) complaint) → Mitigation: explicit, repeated guardrail "planning artifacts only; if implementation must change, hand to `/opsx:apply`"; the skill's write targets are constrained to `resolvedOutputPath`s from the graph.

### 4. Naming: `/opsx:update` skill, not `openspec update` CLI
`openspec update [path]` already regenerates AI tool/skill files ([src/cli/index.ts:202](../../../src/cli/index.ts)). Reusing it would overload one verb with two unrelated meanings. Decision: the artifact-update action is the **skill** `/opsx:update`; CLI support is **read-only additions to `openspec status`** (`--impact`, extra JSON fields). No new top-level verb.

Alternatives considered: (a) `openspec regen --from <artifact>` as #705 literally asks — rejected: a mutating CLI verb that rewrites artifacts duplicates the skill's job and bypasses user confirmation; the value is in the agent's semantic revision, not a CLI rewrite. (b) `openspec update artifacts …` subcommand — rejected: still collides conceptually and splits the action across two surfaces.

### 5. Build on `cli-artifact-workflow`, compose with #1277
The status-JSON additions live in the same loader (`instruction-loader.ts`) and command path (`src/commands/workflow/instructions.ts`) that [#1277](https://github.com/Fission-AI/OpenSpec/pull/1277) touches. Additions are purely additive fields, so they compose; if #1277 lands first, rebase the JSON shape onto its version of the status output.

## Risks / Trade-offs

- **mtime fragility** (Decision 2) → advisory-only; never auto-edits.
- **Convergence** depends on a correct DAG. If `requires` edges are wrong (e.g. [#695](https://github.com/Fission-AI/OpenSpec/issues/695): `design` omits `specs`), propagation misses a real dependency. Trade-off: surface the consequence; the edge fix is #695's, not ours.
- **Scope creep into cross-change audit** ([#247](https://github.com/Fission-AI/OpenSpec/issues/247)) → explicitly phase 2; intra-change first.
- **Skill drift back to hardcoding** → covered by a test asserting the update template contains no literal `proposal`/`specs`/`design`/`tasks` artifact-name branching (it must read ids from JSON).

## Migration Plan

Purely additive. New graph methods, new optional status fields/flag, one new skill template behind the expanded-workflow profile. No existing command changes behavior; no data migration. The superseded stub (`add-artifact-regeneration-support`) is removed or folded in the same PR to avoid two competing proposals in the tree.

## Open Questions

1. **Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247)).** When `openspec/config.yaml` or a project guideline changes, the user wants *every active change* re-audited. Phase 2: `openspec status --impact` generalizes, but "config changed → which changes are stale" needs a dependency from changes to project config. Worth a follow-up proposal.
2. **Staleness signal source.** mtime now; revisit if [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) lands lifecycle timestamps, or add an optional `--since <ref>` git-aware mode.
3. **Targeted-mode entry point.** Should the skill infer the changed artifact from git diff / mtime automatically, or always ask? Lean: offer the stale set as defaults, let the user confirm/override.
4. **Relationship to `/opsx:apply`'s mid-flight edits.** `apply` already re-reads artifacts each run; should `/opsx:update` be invocable *from within* an apply session, or strictly before it? Lean: standalone, with apply pointing to it when it detects upstream drift.
5. **Retire hardcoded patterns in `continue`/`ff` now or later?** ([#777](https://github.com/Fission-AI/OpenSpec/issues/777)) Doing it here widens scope; deferring risks the new skill being the only graph-driven one. Recommend a fast-follow change.
