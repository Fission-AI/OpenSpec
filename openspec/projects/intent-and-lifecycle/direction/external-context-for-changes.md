# Working PRD: Use Existing Context in Changes

**Status:** Context-workflow proposal · Release scope subject to prototype\
**Updated:** November 5, 2026\
**Direction:** [Intent to Implementation](./intent-to-implementation.md)

> **Separate exploration:** The current [lifecycle pilot](roadmap.md) adds checks and reviews around an existing generation workflow. This document explores broader improvements to using context; they aren't required for that pilot.

## 1. The product promise

**Start an OpenSpec change from information your team already has. Choose the work you're taking on, keep links explaining what informed it, and revisit that context as the work evolves.**

A developer can already ask an agent to read a file. The improvement we need is **a repeatable handoff that survives the first prompt**: a useful scoped change, understandable provenance for its important decisions, and a way to revisit that information later.

This context workflow is an increment toward the broader product direction of connecting **information, changes, and evidence**. It should work without adopting a new knowledge format or setting up OpenSpec Projects.

## 2. Who it's for, and when it helps

**Primary user:** A developer starting or continuing an OpenSpec change from information produced elsewhere, especially when the work spans teams or repositories.

Useful situations include a mobile team implementing part of a shared checkout specification, a backend team following an architecture decision, or an infrastructure engineer working against resilience targets and benchmarks. The context may be ordinary Markdown, files in another Git checkout, a Figma design, a Linear issue, a Notion page, or a registered OpenSpec Store.

### Problem

- **Restating context:** Developers repeat requirements, decisions, and background that already exist.

- **Losing scope:** A large document describes an entire initiative while an individual change addresses only part of it.

- **Losing the why:** A reviewer sees the plan but cannot tell what information shaped it.

- **Reconstructing history:** When information evolves, developers must rediscover what is relevant to their existing work.

Customer evidence supports good first drafts, consistent planning across developers, preserved original motivation, non-blocking readiness warnings, and human-reviewed updates. It does **not** justify importing the full source-tool workflow into OpenSpec.

## 3. How it fits the existing model

The external information remains where the team maintains it. The **change** owns its selected scope and implementation plan. The agent records ordinary links and short explanations of what those sources contributed.

Under the current default schema:

| Existing artifact | Responsibility |
| --- | --- |
| `proposal.md` | Why this change exists, what it covers, and which external context shaped the scope. |
| `specs/**/spec.md` | Behavior **deltas** to OpenSpec's maintained specs when the change proposes changes to those behavior contracts. |
| `design.md` | Technical approach and decisions for this particular work, referring to shared designs rather than copying them wholesale. |
| `tasks.md` | Implementation and verification work for the selected change. |

Custom schemas may name or organize artifacts differently. The source-link convention should follow the chosen schema rather than assume `proposal.md` always exists.

**Important boundary:** A change can conceptually *implement* an already-defined external contract, *modify* a contract, or both. Today's `spec-driven` sync/archive path is built around behavior deltas. This PRD does not redefine it by treating `skip_specs` as an external-contract workaround. The detailed-contract scenario is an explicit release test (§7).

## 4. User journeys

### A. Start with existing information

**Prompt:** “Implement the checkout API from `docs/checkout.md`, following the payments architecture. Leave mobile UI for later.”

The agent reads what it can access, identifies relevant context, asks about material gaps, and helps the developer select the slice. It drafts the normal OpenSpec artifacts and retains links with a concise explanation of why each source matters. The developer reviews the result.

**Success:** The change is actionable without reconstructing the source discussion. Readiness or ownership uncertainty is surfaced as a warning, not an automatic block.

### B. Split one shared contract across changes

**Situation:** Checkout expectations span iOS, Android, and backend.

Each developer plans their component's slice from the same shared document. Their changes retain distinct scopes, designs, and tasks; they do not copy the entire shared document into every repository. If a component has additional behavior to specify, it can define a local contract.

**Success:** Shared context stays shared, while each change remains separately understandable and executable.

### C. Add context or discover a conflict mid-change

**Situation:** A benchmark, ADR, or implementation discovery challenges the current approach.

The agent explains the possible effect on the plan. The developer chooses whether to update the change, leave it as is, or propose an update to the upstream source. The original source is not silently rewritten.

**Success:** Decisions can evolve without losing the existing change or pretending one side must always win.

### D. Resume or review later

**Situation:** A teammate opens a change after the original agent session is gone, or reads it after archival.

The change still explains its scope and points to relevant information with the reason each link matters. An unavailable source is called out when the agent tries to use it.

**Success:** A reviewer can understand the handoff without replaying the planning conversation.

### E. Check whether context still agrees

**Prompt:** “Review the linked checkout and payments information against this change. What needs reconsideration?”

The agent re-reads accessible sources, identifies possible mismatches, and recommends reviewable changes. If a historical revision is recoverable, it may compare against it; otherwise it describes its assessment as a **current-context review**, not an exact before/after diff. An archived change remains historical; new work should be proposed as a new change rather than silently rewriting the archive.

**Success:** The developer knows what may have changed and decides what to do next.

## 5. Required context-workflow scope

These are requirements for the broader context experience. They have no committed delivery order and are separate from the [lifecycle roadmap](roadmap.md).

### Required experience

1. **Consistent start:** The supported OpenSpec planning flow can start from existing accessible files, folders, checkouts, and provider links the agent can already read. It helps select scope and preserves meaningful requirements, constraints, and motivations without wholesale copying.

2. **Links that explain the work:** Important sources appear as standard Markdown links or URLs with short explanatory prose in appropriate change artifacts. More precise native links may be used when available. This basic context workflow needs no new source type or YAML schema. Optional structured Git pins belong to the separate drift-check capability.

3. **Continuity:** The agent keeps those links useful when drafting, editing, implementing, and archiving the change. Existing schemas and change lifecycle rules remain in force.

4. **On-demand review:** A documented, repeatable agent workflow re-checks linked context, reports possible inconsistencies, and proposes edits for human review. It can also recommend an upstream change or PR when the original information needs revisiting.

5. **Honest access and uncertainty:** The agent distinguishes what it actually read from what it could not reach, and does not infer approvals or claim exact history it cannot retrieve.

**Example (illustrative, not a required template):**

```markdown
## Context

This change implements the iOS portion of the
[checkout flow](../../../docs/checkout.md#confirmation).

It follows the [payment failure design](../../../docs/payments.md).
Backend and Android implementation are handled separately.
```

The existing `openspec/config.yaml` `references:` mechanism indexes registered OpenSpec Stores and is distinct from these change-local document links.

### Relationship to lifecycle work

The lifecycle pilot uses recorded source revisions to check drift before Apply and offers a feedback review afterward. Neither finding a changed file nor completing a review establishes that an external contract has been implemented correctly. The implement-only lifecycle and verification questions below remain part of the context work.

Shared Projects, broader historical comparison, and a proactive observer remain future directions. On-demand and observer-driven review should share reconciliation concepts. A hosted observer is a possible paid offering, not a prerequisite for the context workflow or lifecycle pilot.

## 6. What we can tell developers

**Why use it?** It saves repeated explanation and leaves a clear trail from existing context to a scoped change, even after the original planning session ends.

**When should you use it?** When a change depends on existing documents, decisions, designs, constraints, or specifications. For a small self-contained task, normal OpenSpec still works without extra links.

**How do you use it?** Point your agent at accessible sources, describe the slice you own, review the resulting plan and source links, and ask it to re-check that context when circumstances change.

**What can you rely on?** The workflow aims to keep important links and explanations in the change, retain them through normal revisions and archive, and present proposed reconciliation edits for review.

**What does a link mean?** It says information mattered to planning. It does **not** by itself establish that the source is approved, still current, implemented, or verified. Access to third-party content depends on available tools and permissions. A review against current content is not proof of exactly how a source changed.

For teams using OKF, the source documents can stay in OKF. The same is true of ordinary Markdown and other tools. OpenSpec manages the work, not a competing knowledge format.

## 7. Release tests

Test these end-to-end, comparing results against simply telling an agent to “read this document.”

| Scenario | What must work |
| --- | --- |
| **Large Markdown document** | Generate a useful, bounded change from one slice; preserve the passages or sections that matter without copying the whole source. |
| **Shared checkout** | Create separate iOS and backend changes from the same source, with clearly different scopes and local plans. |
| **Platform/infrastructure context** | Use a design decision or benchmark, not just a formal behavioral requirement, to guide a change. |
| **Other Git checkout / external link** | Use context the agent can reach; preserve a sensible source link and explain access limitations on another machine. |
| **Custom schema** | Preserve meaningful context without assuming default artifact names. |
| **Resume and archive** | A different agent can understand the important sources later; current validation, sync, and archive still behave correctly. |
| **Manual reconciliation** | Re-read context, present a potential conflict with rationale, and propose edits without silently changing source or agreed work. |
| **Detailed upstream contract** | Try a complete, testable shared specification. Determine whether the current delta lifecycle forces substantial duplicate contracts. **If it does, this release is not a complete answer for that use case.** |

**Quality bar:** The feature must improve planning consistency, scope clarity, durable handoff, or later review in a way developers notice. Adding links alone is not enough.

## 8. Implementation work left to settle

The six strategic decisions are already agreed. These are **design and release checks**, not questions about the overall product thesis:

**A. Implement-only changes (highest impact).** The long-term product behavior is agreed: a change can implement an existing authoritative contract without a redundant local contract. We still need to design how such a change validates and archives, and decide from the detailed-contract prototype which bounded improvements can ship before that lifecycle is ready. Do not claim to solve that case until it actually works.

**B. Historical baseline.** The direction is agreed: on-demand reviews now and a future observer, with source history when recoverable. Engineering must decide what can reliably be retrieved from Git and other providers, whether a snapshot is warranted for v1, and how to label an assessment without historical data.

**C. Reliable link handling.** The format decision is agreed: links plus prose. Test where each schema places those links and whether agents carry them through proposal, revision, apply, and archive. Add deterministic structure only for repeated, observed failures.

**Recommended build order:** Prototype the shared-contract and resume/review journeys, including the detailed-contract edge case; then finalize the smallest release boundary and implement the agent instructions and workflow support around it.

---

**Verified OpenSpec contracts:** [Concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md) · [Default schema](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml) · [Change metadata](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/change-metadata/schema.ts) · [Project config](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/project-config.ts) · [Stores beta](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md).\
**Customer evidence:** Enterprise feedback and upstream integration requirements, used to understand needs rather than mandate a particular provider integration.\
**Status:** This is a proposed experience, not a shipped OpenSpec capability or a finalized implementation design.
