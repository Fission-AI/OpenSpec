# Workflow Schema Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every generated `new`, `propose`, and `ff` workflow select and confirm one schema from existing schema descriptions before it creates a change, then persist that choice with an explicit `--schema` flag.

**Architecture:** Put the complete decision protocol in one `SCHEMA_SELECTION_GUIDANCE` string beside the existing store-selection guidance. Interpolate that string into the skill and slash-command bodies for all three creation workflows. Keep the CLI and schema model unchanged; tests treat the shared prose as a behavioral contract and verify its position in all six generated bodies.

**Tech Stack:** TypeScript, Vitest, pnpm, OpenSpec workflow-template generators, committed skills.sh output.

## Global Constraints

- Modify Agent workflow instructions only; do not change schema parsing, schema files, project defaults, root selection, or `openspec new change` CLI behavior.
- Existing schema `description` text is the sole semantic selection authority. Schema `name` and `artifacts` are only for identification, display, and explanation.
- Schema selection fails closed: ambiguity, rejection, discovery failure, unparseable output, and an empty schema list all stop creation without default fallback.
- Confirmation is required unless the user explicitly selected the schema, or the current request or selected description clearly waives another confirmation. An explicit user request to confirm takes precedence over every waiver.
- Every successful creation command includes `--schema "<schema-name>"`, including the configured default schema.
- Keep generated skills and slash commands behaviorally identical.
- Preserve unrelated untracked `output/` and `tmp/` directories.

---

## 1. Define the shared schema-selection contract with TDD

**Files:**

- Create: `test/core/templates/schema-selection.test.ts`
- Create: `src/core/templates/workflows/schema-selection.ts`

- [x] 1.1 Add a focused test for the complete shared instruction contract.

Create `test/core/templates/schema-selection.test.ts` with the contract assertions first:

```ts
import { describe, expect, it } from 'vitest';

import { SCHEMA_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/schema-selection.js';

describe('schema selection guidance', () => {
  it('defines the complete fail-closed selection and confirmation contract', () => {
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('openspec schemas --json');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('`description` as the authority');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      '`name` and `artifacts` only to identify, display, and explain candidates'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('exactly one is a clear match');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('treat that choice as confirmed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('stop and wait for confirmation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      "user's current request or the selected schema's description"
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('clearly and unambiguously');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('explicitly asks for confirmation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Never silently use the default schema');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('rejects a recommendation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('cannot be parsed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('returns no schemas');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Do not fall back to the default');
  });
});
```

- [x] 1.2 Run the focused test and verify the expected RED state.

Run:

```bash
pnpm exec vitest run test/core/templates/schema-selection.test.ts
```

Expected: FAIL because `src/core/templates/workflows/schema-selection.ts` does not exist. If it fails for another reason, fix the test setup before adding production code.

- [x] 1.3 Add the minimal shared guidance implementation.

Create `src/core/templates/workflows/schema-selection.ts`:

```ts
/**
 * Shared schema-selection guidance for change-creation workflows.
 *
 * Interpolated into new, propose, and ff skill/command instructions so every
 * generated entry point uses the same discovery and confirmation protocol.
 */
export const SCHEMA_SELECTION_GUIDANCE = `2. **Select and confirm the workflow schema**

   Before creating the change, determine the schema as follows:

   - If the user explicitly names a schema, use it and treat that choice as confirmed. If they also explicitly ask you to confirm it, stop and wait for confirmation.
   - Otherwise, run \`openspec schemas --json\` and inspect each schema's \`name\`, \`description\`, and \`artifacts\`.
   - Use \`description\` as the authority for matching the request. Use \`name\` and \`artifacts\` only to identify, display, and explain candidates.
   - Select a schema only when exactly one is a clear match.
     - Normally, present the recommendation and a concise reason, then stop and wait for confirmation.
     - Skip that confirmation only when the user's current request or the selected schema's description clearly and unambiguously says no further confirmation is needed.
     - If the user explicitly asks for confirmation, always wait even if the selected schema's description waives it.
   - If no unique recommendation is possible, stop before creating the change, list the relevant candidates with their descriptions, and ask the user to choose. Never silently use the default schema.
   - If the user rejects a recommendation, stop and list the relevant candidates so they can choose.
   - If \`openspec schemas --json\` fails, cannot be parsed, or returns no schemas, stop and report the problem. Do not fall back to the default.
   - After the user selects a listed candidate, treat that choice as confirmed.

   Do not continue until one schema is confirmed or confirmation has been clearly waived. Use the selected schema name in the create command below.`;
```

- [x] 1.4 Run the focused test and verify the GREEN state.

Run:

```bash
pnpm exec vitest run test/core/templates/schema-selection.test.ts
```

Expected: PASS, 1 test.

- [x] 1.5 Commit the shared contract.

```bash
git add src/core/templates/workflows/schema-selection.ts test/core/templates/schema-selection.test.ts
git commit -m "feat(workflows): define schema selection guidance"
```

---

## 2. Apply the protocol to all six creation workflow bodies with TDD

**Files:**

- Modify: `test/core/templates/schema-selection.test.ts`
- Modify: `src/core/templates/workflows/new-change.ts`
- Modify: `src/core/templates/workflows/propose.ts`
- Modify: `src/core/templates/workflows/ff-change.ts`

- [x] 2.1 Extend the focused test to enumerate both delivery forms for all three workflows.

Add these imports and fixtures to `test/core/templates/schema-selection.test.ts`:

```ts
import {
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';

const creationBodies: Array<[string, string]> = [
  ['new skill', getNewChangeSkillTemplate().instructions],
  ['new command', getOpsxNewCommandTemplate().content],
  ['propose skill', getOpsxProposeSkillTemplate().instructions],
  ['propose command', getOpsxProposeCommandTemplate().content],
  ['ff skill', getFfChangeSkillTemplate().instructions],
  ['ff command', getOpsxFfCommandTemplate().content],
];

function occurrences(body: string, fragment: string): number {
  return body.split(fragment).length - 1;
}
```

Add the integration assertions inside the same `describe` block:

```ts
it('appears exactly once before creation in every skill and command body', () => {
  for (const [label, body] of creationBodies) {
    expect(occurrences(body, SCHEMA_SELECTION_GUIDANCE), label).toBe(1);
    expect(body.indexOf(SCHEMA_SELECTION_GUIDANCE), label).toBeLessThan(
      body.indexOf('openspec new change')
    );
  }
});

it('always creates with the selected schema explicitly', () => {
  for (const [label, body] of creationBodies) {
    expect(body, label).toContain(
      'openspec new change "<name>" --schema "<schema-name>"'
    );
  }
});
```

- [x] 2.2 Run the focused test and verify the expected RED state.

Run:

```bash
pnpm exec vitest run test/core/templates/schema-selection.test.ts
```

Expected: the contract test remains green, while the two new integration tests fail because none of the six bodies contains the new guidance or explicit schema command yet.

- [x] 2.3 Replace the old `new` default-selection prose with the shared protocol.

In `src/core/templates/workflows/new-change.ts`:

1. Import `SCHEMA_SELECTION_GUIDANCE` beside `STORE_SELECTION_GUIDANCE`.
2. In both `getNewChangeSkillTemplate()` and `getOpsxNewCommandTemplate()`, remove the existing step 2 block that says to use the default schema.
3. Interpolate `${SCHEMA_SELECTION_GUIDANCE}` at that exact position, after input has been understood and before change creation.
4. Change both creation commands to:

```bash
openspec new change "<name>" --schema "<schema-name>"
```

5. Remove the obsolete conditional `--schema` explanation and replace it with one sentence stating that `<schema-name>` is the confirmed or clearly waived selection.
6. Replace the final non-default-only guardrail with `Always pass the selected schema with --schema`.

- [x] 2.4 Add the shared protocol to `propose` and renumber its existing steps.

In `src/core/templates/workflows/propose.ts`:

1. Import `SCHEMA_SELECTION_GUIDANCE` beside `STORE_SELECTION_GUIDANCE`.
2. Interpolate it after step 1 in both skill and command bodies.
3. Renumber the existing create/status/artifact/final-status steps from 2-5 to 3-6 in both bodies. Do not change the nested artifact-loop letters.
4. Change both creation commands to:

```bash
openspec new change "<name>" --schema "<schema-name>"
```

5. State immediately below the command that `<schema-name>` is the confirmed or clearly waived selection.

- [x] 2.5 Add the shared protocol to `ff` and renumber its existing steps.

In `src/core/templates/workflows/ff-change.ts`, perform the same six-body symmetry work as `propose.ts`:

1. Import the constant.
2. Insert it after step 1 in both skill and command bodies.
3. Renumber the existing top-level steps from 2-5 to 3-6.
4. Add `--schema "<schema-name>"` to both creation commands.
5. Document `<schema-name>` as the confirmed or clearly waived selection.

- [x] 2.6 Run focused behavioral and regression tests.

Run:

```bash
pnpm exec vitest run \
  test/core/templates/schema-selection.test.ts \
  test/core/templates/propose.test.ts \
  test/core/templates/skillssh-parity.test.ts
```

Expected: the new behavior tests and existing propose/ff artifact-loop tests pass. `skillssh-parity.test.ts` may still report stale committed generated skills until task 3; if so, confirm its only diffs are the three expected creation skills and continue to regeneration.

- [x] 2.7 Commit the six-template integration.

```bash
git add \
  src/core/templates/workflows/new-change.ts \
  src/core/templates/workflows/propose.ts \
  src/core/templates/workflows/ff-change.ts \
  test/core/templates/schema-selection.test.ts
git commit -m "feat(workflows): select schemas before change creation"
```

---

## 3. Regenerate committed skills and intentional parity hashes

**Files:**

- Modify: `skills/openspec-new-change/SKILL.md`
- Modify: `skills/openspec-propose/SKILL.md`
- Modify: `skills/openspec-ff-change/SKILL.md`
- Modify: `test/core/templates/skill-templates-parity.test.ts`

- [x] 3.1 Prove the golden parity test detects the intended template changes.

Run before updating hashes:

```bash
pnpm exec vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: FAIL only for the changed `new`, `propose`, and `ff` skill/command function payload hashes and the three changed generated-skill content hashes. Investigate any unrelated hash movement before proceeding.

- [x] 3.2 Build from the edited TypeScript sources.

```bash
pnpm run build
```

Expected: build succeeds, ensuring the generator and hash script read fresh `dist/` output.

- [x] 3.3 Regenerate committed skills and verify the generated-file scope.

```bash
pnpm run generate:skills
git status --short
git diff --name-only -- skills/
```

Expected under `skills/`: exactly these files change:

```text
skills/openspec-ff-change/SKILL.md
skills/openspec-new-change/SKILL.md
skills/openspec-propose/SKILL.md
```

If another generated skill changes, stop and determine why before accepting the diff.

- [x] 3.4 Regenerate parity hashes using the repository helper.

```bash
pnpm run regen:parity-hashes
```

Expected moved function hashes:

```text
getNewChangeSkillTemplate
getOpsxNewCommandTemplate
getOpsxProposeSkillTemplate
getOpsxProposeCommandTemplate
getFfChangeSkillTemplate
getOpsxFfCommandTemplate
```

Expected moved generated-content hashes:

```text
openspec-new-change
openspec-propose
openspec-ff-change
```

No unrelated hash may be accepted without explanation.

- [x] 3.5 Verify generated skills and parity together.

```bash
pnpm exec vitest run \
  test/core/templates/schema-selection.test.ts \
  test/core/templates/skill-templates-parity.test.ts \
  test/core/templates/skillssh-parity.test.ts \
  test/core/templates/propose.test.ts
```

Expected: all focused tests pass.

- [x] 3.6 Inspect generated prose for accidental drift.

```bash
git diff --check
git diff -- \
  skills/openspec-new-change/SKILL.md \
  skills/openspec-propose/SKILL.md \
  skills/openspec-ff-change/SKILL.md \
  test/core/templates/skill-templates-parity.test.ts
```

Confirm each generated skill has exactly one selection block, it precedes `openspec new change`, the creation command always has `--schema`, and unrelated workflow instructions are unchanged.

- [x] 3.7 Commit generated distribution updates.

```bash
git add \
  skills/openspec-new-change/SKILL.md \
  skills/openspec-propose/SKILL.md \
  skills/openspec-ff-change/SKILL.md \
  test/core/templates/skill-templates-parity.test.ts
git commit -m "chore(skills): regenerate schema selection workflows"
```

---

## 4. Verify the complete change and close the implementation checklist

**Files:**

- Modify: `openspec/changes/add-workflow-schema-selection/tasks.md`

- [x] 4.1 Run static checks and a clean build.

```bash
pnpm run lint
pnpm run build
git diff --check
```

Expected: all commands exit 0.

- [x] 4.2 Run the focused workflow suite once more from fresh build output.

```bash
pnpm exec vitest run \
  test/core/templates/schema-selection.test.ts \
  test/core/templates/propose.test.ts \
  test/core/templates/skill-templates-parity.test.ts \
  test/core/templates/skillssh-parity.test.ts
```

Expected: all focused tests pass with no snapshots or hashes rewritten during the run.

- [x] 4.3 Run the full test suite.

```bash
pnpm test
```

Expected: the complete Vitest suite passes.

- [x] 4.4 Validate the OpenSpec change strictly.

```bash
node bin/openspec.js validate add-workflow-schema-selection --strict
```

Expected:

```text
Change 'add-workflow-schema-selection' is valid
```

- [x] 4.5 Audit scope and forbidden leftovers.

```bash
git diff main...HEAD --name-only
git diff main...HEAD -- src/core/project-config.ts src/core/root-selection.ts test/core/root-selection.test.ts
git status --short
```

Confirm:

- No `defaultSchema` implementation file changed.
- No schema model, resolver, or CLI implementation file changed.
- Only the approved proposal, shared guidance, three workflow sources, focused/parity tests, and three generated skills are in scope.
- `output/` and `tmp/` remain untouched and untracked.

- [x] 4.6 Mark every completed checkbox in this file and commit the final checklist state.

```bash
git add openspec/changes/add-workflow-schema-selection/tasks.md
git commit -m "docs(openspec): complete schema selection plan"
```
