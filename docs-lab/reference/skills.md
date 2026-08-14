# Skills

> Every OpenSpec skill: arguments, what it creates, and what it responds with.

<!-- Drafted 2026-08-11 via one subagent per entry, each verifying every claim against
its workflow template in src/core/templates/workflows/; assembled and uniformity-passed
by the main session. Terminology: "change proposal", never bare "change" (user call,
2026-08-11). Shape (user-reviewed): intro bullets define Core/Optional, then ONE index
table (Skill / Job / Type) and a flat run of H2 entries matching
cli.md's shape - no group sections. Recipe per entry: one-line job sentence, then a
two-column key-value table (header row "Contract | Description", uniform across
entries) holding the pure input/output contract,
one row per fact: Arguments (what you pass; each cell self-contains its
optional/ambiguous behavior) / Creates (exact paths written; always states the code
boundary) / Response (what the agent reports back and where it stops). No judgment
rows: no when-to-use beyond the job sentence, no Not-for routing, no guide links
(guides link here, not the reverse). The ff job says "create a change proposal"
because its template unconditionally scaffolds a new one (redirects if the name
exists), contradicting the old "remaining artifacts" framing. Paths shown are the
default single-repo layout, stated without a caveat: reference pages state defaults,
and the store-moves-the-planning-home fact is multi-repo/stores.md's to teach (the
per-tool command spelling story likewise stays with setup.md and supported-tools.md;
user cut the NOTE carrying both, 2026-08-11). H2 entries double as the site's
right-rail TOC and the anchors guides deep-link. No frontmatter in source: sync-docs.mjs lifts H1 to title and the > line to
description (README pins the > line verbatim in its page index). Deliberately
excluded, each with an owner elsewhere: per-tool command spellings and syntax
(reference/supported-tools.md), example transcripts (quickstart and guides), tips and
when-to-use judgment (guides own it), troubleshooting (help/troubleshooting.md),
legacy /openspec:* commands (help/legacy/migration.md). Source: old docs/commands.md
maps here per sources.md; its unsupported claims (apply "runs tests", bulk-archive
name arguments, fixed tasks.md filename) were checked against templates and dropped.
Skill names from WORKFLOW_TO_SKILL_DIR (src/core/profile-sync-drift.ts) and the
templates in src/core/templates/workflows/; core set src/core/profiles.ts:14. "Optional"
is the docs' set label (was "Expanded"; renamed 2026-08-12: the product's only stored
profile values are core and custom, so "expanded" reads as a third profile). -->

The skills come in two sets:

- **Core**: installed by default, the main planning loop.
- **Optional**: installed only when you add them, via [Profiles](../customize/profiles.md).

| Skill | Job | Type |
|---|---|---|
| [openspec-explore](#openspec-explore) | Think through an idea before it becomes a change proposal | Core |
| [openspec-propose](#openspec-propose) | Create a change proposal with all its planning artifacts in one step | Core |
| [openspec-apply-change](#openspec-apply-change) | Implement a change proposal's tasks | Core |
| [openspec-update-change](#openspec-update-change) | Revise a change proposal's plan | Core |
| [openspec-sync-specs](#openspec-sync-specs) | Merge a change proposal's spec updates into `specs/` | Core |
| [openspec-archive-change](#openspec-archive-change) | Move a finished change proposal to the archive | Core |
| [openspec-new-change](#openspec-new-change) | Start a change proposal as an empty scaffold | Optional |
| [openspec-continue-change](#openspec-continue-change) | Create the next planning artifact, one at a time | Optional |
| [openspec-ff-change](#openspec-ff-change) | Create a change proposal with every artifact implementation needs, in one pass | Optional |
| [openspec-verify-change](#openspec-verify-change) | Check the implementation matches the plan | Optional |
| [openspec-bulk-archive-change](#openspec-bulk-archive-change) | Archive several change proposals at once | Optional |
| [openspec-onboard](#openspec-onboard) | Learn the workflow by doing one real change proposal end to end | Optional |

## openspec-explore

Think through an idea before it becomes a change proposal.

| Contract | Description |
|---|---|
| **Arguments** | A topic: an idea, a problem, a comparison, or the name of an existing change proposal to explore in context. With nothing given it just enters explore mode. |
| **Creates** | Nothing by default; it reads and investigates only. On request it captures insights: a new change proposal under `openspec/changes/<name>/`, or updates to an existing one's proposal, design, specs, or tasks. Never code. |
| **Response** | An open conversation with no required output. When thinking crystallizes it summarizes the problem, approach, open questions, and next steps, and offers to capture them; you decide. Implementation never starts here. |

## openspec-propose

Create a change proposal and generate all its planning artifacts in one step.

| Contract | Description |
|---|---|
| **Arguments** | A kebab-case name (`add-dark-mode`) or a plain description. Asks if you give neither. |
| **Creates** | `openspec/changes/<name>/` with every artifact the schema defines, in dependency order (spec-driven: proposal, spec deltas, design, tasks). Never code. |
| **Response** | The created artifacts, ready for review, and the next step. Stops there; implementation waits for `openspec-apply-change`. |

## openspec-apply-change

Implement a change proposal's tasks, working through the list until done or blocked.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name (`add-auth`), optional. If the target is ambiguous it lists the active change proposals and asks you to pick. |
| **Creates** | Code: the minimal changes each task calls for, in your project files. In the change proposal it touches only the tasks file, checking off each finished task (`- [ ]` to `- [x]`). |
| **Response** | Progress per task, then an overall count (N/M tasks complete). All done: suggests `openspec-archive-change`. Blocked by missing artifacts: points to `openspec-continue-change`. Unclear tasks or errors: pauses and asks. |

## openspec-update-change

Revise a change proposal's existing planning artifacts and keep them coherent with each
other.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional, plus the revision you want. With no revision stated it runs a coherence review: artifacts checked against each other for contradictions, gaps, and duplication. |
| **Creates** | Nothing new. Edits only artifact files that already exist; missing artifacts are `openspec-continue-change`'s job. Never code. |
| **Response** | Shows each proposed revision and writes it only after you confirm, one artifact at a time. Ends with what was revised and the next step; implementation waits for `openspec-apply-change`. |

## openspec-sync-specs

Merge a change proposal's spec updates into `specs/` without archiving it.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. You can also name a subset of its delta specs; only those sync. |
| **Creates** | Edits or creates `openspec/specs/<capability-path>/spec.md` for each delta spec, merging added, modified, removed, and renamed requirements into the main spec. Never code. |
| **Response** | A per-capability summary of requirements added, modified, removed, or renamed, after the updated specs validate. The change proposal stays active; archiving waits for `openspec-archive-change`. |

## openspec-archive-change

Move a finished change proposal to the archive.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. |
| **Creates** | Moves the change proposal folder to `openspec/changes/archive/YYYY-MM-DD-<name>/` (no date added if the name already starts with one). With your approval it first syncs outstanding delta specs via `openspec-sync-specs`. Never code. |
| **Response** | Warns and asks before archiving with incomplete artifacts or tasks, and asks whether to sync when delta specs exist. Ends with a summary: name, schema, archive location, spec sync status, and any warnings. |

## openspec-new-change

Start a change proposal as an empty scaffold.

| Contract | Description |
|---|---|
| **Arguments** | A kebab-case name (`add-user-auth`) or a plain description, plus a schema name only for a non-default workflow. Asks what you want to build if you give neither. |
| **Creates** | `openspec/changes/<name>/` as an empty scaffold: no artifacts yet, never code. |
| **Response** | The scaffold's name and location, the workflow's artifact sequence, status (0/N complete), and the first artifact's template. Drafting artifacts waits for `openspec-continue-change`. |

## openspec-continue-change

Create the next planning artifact in a change proposal, one at a time.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. If still ambiguous it asks you to pick from the most recently modified. |
| **Creates** | The single next ready artifact in the schema's sequence, written into the change proposal folder. One artifact per run, never code. |
| **Response** | The created artifact, progress (N of M complete), and which artifacts that unlocked. When planning is complete it says so; implementation moves to `openspec-apply-change`. |

## openspec-ff-change

Create a change proposal and every planning artifact implementation needs, in one pass.

| Contract | Description |
|---|---|
| **Arguments** | A kebab-case name or a plain description. Asks if you give neither; if the named change proposal already exists it suggests continuing it instead. |
| **Creates** | `openspec/changes/<name>/` and every planning artifact implementation requires, in dependency order (spec-driven: proposal, specs, design, tasks), leaving out only artifacts marked skipped or conditional. Never code. |
| **Response** | The change proposal's name and location, each artifact created, and any conditional artifact skipped and why. Stops there; implementation waits for `openspec-apply-change`. |

## openspec-verify-change

Check that the implementation matches the change proposal's artifacts.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. When ambiguous it asks, listing change proposals that have a tasks artifact. |
| **Creates** | Nothing. It reads the change proposal's artifacts and the codebase; verification is report-only. |
| **Response** | A report: a scorecard for Completeness, Correctness, and Coherence, then CRITICAL, WARNING, and SUGGESTION issues with recommendations, and a final archive-readiness assessment. It changes nothing and does not archive. |

## openspec-bulk-archive-change

Archive several change proposals at once.

| Contract | Description |
|---|---|
| **Arguments** | None. It lists the active change proposals and asks you to select any number, with an option for all; if none are active it says so and stops. |
| **Creates** | `openspec/changes/archive/YYYY-MM-DD-<name>/` per archived change proposal (already-dated names keep their prefix). Each one's spec deltas sync first via `openspec-sync-specs`. Never code. |
| **Response** | A status table per change proposal and one confirmation for the whole batch, then a summary of archived, skipped, and failed, plus spec sync results. When two change proposals touch the same spec it checks the codebase and syncs implemented deltas oldest first. |

## openspec-onboard

Learn the workflow by doing one real change proposal end to end.

| Contract | Description |
|---|---|
| **Arguments** | None. It scans your codebase for small starter tasks and asks you to pick one or describe your own. |
| **Creates** | A real change proposal for the chosen task, one artifact at a time, then real code once you confirm implementation. Archives the change proposal at the end. |
| **Response** | A narrated walkthrough of the full cycle with pauses for your input: explore, create, build each artifact, implement, archive. Ends with a recap and a pointer to `openspec-propose`. Takes about 15 to 20 minutes. |
