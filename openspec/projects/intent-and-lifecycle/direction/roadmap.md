# Intent and lifecycle roadmap

**Status:** Proposed delivery sequence, updated November 5, 2026; no implementation or dates committed.
**Purpose:** Coordinate the existing-context workflow and the selected actions/triggers model.

The product goal is to implement and verify a focused slice of existing intent without duplicating its authoritative contract. Actions and triggers support that work with checks and optional reviews. They are not a prerequisite for the basic context workflow and do not solve its external-contract lifecycle gaps.

This is the single sequencing reference for these documents. Launch posts illustrate target experiences, not separate release commitments. The earlier optional-skill-first schedule and effort estimates are retired.

## 1. Validate the two core journeys

| Journey | Prototype | Evidence needed |
| --- | --- | --- |
| Existing context to verified implementation | Use one shared checkout contract across two repos and one infrastructure ADR in a repo. Compare existing planning with focused guidance. An optional skill may serve as a test vehicle. | Useful scope, reuse versus local-delta decisions, verification of applicable contracts, and source links that survive archive. |
| Lifecycle checks and optional reviews | Before Apply, run a built-in Git drift check. After Apply, offer a feedback review in the current session. Exercise manual invocation and a custom caller. | Correct file comparisons; honest unknown results; accept/skip without affecting check status; no repeated prompts from instruction reads. |

These pilots can proceed independently. Neither requires plugin distribution, a general event engine, or changes to the artifact dependency graph. Drafting a good proposal alone does not establish that the context journey works end to end.

## 2. Deliver bounded improvements from the pilots

For the context workflow, resolve the implement-existing-contract path across planning, validation, Apply, verification, and archive before claiming full support. Preserve ordinary source links and explanations. Use local deltas only for contracts the change actually modifies. Do not repurpose `skip_specs` to stand for external-contract implementation.

For lifecycle behavior, deliver optional Git pins, validated actions/triggers, a built-in read-only check, separate findings and suggestions, and warning-only policy. Settle the result contract, Git ref freshness, manual invocation, and duplicate suppression first. Add Archive warnings at the CLI boundary once the pilot works; add other events only when useful.

A bounded improvement may ship independently with its limits stated. Do not present source drift as semantic reconciliation, optional review as proof, or task completion as delivery.

## 3. Prove reuse before packaging it

Test with the customer pilot, a smaller team, and a platform engineer. Integrate proven guidance into relevant existing workflows without requiring every project to enable lifecycle actions.

Demonstrate a second independent integration, then define executable-action trust, permissions, timeouts, versioning, and result compatibility. Build toward independently maintained plugins, global availability with per-project enablement, and versioned team profiles. Keep installation, enablement, and trust distinct. Packaging follows demonstrated reuse; it does not block the first useful behavior.

## Later work

- Additional providers, item-level traceability, coverage records, and controlled upstream feedback submission.
- Blocking policies after explicit unknown/error semantics and enforcement boundaries are settled.
- Custom workflow milestones and event publishers when there are actual callers.
- Shared Projects, observer-driven relationship discovery, and cross-system approved/implemented/delivered status.
- Managed agent runs, durable approvals, scheduling, and action chains only if concrete needs justify them.

These are directions, not a committed ordering or timeline. Estimate after the pilots expose the work.

## Customer-facing boundary

The pilot may read accessible customer requirements and draft local changes or feedback for review. It does not write to the customer's source system. Generic Git drift needs authorized Git access, not a provider-specific status integration. Readiness, item-level coverage, semantic reconciliation, upstream submission, and delivery rollups need separate design and evidence.

All material in this project remains local and unsanitized. No publication or remote work is authorized.
