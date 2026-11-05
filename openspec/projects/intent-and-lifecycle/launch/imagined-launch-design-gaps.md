# Design review: what the imagined launch requires

**Companion to:** [Build on the decisions you've already made](./imagined-launch-blog.md)\
**Status:** Design analysis, not shipped behavior\
**Reviewed:** November 4, 2026; aligned with the actions/triggers decision November 5, 2026

This review asks what would make the broader product launch possible. Its contract and verification questions remain open. They don't block the [lifecycle pilot](../lifecycle/lifecycle-checkpoints.md), which adds checks and optional reviews around an existing generation workflow.

## The product bet

The article makes a specific promise: **an agent can start from already-established context, shape the right-sized change, and verify the work against the contracts that apply, whether or not those contracts live in the local repo.**

That is stronger than adding links to a proposal. It requires a supported *implement-existing-contract* path alongside OpenSpec's current *change-a-contract* path. The imagined launch is coherent only if both paths work.

## Launch scope translated into product behavior

The article now describes **one imagined first release**, using existing OpenSpec command names rather than introducing a new `source` command or plugin runtime. Its claims are a target experience, **not current shipped behavior**.

| What a reader expects | Existing surface | New behavior required |
| --- | --- | --- |
| “Point OpenSpec at existing plans.” | `/opsx:explore` and `/opsx:propose` can already read code and documents through agent tools | Consistent source reading and decision-making about what is relevant, established, missing, or out of scope |
| “Review what my change owns.” | Propose already clarifies material ambiguity | A concise, reviewable change-shaping assessment before creating artifacts; accepted decisions persist in existing files |
| “Implement a shared contract without duplicating it.” | The default schema, delta specs, and `skip_specs` | A supported implement-existing-contract lifecycle distinct from ‘no spec-level behavior changes’ |
| “Verify shared and local guarantees.” | Expanded `/opsx:verify` checks local delta specs and design | Resolve applicable external expectations, verify against evidence, and report unreadable or unverified claims |
| “Check what changed.” | `/opsx:update` edits existing change artifacts with confirmation | An on-demand, source-aware review of linked information and its possible impact |
| “Configure my team's preferences.” | `openspec/config.yaml` already supports `context` and per-artifact `rules` | Documentation/examples for conventions; the core behavior must work without custom rules |

**Later, separate from this launch:** Projects as a shared context workspace; proactive observer and relationship discovery; first-class extension packaging; exact historical source comparisons across providers; organization-level coverage reporting.

The key release test is that **someone can complete the proposed iOS workflow using only the established OpenSpec command surfaces, plus the new behavior**, without copying the shared contract into a second authoritative spec.

## Must resolve before this article could ship

### 1. An implement-only lifecycle that does not masquerade as `skip_specs`

**Exposed by:** The iOS change implements shared checkout behavior but creates no new local spec delta.

**Current conflict:** In the default `spec-driven` schema, a behavior-changing change normally generates `specs/**/*.md`; `skip_specs: true` means no spec-level behavior changes. `propose`, artifact status, apply dependencies, `verify`, and archive are built around that convention.

**Need to decide/build:** Represent *implementing an existing contract* as valid work with applicable behavioral expectations, not as missing requirements or as a refactor. Update artifact generation/completion, validation, `apply`, verification, and archive semantics together. Keep delta specs for additions or modifications to contracts maintained locally. Decide how one change can do both.

**Recommended contract:** A change can have zero **local deltas** and still have nonzero **applicable contracts**. Archive preserves the history and links, but merges only genuine deltas.

### 2. A repeatable judgment about what is already specified

**Exposed by:** Shared checkout requirements fully define price confirmation, but say nothing about iOS resuming after backgrounding.

**Current gap:** The skills inspect context and generate artifacts, but lack a consistent method for deciding what to reuse, what to derive locally, and what remains an open question. The imagined blog also shows a brief pre-artifact judgment; existing `propose` can clarify questions, but it does not yet guarantee that visible decision summary. A fixed role selection or mandatory extra document would add ceremony.

**Need to decide/build:** Add a small, reusable **change-shaping** judgment inside existing planning flows: identify the source's relevant claims, select the local slice, identify missing decisions and component-specific guarantees, and explain the result briefly for review. Make it apply to product, infrastructure, and platform work. Define how the accepted scope and contract links persist in normal artifacts even after the original conversation is gone.

**Recommended contract:** The agent proposes the boundary and explains its reasoning; the developer can correct it. Do not auto-create local requirements merely to fill the schema.

### 3. Verification against shared contracts, not just local delta specs

**Exposed by:** An iOS checkout change has tests and a demonstration but no local delta spec.

**Current conflict:** The existing `openspec-verify-change` skill checks requirements and scenarios primarily from delta-spec artifacts. When specs are skipped or absent, spec checks can become not applicable. That would make the imagined change look under-specified precisely where customers want proof.

**Need to decide/build:** Make the agent retrieve the **applicable expectations accepted for this change** from source links, local maintained specs, and local deltas. Report evidence per claim and clearly mark inaccessible, ambiguous, outdated, or unverified expectations. Define what happens if the source changes after planning before verification begins.

**Recommended contract:** “Applicable contracts” and “contracts modified by this change” are separate sets. Verification targets the former; spec sync targets the latter. Tests and demos provide bounded evidence, not a global guarantee.

### 4. Stable, useful handoff through review and archive

**Exposed by:** A colleague opens an archived change months later; the original context was in another repo, and `proposal.md` included a relative Markdown link.

**Current risk:** Archiving moves `openspec/changes/<name>/` under `openspec/changes/archive/<date>-<name>/`. A relative link valid in the active folder may break after the move. The source may also have changed, disappeared, or require credentials.

**Need to decide/build:** Choose a link convention that remains usable when the change is archived (stable URL, archive-aware rewriting, or another reliable scheme). Preserve which source was actually used and why, and be explicit about what was accessible. Decide the minimum historical baseline, if any, that v1 captures; Git revisions are a candidate, while non-Git sources may not support reliable reconstruction.

**Recommended contract:** In v1, preserve meaningful links and a concise scope explanation; never claim an exact historical diff without recoverable evidence. Treat broken or inaccessible sources as an explicit limitation. Test both a repo-relative path from a user prompt and a stable URL inside the generated proposal, including after archive.

## Important, but not necessarily first-release blockers

### 5. Source access, readiness, and trust

**Exposed by:** An upstream product directory marks a specification provisional, while a Notion page exposes no comparable approval status; an MCP tool can read one but not the other.

**Need to decide/build:** Keep provider access with the user's authorized agent tools; distinguish “linked” from “read.” Use provider-specific readiness data when available. Warn without imposing a universal approval process. Treat retrieved documents as data, not instructions that can override the user's request or OpenSpec's workflow.

**Recommended contract:** Report what the source establishes, what is uncertain, and whether the agent could access it. Never infer approval merely because a document exists.

### 6. Upstream feedback and what “refresh” can promise

**Exposed by:** Implementation exposes an error in the shared pricing contract; the engineer wants the product or architecture team to review it.

**Need to decide/build:** Specify a human-controlled way to suggest an upstream correction, optionally as a PR when the source is Git and the agent has permission. Keep this separate from rewriting change artifacts. An on-demand review can identify plausible inconsistencies; detecting *all* drift or automatically discovering unlinked work belongs to a future observer.

**Recommended contract:** The first release supports a manual, reviewable reconciliation workflow and honest uncertainty, surfaced through existing update/conversation flows rather than an invented command. No silent two-way synchronization. Define which source reads are repeated and how the agent distinguishes a current-source assessment from an exact version diff.

### 7. Extension boundary and teams with different starting points

**Exposed by:** A product engineer starts with an idea, a mobile engineer with an approved spec, and a platform engineer with an ADR and benchmark. An enterprise team needs retrieval and status checks for its upstream product requirements.

**Need to decide/build:** Test that one general change-shaping method adapts to all three jobs using OpenSpec's existing schemas, rules, and skills. Use MCP or existing agent tools for provider data; package provider-specific instructions separately only when repeated integrations demonstrate a need. A plugin runtime is not required to validate this UX.

**Recommended contract:** The core decides what should be reused or specified; optional extensions teach the agent how to read particular systems and interpret their conventions. Existing `context` and `rules` configuration is guidance for the agent, not an authentication, source-resolution, or approval mechanism.

## Deliberately later

**OpenSpec Projects:** A shared context-and-work workspace may eventually unify files, designs, changes, and sessions. The article must not imply that it is required now. Its relationship to existing Stores and Worksets is still undecided.

**Observer:** A possible paid service can watch project activity and discover new relationships. It is not simply a scheduler for the on-demand check and is not part of this imagined initial release.

**Cross-repo delivery status:** Approving a shared contract, verifying the iOS implementation, merging the backend, and delivering the complete checkout feature are distinct events. Coverage and rollout dashboards require additional evidence and coordination models.

## Recommended next prototype

Before implementing a general plugin architecture or persistent graph, run **one checkout contract through two repos** and **one infrastructure ADR through one repo**, using real agent tools. Test four transitions: planning from existing context; choosing reuse versus local delta; verification without local deltas; and archiving while preserving useful source links.

If we cannot make those transitions work without duplicating contracts or weakening verification, the imagined launch promise is not yet ready. That's the result the blog-writing exercise was meant to expose.

## Verification references

- [OpenSpec default workflow schema](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml): proposal, delta specs, design, tasks; `skip_specs` intent.

- [Propose skill](https://github.com/Fission-AI/OpenSpec/blob/main/skills/openspec-propose/SKILL.md): existing source inspection, artifact generation, dependency traversal.

- [Verify skill](https://github.com/Fission-AI/OpenSpec/blob/main/skills/openspec-verify-change/SKILL.md): requirements/scenario checks derived from local spec artifacts.

- [Archive skill](https://github.com/Fission-AI/OpenSpec/blob/main/skills/openspec-archive-change/SKILL.md): delta sync and archive move.

- [Stores guide](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md): read-only references to registered stores, separate from arbitrary document links.

- [Requirements engineering terminology](https://www.iso.org/obp/ui/#iso:std:iso-iec-ieee:29148:ed-2:v1:en): requirements can be allocated across system levels and traced to lower-level implementations.

- [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md): conventions for knowledge provenance and Markdown links, not an OpenSpec implementation lifecycle.
