/**
 * Fast-forward: create a change and write everything implementation needs,
 * keeping momentum over asking.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { optionalWorkflow } from '../optional-workflow.js';
import { artifactLoopSteps, readExistingSpecsStep } from './artifact-loop.js';
import { BEFORE_YOU_START, writingAnArtifact } from './references.js';

/**
 * The implementation handoff, resolved at generation time so a profile
 * without `apply` is not told to run it (see optional-workflow.ts).
 *
 * The two surfaces word this differently on purpose (#258): a command-only
 * tool has no conversational agent to ask, so its prompt names a command or
 * the CLI and never invites "ask me to implement".
 */
const SKILL_APPLY_HANDOFF = optionalWorkflow(
  'apply',
  'Run `/opsx:apply` or ask me to implement to start working on the tasks.',
  'Ask me to implement to start working on the tasks.'
);

const COMMAND_APPLY_HANDOFF = optionalWorkflow(
  'apply',
  'Run `/opsx:apply` to start implementing.',
  'Run `openspec instructions apply --change "<name>" --json` to get the task list and start implementing.'
);


function getFfInstructions(input: string, applyHandoff: string): string {
  return `Fast-forward through artifact creation - generate everything needed to start implementation in one go.

${BEFORE_YOU_START}

**Input**: ${input}

**Steps**

1. **If no clear input provided, ask what they want to build**

   Ask (open-ended, no preset options): "What change do you want to work on? Describe what you want to build or fix." Derive a kebab-case name ("add user authentication" → \`add-user-auth\`). Do NOT proceed without understanding what the user wants to build.

${readExistingSpecsStep(2)}

3. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   If a change with that name already exists, suggest continuing that change instead.

${artifactLoopSteps(4, '✓ Created ', 'critically unclear context')} Otherwise prefer making reasonable decisions to keep momentum.

   ${writingAnArtifact({ loads: false }).split('\n').join('\n   ')}

6. **Show final status**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`

**Output**

Summarize the change name and location, each artifact created (plus any conditional artifact you skipped and why), then: "All artifacts needed for implementation are ready. ${applyHandoff}"

**Guardrails**
- Create every artifact the apply phase transitively depends on, not just the ids listed in \`apply.requires\``;
}

export function getFfChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-ff-change',
    description: 'Fast-forward through OpenSpec artifact creation. Use when the user wants to quickly create all artifacts needed for implementation without stepping through each one individually. Also use when the user says "openspec ff" or "opsx ff".',
    instructions: getFfInstructions(
      "The user's request should include a change name (kebab-case) OR a description of what they want to build.",
      SKILL_APPLY_HANDOFF
    ),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxFfCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Fast Forward',
    description: 'Create a change and generate all artifacts needed for implementation in one go',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: getFfInstructions(
      'The argument after `/opsx:ff` is the change name (kebab-case), OR a description of what the user wants to build.',
      COMMAND_APPLY_HANDOFF
    ),
  };
}
