/**
 * Shared authoring-conventions reference (the "proposal-writing reference").
 *
 * The artifact-drafting skills (`propose`, `ff-change`, `continue-change`,
 * `sync-specs`) link to this one reference instead of each re-encoding the
 * rules, so agents follow the conventions and the skills stay self-contained.
 *
 * The content is the compact form of `docs/concepts.md` ("What a Spec Is (and
 * Is Not)", "Keep It Lightweight: Progressive Rigor", "Spec Format", "Spec
 * Structure", "Delta Specs"). A conformance test asserts it still lists the
 * same belongs/avoid, rigor, keyword, scenario, and delta items the docs do, so
 * the reference and the docs cannot drift.
 */

/** Filename the reference is emitted to, and the marker skills link against. */
export const AUTHORING_CONVENTIONS_REFERENCE_FILE = 'references/authoring-conventions.md';

/**
 * One-line pointer skills embed in their body so an agent drafting an artifact
 * reads the conventions rather than guessing them.
 */
export const AUTHORING_CONVENTIONS_LINK = `**Authoring conventions:** Before writing spec content, follow the shared conventions in \`${AUTHORING_CONVENTIONS_REFERENCE_FILE}\` — what belongs in a spec vs. what to keep out, right-sized rigor, requirement and scenario conventions, and delta operations.`;

/** The reference body, emitted to `references/authoring-conventions.md`. */
export const AUTHORING_CONVENTIONS_REFERENCE = `# Authoring conventions

How to write OpenSpec artifacts so they pass review and stay useful. Follow these when drafting a proposal or its spec deltas.

## What a spec is (and is not)

A spec is a **behavior contract**, not an implementation plan.

Belongs in a spec:
- Observable behavior users or downstream systems rely on
- Inputs, outputs, and error conditions
- External constraints (security, privacy, reliability, compatibility)
- Scenarios that can be tested or explicitly validated

Keep out of a spec (put it in \`design.md\` or \`tasks.md\`):
- Internal class or function names
- Library or framework choices
- Step-by-step implementation details
- Detailed execution plans

Quick test: if the implementation can change without changing externally visible behavior, it does not belong in the spec.

## Right-sized rigor

Use the lightest level that still makes the change verifiable. Most changes stay **Lite**.

- **Lite (default):** short behavior-first requirements, clear scope and non-goals, a few concrete acceptance checks.
- **Full (higher risk):** cross-team or cross-repo changes, API/contract changes, migrations, or security/privacy concerns — where ambiguity is likely to cause expensive rework.

Do not maximize detail on every change; add rigor only where the risk earns it.

## Requirement and scenario conventions

- **RFC 2119 keywords** state intent: **MUST/SHALL** = absolute requirement; **SHOULD** = recommended, exceptions exist; **MAY** = optional. Use them deliberately, not just "SHALL" everywhere.
- **Every requirement carries at least one scenario** — scenarios are what make a requirement verifiable.
- **Scenarios are concrete and testable**, written \`WHEN\` (trigger) / \`THEN\` (expected outcome) / \`AND\` (additional condition), and cover the primary path **and** its notable edge cases, not only the happy path.

## Delta conventions

Delta specs signal intent for merge with section headers:
- \`## ADDED Requirements\` — new requirements
- \`## MODIFIED Requirements\` — changed requirements; show the prior value (e.g. "(Previously: 30 minutes)") so reviewers see what changed
- \`## REMOVED Requirements\` — removed requirements; state why (e.g. "Deprecated in favor of 2FA")
- \`## RENAMED Requirements\` — use \`FROM:\` / \`TO:\`

Include only what changes: to add one scenario to an existing requirement, put just that scenario under \`## MODIFIED Requirements\`; do not copy the unchanged scenarios.
`;
