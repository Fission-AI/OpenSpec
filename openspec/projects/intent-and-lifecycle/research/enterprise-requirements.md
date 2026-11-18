# Enterprise integration requirements

**Status:** Research notes, not the pilot backlog. Coverage re-scored in November 2026 against the revised pilot.

The [lifecycle pilot](../lifecycle/pilot-proposal.md) lets a project attach named agent instructions to points in the workflow. This inventory keeps the broader integration needs visible without making them prerequisites.

The table describes what the **proposed** pilot would deliver if implemented. It does not claim OpenSpec provides any of this today. An earlier version of this table scored a pilot with built-in Git source tracking. That pilot was replaced, so several rows moved down.

Coverage uses four values:

- **Hooks:** the hook mechanism itself delivers it.
- **Agent review:** a project-written action can ask an agent to do it. The result is advisory and depends on the agent.
- **Team script:** a project can supply its own script and have an action run it. OpenSpec provides nothing but the moment to run it.
- **Not covered:** hooks and actions do not address it.

Generation and source retrieval remain owned by the existing integration. A row marked not covered does not mean that workflow lacks the behavior.

| Upstream requirement | Coverage | What that means, and what else is needed |
| --- | --- | --- |
| Detect when a Git-based source document changes after generation | **Team script** | The team's script owns the baseline and the comparison. OpenSpec ships no drift check. |
| Warn at OpenSpec lifecycle points without silently syncing | **Hooks** | Works at hooks a skill calls. It depends on the agent following the skill, and a hand-run CLI command fires no hooks. |
| Store exact Git revision of a source document | **Not covered** | A team script may keep its own baseline. OpenSpec records none. Generalized references are a separate exploration. |
| Keep locked upstream product specifications unchanged; store tracking outside them | **Agent review** | Action lookup is read-only. Whether an agent writes upstream depends on its instructions and permissions, which OpenSpec does not enforce. |
| Create a well-formed change from an upstream product specification, using team schemas | **Not covered** | The existing generation skill does this, unchanged. |
| Pull in related architecture, contracts, dependencies, and constraints | **Not covered** | Provider-specific source discovery and retrieval. |
| Check readiness, promotion, and early-start overrides | **Agent review** | An action can ask the agent to read upstream status before Apply. There is no enforcement and no recorded override. |
| Trace every generated requirement to an upstream requirement and source revision | **Not covered** | Item-level IDs, extraction mapping, and coverage records. |
| Preserve MUST/SHALL, numbers, limits, and error codes exactly | **Not covered** | Extraction validation against original items. An agent review can spot-check but guarantees nothing. |
| Never write code or upstream product specifications during generation | **Not covered** | The generation skill's own permission and write rules. |
| One-way upstream → OpenSpec updates, only after approval | **Agent review** | A review reports conflicts, and the developer revises the plan through the existing Update skill with confirmation. Controlled reconciliation is not provided. |
| Skip irrelevant archived upstream product specifications when checking drift | **Team script** | The script or the action's instructions would need upstream status awareness. |
| Show added, modified, removed, or renamed source sections | **Team script** | A script can diff a file. Item-aware diffing and rename matching are not provided. |
| Classify upstream-only, OpenSpec-only, both changed, or in sync | **Not covered** | Three-way comparison of source, local work, and original baseline. |
| Capture deviations and evidence during implementation | **Agent review** | A review after Apply can draft findings. Nothing stores a feedback record. |
| Keep feedback separate from implementation detail and route it to the upstream product team | **Not covered** | A review can draft feedback. Classification, routing, and approved submission need a separate workflow. |
| Warn upstream authors during product-requirement editing, auditing, or submission | **Not covered** | An upstream tool would have to invoke a hook of its own. Nothing watches upstream edits. |
| Show spec approved, implementation complete, feature released separately | **Not covered** | Cross-system delivery model and status aggregation. |
| Every upstream requirement gets a coverage status | **Not covered** | Item-to-change and item-to-test mapping, plus rollups. |
| Preserve history; archived OpenSpec changes remain archived | **Not covered** | Existing archive behavior is unchanged. A new-change-on-drift convention and durable source evidence are still needed. |
| Require explicit confirmation for every write | **Agent review** | `suggest` mode asks before an action runs. Writes are governed by the agent's permissions and each skill's existing confirmations. |
| Mark feedback lacking evidence as needing confirmation | **Agent review** | An action's instructions can require it. Nothing validates the result. |
| Validate OpenSpec after every write | **Not covered** | Write-path validation or host and CI integration. Hooks cannot observe every agent edit. |

The pilot supplies a moment and a place to put instructions. Detecting and managing drift remains a goal, and the pilot serves it through user-defined actions. Built-in source-change detection, item-level traceability, provider status, controlled reconciliation, upstream submission, and cross-system delivery status remain unsolved by it.

Enforcement is deferred. A trigger's `policy` (warn or block) stays in the longer-term model but has no effect in the pilot. Policy, native executable checks, and generalized references are [separate decisions](../direction/roadmap.md).

**Source basis:** Anonymized enterprise integration requirements from the original exploration. This table preserves that analysis; the consolidation did not independently re-read the source attachment. Source filenames and customer identifiers are omitted. The anonymized inventory is included as background for the draft proposal.
