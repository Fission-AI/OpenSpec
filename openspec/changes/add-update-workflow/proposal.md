## Why

OPSX names **four** first-class actions — "create, implement, **update**, archive — do any of them anytime" ([docs/opsx.md:52](../../../docs/opsx.md)). Three ship as commands. **`update` does not exist.** The only mechanism offered is *"edit the files manually"* — and when you edit one artifact, nothing tells you which others now contradict it.

It is the most-requested missing capability in the tracker, and it is one gap: *after artifacts exist, a user revises one, and no command propagates that revision to the artifacts depending on it.* The manual workarounds let the agent edit **code** when the user only wanted to revise the **plan**. Yet the fix is latent: every schema is an artifact DAG, but the graph is only read **forwards** ("what next?"); update needs the **backward** read ("I changed X — what's stale downstream?"). This change surfaces that one missing query and puts `/opsx:update` on top — graph-driven, so it asks what depends on what instead of hardcoding file names.

## Background: the request cluster

Verified against `Fission-AI/OpenSpec` on 2026-06-29. Six angles, one gap:

1. **No update command exists.** "I want a command that can modify the proposal, design and task and then I can check the design and apply." The same issue reports the exact failure mode of the manual workaround: *"the agent is not very clever sometimes, it modified the proposal and the code at the same time. So I must say that you only modify the proposal, design and task, not the code every time."* ([#1188](https://github.com/Fission-AI/OpenSpec/issues/1188))

2. **No way to rebuild downstream artifacts from a modified upstream.** "Once a proposal has been applied, there is **no built-in command to regenerate downstream artifacts** after modifying an upstream file… This breaks the promise of a declarative, spec-driven workflow." The issue asks for `openspec regen --from proposal`. ([#705](https://github.com/Fission-AI/OpenSpec/issues/705))

3. **Users don't know which command updates an artifact.** "If I need to update or change the content of a document, which opsx command should I use to regenerate it? Is it possible to regenerate a document even after the coding phase has started?" Today the honest answer is "none — edit by hand." ([#694](https://github.com/Fission-AI/OpenSpec/issues/694), [#684](https://github.com/Fission-AI/OpenSpec/issues/684), [#618](https://github.com/Fission-AI/OpenSpec/issues/618))

4. **`/opsx:continue` over-reaches when you only wanted to revise.** "I just ask AI to update the spec/proposal/design… but it sometimes generates another artifact. I'd be happier if it just did the updates I asked for and waited." ([#673](https://github.com/Fission-AI/OpenSpec/issues/673))

5. **The cohesive-audit need is explicit.** "Technical decisions in my project keep changing… I need to manually request my coding agent to review and update all features' specs, design, proposal and tasks to comply." The request is a command that "verifies and updates the necessary files." ([#247](https://github.com/Fission-AI/OpenSpec/issues/247))

6. **The would-be fix must not be hardcoded.** The existing in-repo stub proposes tracking dependencies by literal filename. But the orchestrating skills already encode `proposal → specs → design → tasks` as **hardcoded artifact patterns** that "override the schema instruction field," breaking custom schemas. Any update mechanism that re-hardcodes those names inherits the same bug. ([#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666))

### The root cause, concretely

`ArtifactGraph` already computes the reverse-edge `dependents` map internally while topologically sorting ([src/core/artifact-graph/graph.ts:98](../../../src/core/artifact-graph/graph.ts)) — then discards it. Every query the engine exposes — `getBuildOrder`, `getNextArtifacts`, `getBlocked`, `isComplete` — answers *"what should I build next?"* (forward). Nothing answers *"I changed X — what downstream of X is now stale?"* (backward). The update action is missing not because it is hard, but because **the one graph query it needs was never surfaced.** The graph already knows how artifacts relate; we just read it the other direction.

There is a stub already in the repo — `openspec/changes/add-artifact-regeneration-support/proposal.md` (proposal-only, no specs or tasks) — which identifies staleness detection and regeneration but proposes tracking dependencies by hardcoded filename and metadata files. **This change supersedes that stub** with a graph-driven design and the user-facing `/opsx:update` command the cluster is actually asking for.

## What Changes

A new **`update`** action, implemented as a thin skill over one new graph query — consistent with the architectural direction of [#1277](https://github.com/Fission-AI/OpenSpec/pull/1277) (deterministic logic in the CLI, skills as thin wrappers). Ordered by leverage:

1. **FOUNDATION — expose the reverse edges (`artifact-graph`).** Surface the `dependents` map the engine already builds, plus a transitive, topologically-ordered downstream query. Given any artifact id, the graph answers "what depends on this, directly and transitively, in the order they should be revisited." This is the single primitive the whole feature stands on, and it is schema-agnostic by construction — it reads `requires` edges, never artifact names.

2. **SIGNAL — staleness along graph edges (`artifact-graph`).** An artifact is *stale* when any upstream it `requires` (transitively) was modified more recently than it. Computed by comparing filesystem modification times along the **explicit `requires` edges** — no metadata file, no pattern matching (per [openspec/config.yaml](../../config.yaml): "specify by explicit list lookup, not pattern matching"). Staleness is **advisory** — a cheap signal that points the audit at likely-incoherent edges; semantic confirmation is the skill's job, and the skill always asks before changing anything.

3. **SURFACE — graph edges and impact in the CLI (`cli-artifact-workflow`).** `openspec status --json` gains per-artifact `requires`, `dependents`, and `stale`/`staleAgainst` fields, and a focused `openspec status --change <id> --impact <artifact> --json` returns the downstream set in revisit order. The skill consumes this structured data instead of re-deriving the graph from hardcoded names — closing the [#777](https://github.com/Fission-AI/OpenSpec/issues/777) class of bug for the new surface.

4. **COMMAND — the `/opsx:update` skill (`opsx-update-skill`).** The user-facing action, in two modes:
   - **Targeted** — "I changed (or want to change) artifact X." The skill reads the graph, walks X's downstream dependents in revisit order, and for each one reads it against its now-changed upstreams, proposes a concrete revision, asks, applies, and re-checks. A single coherent pass over **exactly the files the graph says are related** — the user's "cohesive audit."
   - **Audit** — "is this change still internally coherent?" The skill scans every stale edge the CLI reports, presents them, and offers per-artifact fixes. This is the within-a-change form of [#247](https://github.com/Fission-AI/OpenSpec/issues/247).

   Two guardrails make it the command the cluster asked for: it **edits planning artifacts only, never code** (directly answering [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188)'s complaint), and it is **graph-driven, never name-driven** — it uses schema artifact ids from the CLI, so it works for custom schemas, not just `spec-driven` ([#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666)). When the user's revision is an *intent* change rather than a refinement, it applies the existing "Update vs. Start Fresh" heuristic ([docs/opsx.md:216](../../../docs/opsx.md)) and points to `/opsx:new` instead of silently sprawling.

The naming boundary is deliberate: `openspec update` is already taken (it regenerates AI tool/skill files — [src/cli/index.ts:202](../../../src/cli/index.ts)). The artifact-update action is therefore the **skill** `/opsx:update` plus **read-only** additions to `openspec status`; this change adds **no** new top-level `openspec update*` CLI verb. (See design for the considered alternatives.)

## Capabilities

### New Capabilities

- `opsx-update-skill`: A new `/opsx:update` workflow skill that propagates a change to one artifact across its downstream dependents (targeted mode) or audits a whole change for incoherent/stale artifacts (audit mode), driven entirely by the schema's artifact graph, editing planning artifacts only and never code, and confirming each edit with the user.

### Modified Capabilities

- `artifact-graph`: The graph exposes reverse-dependency queries (direct `dependents` and transitive, topologically-ordered `downstream`) and a staleness signal computed along `requires` edges from filesystem modification times — the primitives an update/audit traversal needs, all schema-agnostic.
- `cli-artifact-workflow`: `openspec status --json` includes per-artifact dependency edges (`requires`, `dependents`) and a staleness signal (`stale`, `staleAgainst`); a new `--impact <artifact>` selector returns the downstream revisit set in order, so skills consume graph structure as data instead of hardcoding artifact names.

## Impact

- `src/core/artifact-graph/graph.ts` — expose `getDependents(id)` (direct, from the map already built at line 98) and `getDownstream(id)` (transitive, topologically ordered); both throw on unknown id.
- `src/core/artifact-graph/state.ts` + `outputs.ts` — staleness computation: resolve each artifact's output mtime (newest match for glob outputs) and compare against the newest mtime among its transitive `requires`; return `{ stale, staleAgainst[] }` per artifact. Missing/empty outputs are "not present," not "stale."
- `src/core/artifact-graph/instruction-loader.ts` + `src/commands/workflow/instructions.ts` (status path) — add `requires`, `dependents`, `stale`, `staleAgainst` to per-artifact status JSON; add the `--impact <artifact>` selector returning the ordered downstream set; human-readable output unchanged by default.
- `src/cli/index.ts` — register the `--impact <artifact>` option on `status`.
- `src/core/templates/workflows/update-change.ts` (**new**) — the `openspec-update-change` skill template and the `/opsx:update` command template, mirroring the structure of `continue-change.ts` but reading graph edges from the CLI rather than embedding artifact-name patterns.
- Skill/command registration + profile wiring (the expanded-workflow profile that already lists `continue`, `ff`, `verify`, …) so `/opsx:update` installs alongside its siblings; docs/opsx.md command table gains a `/opsx:update` row.
- `openspec/changes/add-artifact-regeneration-support/` — superseded by this change (see below); retire or fold its staleness notes into design.
- Cross-platform tests (graph queries, mtime staleness with `path.join`, skill template generation) and Windows CI per [openspec/config.yaml](../../config.yaml).

## Issues addressed

All references verified against `Fission-AI/OpenSpec` on 2026-06-29.

Closes (the missing-update-action family):

- [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188) — "Add a command to update proposal, design and task." Delivered as `/opsx:update`, artifacts-only (never touches code), which is the specific pain in the report.
- [#705](https://github.com/Fission-AI/OpenSpec/issues/705) — "Support Rebuilding Downstream Artifacts from Modified Intermediate Files." The requested `regen --from <artifact>` becomes graph-driven downstream propagation in targeted mode.
- [#673](https://github.com/Fission-AI/OpenSpec/issues/673) — the "clarify" request: update existing artifacts without auto-generating the next one. `/opsx:update` revises in place and never advances the build frontier.
- [#247](https://github.com/Fission-AI/OpenSpec/issues/247) — "utility to review and update all change proposals." Audit mode delivers the within-a-change form; cross-change audit is the scoped phase-2 extension (see design Open Questions).

Answers (workflow questions whose honest answer today is "no command exists"):

- [#694](https://github.com/Fission-AI/OpenSpec/issues/694), [#684](https://github.com/Fission-AI/OpenSpec/issues/684), [#618](https://github.com/Fission-AI/OpenSpec/issues/618) — "which command regenerates a document after the flow progressed / after apply?" → `/opsx:update`.

Supersedes:

- `openspec/changes/add-artifact-regeneration-support` (in-repo, proposal-only stub) — same problem, replaced by a graph-driven design and the user-facing command. Its staleness-detection idea is preserved (graph-edge mtimes); its hardcoded-filename/metadata-file mechanism is dropped.

Related, addressed-in-part:

- [#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666) — hardcoded artifact patterns override the schema. The new skill is graph-driven by construction; retiring the same hardcoding in `continue-change.ts`/`ff-change.ts` is recommended as a fast follow (noted in design), not done here, to keep this change focused.
- [#1277](https://github.com/Fission-AI/OpenSpec/pull/1277) (prevent-silent-spec-drop) — same architectural principle (deterministic CLI, thin skills) and touches `artifact-graph`/`instruction-loader`; coordinate so the status-JSON additions compose.
- [#695](https://github.com/Fission-AI/OpenSpec/issues/695) — `design` requires only `proposal`, not `specs`. The downstream propagation is only as good as the `requires` edges; this change surfaces the consequence but the edge fix belongs to #695.

Related, out of scope (referenced, not closed):

- [#1084](https://github.com/Fission-AI/OpenSpec/issues/1084), [#906](https://github.com/Fission-AI/OpenSpec/issues/906) — completion state is existence-only, so an interrupted/partial artifact reads as "done." Audit mode can *surface* a suspiciously-stale or empty artifact, but content-level completion validation is a distinct change.
- [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) — first-class lifecycle timestamps. Would give staleness a more robust signal than mtime; complementary, tracked separately.
- [#339](https://github.com/Fission-AI/OpenSpec/issues/339) — proposal-time codebase exploration; orthogonal.
