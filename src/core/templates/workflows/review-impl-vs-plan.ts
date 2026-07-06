/**
 * Skill Template Workflow Modules
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

const REVIEW_IMPL_VS_PLAN_INSTRUCTIONS = `Review real implementation against an OpenSpec change plan. This is a read-only review: inspect artifacts, code, tests, configuration, and documented runtime paths, then report gaps. Do not edit files.

${STORE_SELECTION_GUIDANCE}

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Resolve the change**

   If a change name is provided, use it. Otherwise:
   - Infer from conversation context if the user clearly mentioned one
   - If ambiguous, run \`openspec list --json\` and ask the user to select

2. **Check status to understand scope**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse:
   - \`schemaName\`: workflow schema
   - \`planningHome\`, \`changeRoot\`, \`artifactPaths\`, and \`actionContext\`: path and scope context
   - Existing artifacts and their concrete paths

3. **Load the plan artifacts**

   Read every existing artifact path from the status JSON. For a spec-driven change this usually includes:
   - \`proposal.md\`
   - \`tasks.md\`
   - \`design.md\`, if present
   - \`specs/**/spec.md\`

4. **Extract implementation claims**

   Build a review matrix from:
   - Requirements and scenarios from delta specs
   - Task checklist items
   - Design decisions or constraints
   - Proposal impact areas and named affected systems

5. **Inspect implementation evidence**

   For each claim, inspect the actual codebase:
   - enforcing code path
   - default runtime or user-facing entry point
   - producer/consumer wiring
   - configuration, examples, and docs that users will actually follow
   - tests or smoke checks proving the behavior

   Do not accept checklist state or generated contracts as proof by themselves. Verify that the default path is wired end to end.

6. **Report blockers first**

   Classify findings:
   - **BLOCKER**: shipped behavior is missing, incorrectly wired, unsafe, or contradicts required specs/tasks
   - **WARNING**: likely drift, missing scenario coverage, weak test evidence, or docs/config mismatch
   - **NOTE**: minor follow-up or assumption

**Output Format**

\`\`\`markdown
## Review: <change-name>

### Verdict
<short pass/fail summary>

### Findings
- [BLOCKER] <file:line> <issue and impact>
- [WARNING] <file:line> <issue and impact>

### Requirement -> Code -> Test
| Plan item | Code evidence | Test evidence | Status |
|-----------|---------------|---------------|--------|

### Runtime Wiring
<default entry points, producer/consumer path, config/docs status>

### Questions
<only questions that block a correct review>
\`\`\`

**Guardrails**
- Stay read-only. Do not edit artifacts or implementation.
- Prioritize concrete bugs, regressions, missing wiring, missing tests, and spec contradictions.
- Cite files and line numbers for findings whenever possible.
- If no issues are found, say that clearly and list any residual test gaps or assumptions.
- Keep summaries brief; findings and evidence are the main output.`;

export function getReviewImplVsPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-review-impl-vs-plan',
    description: 'Review real implementation against an OpenSpec proposal, tasks, specs, and design. Use when the user wants a read-only check that shipped code matches the approved plan.',
    instructions: REVIEW_IMPL_VS_PLAN_INSTRUCTIONS,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxReviewCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Review',
    description: 'Read-only review of implementation against an OpenSpec change plan',
    category: 'Workflow',
    tags: ['workflow', 'review', 'experimental'],
    content: REVIEW_IMPL_VS_PLAN_INSTRUCTIONS.replace(
      '**Input**: Optionally specify a change name.',
      '**Input**: Optionally specify a change name after `/opsx:review` (e.g., `/opsx:review add-auth`).'
    ),
  };
}
