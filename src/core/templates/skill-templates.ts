export type SkillId = 'proposal' | 'apply' | 'archive';

export interface SkillMetadata {
  name: string;
  description: string;
}

const proposalBody = `# Create OpenSpec Proposal

## Critical constraint

**No implementation code during proposal stage.** Create only design artifacts: \`proposal.md\`, \`tasks.md\`, \`design.md\`, and spec deltas. Implementation happens in the apply stage after approval.

## Guardrails

- Favor minimal scope; add complexity only when requested
- Identify ambiguities and ask clarifying questions before editing files
- Refer to \`openspec/AGENTS.md\` for additional conventions

## Execution checklist

Copy and track progress:
\`\`\`
- [ ] Review context: read \`openspec/project.md\`, run \`openspec list\` and \`openspec list --specs\`
- [ ] Inspect related code/docs to ground proposal in current behavior
- [ ] Note gaps requiring clarification; ask questions if needed
- [ ] Choose unique verb-led change-id (e.g., \`add-retry-logic\`, \`remove-legacy-auth\`)
- [ ] Scaffold \`openspec/changes/<id>/\` with proposal.md and tasks.md
- [ ] Create design.md if needed
- [ ] Draft spec deltas in \`changes/<id>/specs/<capability>/spec.md\`
- [ ] Draft tasks.md as ordered, verifiable work items
- [ ] Run \`openspec validate <id> --strict\` and resolve all issues
\`\`\`

## When to create design.md

Create \`design.md\` when the change:
- Spans multiple systems or components
- Introduces new architectural patterns
- Requires trade-off discussion before committing

Skip \`design.md\` for isolated, straightforward changes.

## Spec delta format

Each spec delta goes in \`changes/<id>/specs/<capability>/spec.md\`:
\`\`\`markdown
## ADDED Requirements

### REQ-XXX-001: [Requirement title]
[Description]

#### Scenario: [Happy path]
Given [context]
When [action]
Then [outcome]

#### Scenario: [Edge case]
...

## MODIFIED Requirements
...

## REMOVED Requirements
...
\`\`\`

Cross-reference related capabilities when relevant.

## tasks.md format

Ordered list of small, verifiable work items:
- Each task delivers user-visible progress
- Include validation steps (tests, tooling)
- Note dependencies and parallelizable work

## Reference commands

| Command | Purpose |
|---------|---------|
| \`openspec validate <id> --strict\` | Validate proposal before sharing |
| \`openspec show <id> --json --deltas-only\` | Inspect details when validation fails |
| \`openspec show <spec> --type spec\` | View existing spec |
| \`rg -n "Requirement:\\|Scenario:" openspec/specs\` | Search existing requirements |
| \`rg <keyword>\` | Explore codebase for implementation context |

## Example

**Input:** "Propose adding rate limiting to the API"

**Agent actions:**
1. Reviews \`openspec/project.md\` and existing specs
2. Searches codebase: \`rg "rate" openspec/specs\`
3. Creates \`openspec/changes/add-rate-limiting/\`
4. Scaffolds \`proposal.md\` with problem statement and approach
5. Creates \`design.md\` (spans API gateway and backend services)
6. Drafts spec delta with ADDED requirements and scenarios
7. Creates \`tasks.md\` with implementation steps
8. Validates: \`openspec validate add-rate-limiting --strict\``;

const applyBody = `# Apply OpenSpec Change

## Guardrails

- Favor straightforward, minimal implementations; add complexity only when requested or clearly required
- Keep changes tightly scoped to the requested outcome
- Refer to \`openspec/AGENTS.md\` for additional conventions

## Execution checklist

Copy and track progress:
\`\`\`
- [ ] Read \`changes/<id>/proposal.md\`, \`design.md\` (if present), and \`tasks.md\`
- [ ] Confirm scope and acceptance criteria understood
- [ ] Complete each task sequentially with minimal, focused edits
- [ ] Verify all items in tasks.md are finished
- [ ] Update tasks.md: mark each task \`- [x]\`
\`\`\`

## When blocked

Run \`openspec show <id> --json --deltas-only\` to review proposal context.

## Example

**Input:** "Apply openspec change: add-amp-support"

**Agent actions:**
1. Reads \`changes/add-amp-support/proposal.md\` and \`tasks.md\`
2. Implements each task with minimal edits
3. Marks all tasks complete in \`tasks.md\`
4. Reports completion summary`;

const archiveBody = `# Archive OpenSpec Change

## Guardrails

- Favor straightforward, minimal implementations; add complexity only when requested or clearly required
- Keep changes tightly scoped to the requested outcome
- Refer to \`openspec/AGENTS.md\` for additional conventions

## Execution checklist

Copy and track progress:
\`\`\`
- [ ] Identify the change ID (from input or run \`openspec list\`)
- [ ] Validate the change exists and is ready to archive
- [ ] Run \`openspec archive <id> --yes\`
- [ ] Confirm specs were updated and change moved to \`changes/archive/\`
- [ ] Validate with \`openspec validate --strict\`
\`\`\`

## When blocked

Run \`openspec list\` to see available changes and their status.

## Example

**Input:** "Archive the add-amp-support change"

**Agent actions:**
1. Runs \`openspec list\` to confirm change ID
2. Executes \`openspec archive add-amp-support --yes\`
3. Verifies change moved to \`changes/archive/\`
4. Runs \`openspec validate --strict\` to confirm specs are valid`;

export const skillBodies: Record<SkillId, string> = {
  proposal: proposalBody,
  apply: applyBody,
  archive: archiveBody
};

export const skillMetadata: Record<SkillId, SkillMetadata> = {
  proposal: {
    name: 'openspec-proposal',
    description:
      'Creates structured OpenSpec change proposals with spec deltas, task breakdowns, and design documentation. Activates when the user wants to propose, plan, or design a new change, create a spec, start an RFC, or says "new change" or "propose: <feature>". Does not write implementation code—only design artifacts.'
  },
  apply: {
    name: 'openspec-apply',
    description:
      'Implements approved OpenSpec changes by executing task checklists and updating completion status. Activates when the user asks to apply, implement, or execute an OpenSpec change, work on proposal tasks, or says "apply <id>" or "implement change <id>".'
  },
  archive: {
    name: 'openspec-archive',
    description:
      'Archives deployed OpenSpec changes and updates specs. Activates when the user asks to archive a change, complete a proposal, or says "archive <id>".'
  }
};

export function getSkillBody(id: SkillId): string {
  return skillBodies[id];
}

export function getSkillMetadata(id: SkillId): SkillMetadata {
  return skillMetadata[id];
}
