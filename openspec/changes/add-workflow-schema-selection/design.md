## Context

See `proposal.md` for motivation and `specs/command-generation/spec.md` for the behavioral contract. `listSchemasWithInfo()` already supplies schema names, descriptions, and artifact lists, and `openspec schemas --json` exposes them without spinner output. No schema data-model or CLI capability is missing.

The creation workflow templates are the authority for both generated skills and generated slash commands. `new` currently tells the Agent to use the default schema unless the user explicitly selects another; `propose` and `ff` have no schema-selection step before `openspec new change`. The repository already centralizes identical cross-workflow prose in `STORE_SELECTION_GUIDANCE` and verifies its presence across generated outputs.

## Goals / Non-Goals

**Goals**

- Give all generated creation workflows one consistent, fail-closed schema-selection protocol.
- Reuse existing schema descriptions instead of introducing parallel metadata.
- Preserve user authority over inferred choices.
- Keep skill and slash-command behavior identical.

**Non-Goals**

- Change `schema.yaml`, schema resolution precedence, project defaults, or `schemas --json`.
- Add keyword matching, deterministic scoring, a model API, or a new routing skill.
- Change the raw `openspec new change` CLI behavior.
- Rewrite schema descriptions or impose a fixed confirmation-waiver syntax.

## Decisions

### 1. Centralize the protocol in one shared workflow constant

Add `src/core/templates/workflows/schema-selection.ts` exporting `SCHEMA_SELECTION_GUIDANCE`. Import and interpolate it into both template bodies in each of `new-change.ts`, `propose.ts`, and `ff-change.ts`, after the workflow understands the request and before it creates the change.

This follows the existing `STORE_SELECTION_GUIDANCE` pattern. Keeping six independent copies was rejected because their confirmation and failure rules would drift. A separate routing skill was rejected because command-only delivery cannot assume that extra skill is installed.

### 2. Resolve the authoritative root, then use descriptions as the only selection authority

When the user has not named a schema, the Agent first resolves the authoritative root with `openspec context --json`, including `--store "<store-id>"` when the user explicitly selected a registered store. It then runs `openspec schemas --json` from the returned `root.path`. This preserves a local `store:` pointer and the global `defaultStore` even though `schemas` does not accept `--store`. Only `no_openspec_root` permits discovery from the current working directory; invalid or unavailable stores fail closed.

The Agent semantically compares the current request with each discovered schema's existing `description`. Schema names and artifact lists may identify, display, and explain candidates but do not replace an insufficient description.

The Agent must identify one unique clear recommendation. If it cannot, it lists relevant candidates and stops. It never treats the configured default as a semantic recommendation. This avoids inventing policy from schema names or artifact shapes.

### 3. Make confirmation fail closed with two explicit waiver sources

The selection states are:

| Input state | Action |
|---|---|
| User names a schema | Treat it as confirmed and use it explicitly |
| User names a schema and asks to confirm | Wait for confirmation |
| One inferred schema, no waiver | Recommend, explain, and wait |
| Current request clearly waives confirmation | Create with the unique recommendation |
| Selected schema description clearly waives confirmation | Create with the unique recommendation |
| Waiver wording is ambiguous or conflicts with a user confirmation request | Confirm |
| Recommendation is ambiguous or rejected | List candidates and stop |
| Discovery fails or yields no schema | Report and stop |

Waivers use ordinary natural language; there is no reserved token. Because skipping confirmation is the exceptional path, the Agent uses it only when the meaning is explicit. The current user's request outranks a schema-level waiver.

After selection, the workflow always passes `--schema <confirmed-name>`, so the established change-creation path persists the choice in `.openspec.yaml`. Existing status and artifact-generation steps remain unchanged.

### 4. Verify source templates and generated distributions

Focused tests cover the skill and command variants for all three workflows. They assert that the shared block appears exactly once, occurs before change creation, and contains the discovery, authority, confirmation, waiver, ambiguity, rejection, and failure rules.

Template-function and generated-content parity hashes are regenerated intentionally. `pnpm generate:skills` refreshes committed skills, and the resulting diff is expected to change only `openspec-new-change`, `openspec-propose`, and `openspec-ff-change`. Slash commands are generated during `openspec init/update` from the same source templates and require no committed static copies.

## Risks / Trade-offs

- **Agents can interpret natural-language descriptions differently** → Require one clear recommendation and stop on ambiguity.
- **Schema discovery can target the wrong project or store root** → Resolve `root.path` through `context --json` before discovery and preserve explicit or configured store selection.
- **The normal implicit path adds discovery and confirmation interactions** → Explicit schema selection and clear waiver language provide intentional shortcuts.
- **Existing descriptions may not contain enough selection guidance** → Surface candidates rather than inventing policy or silently using the default.
- **Tests cannot execute every model's semantic judgment** → Verify the complete instruction contract and generated distribution, while keeping user confirmation as the runtime safety boundary.

## Migration Plan

1. Ship the shared guidance and updated generated workflow templates.
2. Regenerate committed skills and update parity hashes.
3. Existing installations keep their prior behavior until `openspec update` refreshes their generated workflows.
4. Projects may improve existing schema descriptions when they want clearer recommendations or an explicit confirmation waiver; no migration is required.
5. Rollback restores the prior workflow text without touching schema files or existing changes.
