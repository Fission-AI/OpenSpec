## Why

OPSX names **four** first-class actions — "create, implement, **update**, archive — do any of them anytime" ([docs/opsx.md:52](../../../docs/opsx.md)). Three ship as commands. **`update` does not exist.** The only mechanism offered is *"edit the files manually"* — and when you edit one artifact, nothing helps you keep the rest of the change coherent. Worse, the manual workaround lets the agent edit **code** when the user only wanted to revise the **plan** ([#1188](https://github.com/Fission-AI/OpenSpec/issues/1188)).

This is the most-requested missing capability in the tracker. It is one gap with several faces, and the fix is small: a thin `/opsx:update` skill that revises a change's planning artifacts and keeps them coherent with each other, built on the **existing** `openspec status` / `openspec list` commands. No new graph engine, no digests, no ledger — just an agent that reads the change's artifacts and updates what needs updating, with the user's confirmation.

## What Changes

The whole feature is a single new workflow skill, `/opsx:update`. The skill is deliberately change-scoped — `openspec-update-change`, following the `openspec-<verb>-change` naming of its siblings — and applies to change proposals only, not arbitrary artifact graphs (see design, Naming). Written by hand, its instruction set is short:

1. **Understand the request** — what the user wants to revise (or, with no specific ask, "review this change for coherence").
2. **Get the artifacts** — run `openspec status --change <id> --json`. Its `artifactPaths` map reports, per artifact, which files exist and where: `existingOutputPaths` is the concrete file list to edit — already expanded for glob artifacts like `specs/**/*.md`. (`openspec list --json` to pick the change when it isn't given.)
3. **Read and revise** — read the relevant artifacts, make the requested edit, then check the change's **other** artifacts against it and propose any follow-on edits needed to keep the plan coherent.
4. **Confirm and apply** — show each proposed revision, write only after the user confirms.
5. **Point to the next step** — report where the change now stands and recommend what comes next: artifacts still missing → `/opsx:continue`; plan revised after the change was already implemented → `/opsx:apply` to carry the delta into code; everything done and implemented → `/opsx:archive`. Guidance only — the skill never acts on it.

Two guardrails make it the command the cluster asked for:

- **Planning artifacts only, never code.** If a revised plan implies code changes, it hands off to `/opsx:apply` ([#1188](https://github.com/Fission-AI/OpenSpec/issues/1188)).
- **Schema-driven, not name-driven.** Artifact ids and paths come from `openspec status`, so the skill works for custom schemas, not just the default `proposal → specs → design → tasks` ([#777](https://github.com/Fission-AI/OpenSpec/issues/777), [#666](https://github.com/Fission-AI/OpenSpec/issues/666)).

**Coherence is bidirectional.** Earlier framing treated update as strictly "downstream" propagation. That is wrong: in `proposal → specs → design → tasks`, editing `design` can require revising `proposal` too. The skill reads the change's artifacts and reconciles them in whatever direction the edit demands, rather than assuming a fixed flow.

### Deliberately not built (yet)

Per the steer to introduce as little code as possible, and only when there is a defined need, this change does **not** add: a reverse-dependency graph API, content digests / staleness signals, a `.openspec.yaml` baseline ledger, an `openspec reconcile` write op, a drift report, or a `status --impact` selector. The agent reads the change's artifacts directly — a handful of markdown files — which is enough to judge coherence. If a future, concrete need emerges (e.g. unattended drift detection across many changes), exposing the schema's `requires` edges on `openspec status --json` is a one-field additive follow-up. It is out of scope here.

## Capabilities

### New Capabilities

- `opsx-update-skill`: A new `/opsx:update` workflow skill that revises a change's existing planning artifacts and keeps them coherent with one another. It reads the artifact set and paths from `openspec status`, reviews related artifacts in any direction (not only downstream), edits planning artifacts only and never code, and confirms each edit with the user. It ends with next-step guidance — recommending `/opsx:continue`, `/opsx:apply`, or `/opsx:archive` based on the change's state — without acting on it.

## Impact

- `src/core/templates/workflows/update-change.ts` (**new**) — the `openspec-update-change` skill template and the `/opsx:update` command template, mirroring the structure of `continue-change.ts`. Reads artifact ids and paths from `openspec status --json`; embeds no artifact-name patterns.
- Skill/command registration + [src/core/profiles.ts](../../../src/core/profiles.ts) — add `update` to `ALL_WORKFLOWS` **and to the default `core` profile** (`propose`, `explore`, `apply`, `sync`, `archive`), so `/opsx:update` is part of the default install rather than expanded-only (maintainer call on the PR).
- `docs/opsx.md` — add a `/opsx:update` row to the command table and a short "Updating a change" usage note.
- `openspec/changes/add-artifact-regeneration-support/` — the in-repo proposal-only stub for this gap is superseded; retire it or fold its notes into design.
- No changes to `src/core/artifact-graph/*`, `src/commands/workflow/status.ts`, or `ChangeMetadataSchema`. The skill uses `openspec status` / `openspec list` as they exist today.

## Issues addressed

Verified against `Fission-AI/OpenSpec` on 2026-06-30.

Closes (the missing-update-action family):

- [#1188](https://github.com/Fission-AI/OpenSpec/issues/1188) — "Add a command to update proposal, design and task" (and stop it editing code). Delivered as `/opsx:update`, planning-artifacts-only.
- [#705](https://github.com/Fission-AI/OpenSpec/issues/705) — "Rebuild downstream artifacts from a modified upstream." Delivered as the skill's read-and-reconcile pass over the change's artifacts.
- [#673](https://github.com/Fission-AI/OpenSpec/issues/673) — "clarify": update existing artifacts without auto-advancing the build frontier. `/opsx:update` revises in place and never creates the next artifact.
- [#247](https://github.com/Fission-AI/OpenSpec/issues/247) — "review and update all change proposals." Delivered as the within-a-change coherence review; cross-change audit is a separate, later proposal.

Answers (questions whose honest answer today is "no command exists"):

- [#694](https://github.com/Fission-AI/OpenSpec/issues/694), [#684](https://github.com/Fission-AI/OpenSpec/issues/684), [#618](https://github.com/Fission-AI/OpenSpec/issues/618) — "which command regenerates a document after the flow progressed / after apply?" → `/opsx:update`.
- Discussion [#1206](https://github.com/Fission-AI/OpenSpec/discussions/1206) — the official answer becomes `/opsx:update`.

Supersedes:

- `openspec/changes/add-artifact-regeneration-support` (in-repo, proposal-only stub) — same problem, replaced by this skill. Its hardcoded-filename dependency tracking and metadata-file staleness mechanism are dropped in favor of letting the agent read the artifacts.

Delineated from adjacent commands (distinct surfaces — coordinate, don't collide):

- [#702](https://github.com/Fission-AI/OpenSpec/pull/702) `/opsx:clarify` — resolves ambiguity *within one artifact* via Q&A; a complementary upstream step. `/opsx:update` then reconciles the change's artifacts with each other.
- [#1251](https://github.com/Fission-AI/OpenSpec/pull/1251) `/opsx:review`, [#880](https://github.com/Fission-AI/OpenSpec/issues/880) — review the *implementation (code)* against the plan. `/opsx:update` is the mirror image: it keeps the *plan* coherent and never touches code.
- [#783](https://github.com/Fission-AI/OpenSpec/issues/783) — cross-artifact quality review. The skill's coherence pass is the lightweight form of this; a deterministic `validate`-side check is a separate proposal.
