/**
 * New: scaffold a change and show the first artifact's instructions, then wait.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { optionalWorkflow } from '../optional-workflow.js';
import { BEFORE_YOU_START } from './references.js';

/**
 * Handoffs to `continue`, which is not guaranteed to be installed alongside
 * `new`; resolved at generation time (see optional-workflow.ts).
 */
const FIRST_ARTIFACT_PROMPT = optionalWorkflow(
  'continue',
  'Run `/opsx:continue` or just describe what this change is about and I\'ll draft it.',
  'Just describe what this change is about and I\'ll draft it.'
);

const EXISTING_CHANGE_HINT = optionalWorkflow(
  'continue',
  'suggest using `/opsx:continue` instead',
  'say so and ask whether to resume that change or pick a different name'
);


function getNewInstructions(input: string, firstArtifactPrompt: string, existingChange: string): string {
  return `Start a new change using the experimental artifact-driven approach.

${BEFORE_YOU_START}

**Input**: ${input}

**Steps**

1. **Understand the request**

   If there is no clear input, ask (open-ended, no preset options):
   > "What change do you want to work on? Describe what you want to build or fix."

   Derive a kebab-case name ("add user authentication" → \`add-user-auth\`). Do not continue without understanding what the user wants to build. If the name is not kebab-case, ask for a valid one.

2. **Choose the schema**

   Omit \`--schema\` to use the default. Pass \`--schema <name>\` only when the user names one. If they ask what workflows exist, run \`openspec schemas --json\` and let them choose.

3. **Create the change**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   Add \`--schema <name>\` only for a requested workflow. The CLI scaffolds the change in the planning home it resolves. If a change with that name already exists, ${existingChange}.

4. **Show the artifact status**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Use the returned \`planningHome\`, \`changeRoot\`, \`artifactPaths\`, and \`nextSteps\` instead of assuming repo-local paths.

5. **Show the first artifact's instructions**

   Find the first artifact with status "ready" (\`proposal\` for spec-driven) and run:
   \`\`\`bash
   openspec instructions <first-artifact-id> --change "<name>"
   \`\`\`

6. **STOP and wait for user direction**

**Output**

The change name and location, the schema and its artifact sequence, the status (0/N artifacts complete), the first artifact's template, and: "Ready to create the first artifact? ${firstArtifactPrompt}"

**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template`;
}

export function getNewChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-new-change',
    description: 'Start a new OpenSpec change using the experimental artifact workflow. Use when the user wants to create a new feature, fix, or modification with a structured step-by-step approach. Also use when the user says "openspec new change" or "opsx new".',
    instructions: getNewInstructions(
      "The user's request should include a change name (kebab-case) OR a description of what they want to build.",
      "Just describe what this change is about and I'll draft it, or ask me to continue.",
      'suggest continuing that change instead'
    ),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxNewCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: New',
    description: 'Start a new change using the experimental artifact workflow (OPSX)',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: getNewInstructions(
        'The argument after `/opsx:new` is the change name (kebab-case), OR a description of what the user wants to build.',
        FIRST_ARTIFACT_PROMPT,
        EXISTING_CHANGE_HINT
    ),
  };
}
