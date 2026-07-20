# Design: `/opsx:update` — a thin update skill

## Context

OPSX models a change as a small DAG of planning artifacts. Each schema declares artifacts with `requires` edges ([schemas/spec-driven/schema.yaml](../../../schemas/spec-driven/schema.yaml)); `ArtifactGraph` ([src/core/artifact-graph/graph.ts](../../../src/core/artifact-graph/graph.ts)) topologically sorts them, and `openspec status --change <id> --json` already reports, per artifact: its `status` (`done`/`ready`/`blocked`), its `outputPath`, and — via the top-level `artifactPaths` map — its `resolvedOutputPath` and `existingOutputPaths`, plus the change's `schemaName` and `isComplete`. The two path fields differ in a way that matters for a write operation: `existingOutputPaths` is the concrete files that exist on disk (for a glob artifact such as `specs/**/*.md`, the glob already expanded to real files); `resolvedOutputPath` is the change-dir-joined declared path, which for a glob artifact is still the glob (`.../specs/**/*.md`) and is therefore **not** a write target. `/opsx:update` edits the files in `existingOutputPaths`. `openspec list --json` lists changes by recency.

That is everything an update skill needs. The artifacts are a handful of markdown files on disk; the agent can read them. So `/opsx:update` is built as a thin skill over the **existing** CLI, in the same shape as `continue-change.ts` (select change → `openspec status --json` → act).

This proposal began larger — a reverse-dependency graph API, content digests, a baseline ledger, a `reconcile` write op, a `status --impact` selector. Review feedback ([PR #1278](https://github.com/Fission-AI/OpenSpec/pull/1278)) was that this over-builds: coding agents tend to over-complicate skills, and the feature should work off the existing `status` command with as little new code as possible. This design follows that steer.

## Goals / Non-Goals

**Goals**
- A `/opsx:update` action that revises a change's existing planning artifacts and keeps them coherent with one another.
- Drive it from the artifact set and paths the CLI already reports — zero hardcoded artifact names — so custom schemas work.
- Edit planning artifacts only; never touch code. Confirm every edit with the user.
- Add as little code as possible: one skill template, no changes to the graph engine, the `status` command, or the metadata schema.

**Non-Goals**
- A new top-level `openspec update*` CLI verb (name is taken; see Naming).
- Automatic, unattended regeneration (the user always confirms).
- Content digests, a drift/staleness signal, a baseline ledger, a `reconcile` op, or a `status --impact` selector (see "Why not the heavier machinery").
- Regenerating *code* from updated artifacts — that is `/opsx:apply`'s job; `/opsx:update` stops at the plan and hands off.
- Cross-change audit ([#247](https://github.com/Fission-AI/OpenSpec/issues/247) in full) — a later proposal; this change is intra-change.
- Updating anything other than a change's planning artifacts. v1 is specific to change proposals; generalizing "update" to other graph types is deferred until such a graph exists (see Naming).

## The skill, written by hand

Working backwards from "what is the minimal instruction set," here is the skill body in sketch form. It is short on purpose — few tokens, few commands:

```
Revise a change's planning artifacts and keep them coherent. Never edit code.

1. Resolve the change.
   - If named, use it. Else infer from context; if unclear, run `openspec list --json`
     and ask the user to choose (most-recently-modified first). Never auto-select.

2. Get the artifacts.
   - Run `openspec status --change "<id>" --json`.
   - Read `artifacts[]` (ids + status) and the `artifactPaths` map. These come from the
     active schema — do not assume the artifact ids or paths.
   - The files to edit are `artifactPaths.<id>.existingOutputPaths` (already glob-expanded
     for artifacts like `specs/**/*.md`). Do not write to `resolvedOutputPath`: for a glob
     artifact it is still the glob pattern, not a real file.

3. Understand the request.
   - If the user named a change ("the design now uses X"), that is the starting edit.
   - If they only said "update" / "make this coherent," treat it as a coherence review.

4. Read and reconcile.
   - Read the artifact(s) the request touches and the other existing artifacts in the change.
   - Apply the requested edit. Then check every other existing artifact against it — in any
     direction (an edit to design may require revising the proposal, not only the tasks) —
     and note what is now inconsistent, missing, or contradictory.
   - Do not invent artifacts that don't exist yet; point the user to `/opsx:continue` to create them.

5. Confirm and apply, one artifact at a time.
   - Show each proposed revision and why. Write only after the user confirms.
   - When a substantial rewrite is needed, `openspec instructions <artifact> --change "<id>" --json`
     gives that artifact's rules/template to follow.

6. Point to the next step (guidance only — never act on it).
   - Artifacts still missing → suggest `/opsx:continue`. Change already implemented (tasks
     checked off / applied) → the code may no longer match the revised plan; suggest
     `/opsx:apply` to carry the delta. Fully done and implemented → suggest `/opsx:archive`.

Guardrails:
- Planning artifacts only. If the plan now implies code changes, stop and point to `/opsx:apply`.
- Use artifact ids/paths from `openspec status`; never branch on literal proposal/specs/design/tasks names.
- If the request changes the change's *intent* rather than refining it, recommend `/opsx:new`
  (the "Update vs. Start Fresh" heuristic, docs/opsx.md).
```

The `spec-driven` artifact names may appear once, as a worked *example* of how to apply step 4, exactly as `continue-change.ts` does today — but the control flow reads ids from the CLI, so the skill never branches on those names. A template test asserts there is no name-based branching (the anti-[#777](https://github.com/Fission-AI/OpenSpec/issues/777) guard).

## Decisions

### 1. Bidirectional coherence, not downstream propagation
The artifact graph has a build *order*, but "what needs updating after an edit" is not strictly downstream. If `design` changes, the `proposal` it elaborates may need to change too; if `tasks` reveal a missing capability, the `specs` may need a new requirement. The skill therefore reads the change's artifacts and reconciles them in whatever direction the edit demands. Build order is still useful as a default *reading* order and for presenting fixes, but it is not a constraint on which artifacts may be revised. This is why the design does not add a one-directional `getDownstream` / `--impact` primitive: it would encode the wrong model.

### 2. Lean on the existing `status` command
`openspec status --change <id> --json` already returns the artifact set, per-artifact status, and, in the `artifactPaths` map, the on-disk paths. The skill writes to `artifactPaths.<id>.existingOutputPaths` — the concrete files, glob-expanded — and deliberately not to `resolvedOutputPath`, which for a glob artifact is the pattern itself and not a file. That is everything the skill needs to know what exists and where it lives; no new CLI field is required. Picking the change reuses `openspec list --json`, exactly like `/opsx:continue`. No new CLI surface is introduced.

### 3. Why not the heavier machinery (digests, ledger, reconcile, impact)
The first draft proposed SHA-256 content digests, a per-change baseline ledger in `.openspec.yaml`, an `openspec reconcile` write op, a derived drift signal, and a `status --impact` selector — so the CLI could tell the agent *which* artifacts are stale without the agent reading them.

Rejected for v1, because the cost outweighs the need:
- The artifacts are a few markdown files. An agent that is going to *rewrite* them must read them anyway, so computing staleness for it saves little and adds a stateful subsystem (a ledger that `status` must not mutate, a separate write verb, scheme-versioning for forward-compat, cross-platform digest canonicalization, and the round-trip tests for all of it).
- A digest/ledger only earns its keep when something must judge staleness *without* reading content — e.g. unattended drift detection across many changes ([#247](https://github.com/Fission-AI/OpenSpec/issues/247) cross-change, [#846](https://github.com/Fission-AI/OpenSpec/issues/846) tracking files). Those are out of scope here. When one of them becomes concrete, this machinery can be designed against that real need.

So `/opsx:update` v1 has the agent read the change's artifacts and judge coherence directly. If, after using it, a deterministic signal proves necessary, the smallest first step is to expose the schema's `requires` edges on `status --json` (a single additive field, no new command) — and only then consider digests.

### 4. Naming: `/opsx:update` skill, not `openspec update` CLI
`openspec update [path]` already regenerates AI tool/skill files ([src/cli/index.ts](../../../src/cli/index.ts)). Overloading it would give one verb two unrelated meanings. The artifact-update action is therefore the **skill** `/opsx:update`, with no new `openspec` verb at all. Considered and rejected: `openspec regen --from <artifact>` ([#705](https://github.com/Fission-AI/OpenSpec/issues/705)) — a mutating CLI verb that rewrites artifacts duplicates the skill's job and bypasses user confirmation; the value is in the agent's semantic revision, not a CLI rewrite.

Review feedback flagged that "update" alone is generic — could it apply to any graph? The resolution: the skill is scoped to **change proposals only**, and the specific name carries that scope. The skill is `openspec-update-change`, following the `openspec-<verb>-change` naming of its siblings (`openspec-continue-change`, `openspec-new-change`, …). The command is `/opsx:update` because every verb in the `/opsx:` family operates on a change (`continue`, `apply`, `archive` — none says `-change`); a change-scoped meaning is what the namespace already promises. If a future graph type needs its own update action, it gets its own specific skill name then — nothing here blocks or breaks that.

### 5. Guardrails (the part that makes it the requested command)
- **Planning artifacts only.** The skill's write targets are the artifact paths from `status`; if a revision implies code changes it stops and points to `/opsx:apply`. This directly answers [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188)'s complaint that the manual workaround edits code.
- **Schema-driven.** Ids and paths come from `status`; no branching on literal `proposal`/`specs`/`design`/`tasks`. Works for custom schemas ([#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666)).
- **Confirm each edit.** One artifact at a time, shown before writing.
- **Intent guard.** A revision that changes intent rather than refining it is redirected to `/opsx:new` (the "Update vs. Start Fresh" heuristic, [docs/opsx.md](../../../docs/opsx.md)).

### 6. Next-step guidance, especially for already-implemented changes
A change can be revised after it was built — tasks checked off, `/opsx:apply` already run. The update itself behaves identically (planning artifacts only), but stopping silently would strand the user: the code and the revised plan now disagree. So the skill ends by reporting where the change stands (from the status JSON and the tasks checklist) and recommending the next command — `/opsx:continue` if artifacts are missing, `/opsx:apply` to carry a revised plan into code, `/opsx:archive` when everything is done. Guidance only: the skill never implements, mirroring the "All artifacts created! You can now implement this change with `/opsx:apply`" hand-off that `continue-change.ts` already uses.

## Risks / Trade-offs

- **No deterministic staleness signal.** With no digest/ledger, the skill relies on the agent reading the artifacts to spot incoherence. Trade-off accepted: an agent that rewrites prose must read it anyway, and a content-blind signal earns its cost only for use cases this change excludes (Decision 3).
- **Coherence quality depends on the agent.** Mitigated by confirming every edit and by keeping scope to one change's artifacts (a small, readable set).
- **Skill drifts back to hardcoding artifact names.** Mitigated by a template test asserting the control flow reads ids from `status` JSON and contains no name-based branching.

## Migration Plan

Additive and backward-compatible. One new skill template, installed with the default `core` profile (maintainer call on the PR: update is part of the default happy path, not expanded-only); one docs row. No existing command changes behavior; no schema or graph changes. The superseded stub (`add-artifact-regeneration-support`) is removed or folded in the same PR to avoid two competing proposals in the tree.
