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

The backward read is almost already built. `ArtifactGraph.getBuildOrder()` constructs the full reverse-adjacency `dependents` map while topologically sorting ([src/core/artifact-graph/graph.ts:82-87](../../../src/core/artifact-graph/graph.ts)) — then discards it at function exit. The *direct* dependents query even exists already under another name: `getUnlockedArtifacts()` ([instruction-loader.ts:366](../../../src/core/artifact-graph/instruction-loader.ts)) computes "who requires this artifact," and `openspec instructions <id> --json` already returns it as `unlocks`. What is missing is only (a) promoting that to a first-class, *transitive* graph query, and (b) ordering the result by the build order the engine already computes ([instruction-loader.ts:429](../../../src/core/artifact-graph/instruction-loader.ts)). Every other engine query — `getBuildOrder`, `getNextArtifacts`, `getBlocked`, `isComplete` — answers *"what do I build next?"* (forward). None answers *"I changed X — which downstream artifacts must be revisited, in what order?"* (backward). That backward set is **deterministic** — a pure function of the schema's `requires` edges and the files on disk — which is exactly why it belongs in the CLI, not in an agent's judgment.

There is a stub already in the repo — `openspec/changes/add-artifact-regeneration-support/proposal.md` (proposal-only, no specs or tasks) — which identifies staleness detection and regeneration but proposes tracking dependencies by hardcoded filename and metadata files. **This change supersedes that stub** with a graph-driven design and the user-facing `/opsx:update` command the cluster is actually asking for.

## What Changes

The design principle, borrowed from [#1277](https://github.com/Fission-AI/OpenSpec/pull/1277) and the steer to make this *deterministic and grounded in reality*: **the CLI decides which files to revisit and in what order (deterministic, reproducible); the agent only rewrites prose (the irreducibly semantic part).** Everything that can be a pure function of the schema graph and the bytes on disk is computed by the CLI and verified by tests, not left to agent judgment. Ordered by leverage:

1. **DETERMINISTIC SPINE — the impact set (`artifact-graph` + `cli-artifact-workflow`).** Given an artifact id, the CLI returns the exact transitive set of downstream artifacts to revisit, in build order, each with its resolved on-disk paths. This is a pure function of `requires` edges and the filesystem — same inputs, same output, on every platform — so it is testable and reproducible. It is built by promoting logic the engine already has (`getUnlockedArtifacts` for direct dependents, `getBuildOrder` for ordering, `resolveArtifactOutputs` for paths), and it is schema-agnostic: it reads ids and edges, never artifact names. This is the whole value of the primary flow — *the user (or the agent, confirmed) names what changed, and the CLI deterministically says exactly what else must be reviewed.*

2. **GROUNDED SIGNAL — content digests, not clock times (`artifact-graph` + `cli-artifact-workflow`).** The earlier draft proposed mtime-based staleness; that is **rejected** because mtime is not grounded in reality — a `git checkout`, `git clone`, `touch`, or formatter perturbs it, so it is neither reproducible nor a true signal of content change. Instead each artifact carries a **content digest**: a newline-normalized SHA-256 of its output bytes (normalized so the digest is identical on Windows and POSIX). Digests are exposed on `openspec status --json`. *Drift* — "this downstream no longer reflects the upstream it was generated from" — is then defined deterministically as *current upstream digest ≠ the digest recorded when the downstream was last reconciled*. The recorded baseline (a small per-change digest ledger) is a clearly-separable layer; until a baseline exists, drift is reported as **unknown**, never guessed (no false positives). See design for the ledger mechanism and why mtime/git were rejected.

3. **SURFACE — graph edges, digests, and impact in the CLI (`cli-artifact-workflow`).** `openspec status --json` gains, per artifact, `requires`, `dependents`, and `digest`; a focused `openspec status --change <id> --impact <artifact> --json` returns the downstream revisit set (ordered, with paths and digests). The skill consumes this structured data instead of re-deriving the graph from hardcoded names — closing the [#777](https://github.com/Fission-AI/OpenSpec/issues/777) class of bug for the new surface. Default human-readable output is unchanged.

4. **COMMAND — the `/opsx:update` skill (`opsx-update-skill`).** A thin wrapper over the deterministic spine, in two modes:
   - **Targeted** — "I changed (or want to change) artifact X." The skill asks the CLI for X's impact set, then for each downstream artifact *in the order the CLI returns* reads it against its now-changed upstreams, proposes a concrete revision, asks, applies, and re-checks. A single coherent pass over **exactly the files the graph says are related** — the user's "cohesive audit." The skill never computes the file list or the order itself.
   - **Audit** — "is this change still internally coherent?" The skill asks the CLI which artifacts have drifted (digest vs. recorded baseline) and offers per-artifact fixes; where no baseline exists it surfaces the deterministic structural facts (which declared capabilities lack specs, which outputs are empty/missing) and asks. The within-a-change form of [#247](https://github.com/Fission-AI/OpenSpec/issues/247).

   Two guardrails make it the command the cluster asked for: it **edits planning artifacts only, never code** (directly answering [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188)'s complaint), and it is **graph-driven, never name-driven** — ids and order come from the CLI, so it works for custom schemas, not just `spec-driven` ([#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666)). When the user's revision is an *intent* change rather than a refinement, it applies the existing "Update vs. Start Fresh" heuristic ([docs/opsx.md:216](../../../docs/opsx.md)) and points to `/opsx:new` instead of silently sprawling.

The naming boundary is deliberate: `openspec update` is already taken (it regenerates AI tool/skill files — [src/cli/index.ts:202](../../../src/cli/index.ts)). The artifact-update action is therefore the **skill** `/opsx:update` plus **read-only** additions to `openspec status`; this change adds **no** new top-level `openspec update*` CLI verb. (See design for the considered alternatives.)

## Capabilities

### New Capabilities

- `opsx-update-skill`: A new `/opsx:update` workflow skill that propagates a change to one artifact across its downstream dependents (targeted mode) or audits a whole change for drifted/incoherent artifacts (audit mode), driven entirely by the CLI-computed artifact graph (file list and order), editing planning artifacts only and never code, and confirming each edit with the user.

### Modified Capabilities

- `artifact-graph`: The graph exposes reverse-dependency queries (direct `dependents` and transitive, topologically-ordered `downstream`) and a deterministic, newline-normalized content `digest` per artifact — the primitives an update/audit traversal needs, all schema-agnostic and reproducible across platforms.
- `cli-artifact-workflow`: `openspec status --json` includes per-artifact dependency edges (`requires`, `dependents`) and a content `digest`; a new `--impact <artifact>` selector returns the downstream revisit set in build order (with paths and digests), so skills consume deterministic graph structure as data instead of hardcoding artifact names.

## Impact

- `src/core/artifact-graph/graph.ts` — expose `getDependents(id)` (promotes the reverse-adjacency loop at lines 82-87, and the existing `getUnlockedArtifacts` logic) and `getDownstream(id)` (transitive, ordered by the existing `getBuildOrder`); both throw on unknown id.
- `src/core/artifact-graph/outputs.ts` (new digest helper) — `artifactDigest(changeDir, generates)`: read `resolveArtifactOutputs` files, normalize newlines (CRLF→LF) for cross-platform stability, SHA-256 over the concatenation in the already-deterministic sorted path order; absent output → no digest. (No content-hash utility exists in the repo today; only `crypto.randomUUID` in telemetry.)
- `src/core/artifact-graph/instruction-loader.ts` (`formatChangeStatus`, ~397-453) — add `requires`, `dependents`, `digest` to each `ArtifactStatus`; the build-order sort at line 429 already gives revisit order.
- `src/commands/workflow/status.ts` (`StatusOptions`, `statusCommand`) + `src/cli/index.ts:488` — add the `--impact <artifact>` option returning the ordered downstream set (paths + digests); error on unknown artifact id; default human-readable output unchanged.
- (Optional, separable) `src/core/change-metadata/schema.ts` — extend `ChangeMetadataSchema` with an optional per-artifact upstream-digest ledger to make *drift* (not just structure) deterministic; see design. Today the schema holds only `schema`/`created`/`goal`/`affected_areas`/`initiative`.
- `src/core/templates/workflows/update-change.ts` (**new**) — the `openspec-update-change` skill template and the `/opsx:update` command template, mirroring the structure of `continue-change.ts` but reading graph edges from the CLI rather than embedding artifact-name patterns.
- Skill/command registration + profile wiring (the expanded-workflow profile that already lists `continue`, `ff`, `verify`, …) so `/opsx:update` installs alongside its siblings; docs/opsx.md command table gains a `/opsx:update` row.
- `openspec/changes/add-artifact-regeneration-support/` — superseded by this change (see below); retire or fold its staleness notes into design.
- Cross-platform tests (graph queries, newline-normalized digest stability across CRLF/LF, `path.join` paths, skill template generation) and Windows CI per [openspec/config.yaml](../../config.yaml).

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

- `openspec/changes/add-artifact-regeneration-support` (in-repo, proposal-only stub) — same problem, replaced by a graph-driven design and the user-facing command. Its change-detection intent is preserved but made deterministic (content digests, not the stub's mtime/metadata-file mechanism); its hardcoded-filename dependency tracking is dropped.

Related, addressed-in-part:

- [#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666) — hardcoded artifact patterns override the schema. The new skill is graph-driven by construction; retiring the same hardcoding in `continue-change.ts`/`ff-change.ts` is recommended as a fast follow (noted in design), not done here, to keep this change focused.
- [#1277](https://github.com/Fission-AI/OpenSpec/pull/1277) (prevent-silent-spec-drop) — same architectural principle (deterministic CLI, thin skills) and touches `artifact-graph`/`instruction-loader`; coordinate so the status-JSON additions compose.
- [#695](https://github.com/Fission-AI/OpenSpec/issues/695) — `design` requires only `proposal`, not `specs`. The downstream propagation is only as good as the `requires` edges; this change surfaces the consequence but the edge fix belongs to #695.

Related, out of scope (referenced, not closed):

- [#1084](https://github.com/Fission-AI/OpenSpec/issues/1084), [#906](https://github.com/Fission-AI/OpenSpec/issues/906) — completion state is existence-only, so an interrupted/partial artifact reads as "done." Audit mode can *surface* a suspiciously-stale or empty artifact, but content-level completion validation is a distinct change.
- [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) — first-class lifecycle timestamps. Orthogonal to the content-digest signal here (digests detect *content* drift; timestamps record *when*); complementary, tracked separately.
- [#339](https://github.com/Fission-AI/OpenSpec/issues/339) — proposal-time codebase exploration; orthogonal.
