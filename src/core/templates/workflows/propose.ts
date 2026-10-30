/**
 * Propose: create a change and write every planning artifact in one pass.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { optionalWorkflow } from '../optional-workflow.js';
import { artifactLoopSteps, readExistingSpecsStep } from './artifact-loop.js';
import { BEFORE_YOU_START, writingAnArtifact } from './references.js';

/**
 * The implementation handoff. `apply` is not guaranteed to be installed, so
 * the prompt is resolved at generation time (see optional-workflow.ts) rather
 * than naming a workflow that may not exist.
 *
 * The two surfaces word this differently on purpose (#258): a command-only
 * tool has no conversational agent to ask, so its prompt names a command or
 * the CLI and never invites "ask me to implement".
 */
const SKILL_APPLY_HANDOFF = optionalWorkflow(
  'apply',
  'run `/opsx:apply` or ask me to apply this change',
  'ask me to apply this change'
);

const COMMAND_APPLY_HANDOFF = optionalWorkflow(
  'apply',
  'run `/opsx:apply`',
  'run `openspec instructions apply --change "<name>" --json` to get the tasks'
);


function getProposeInstructions(input: string, applyHandoff: string): string {
  return `Plan a new change and write every artifact implementation needs, in one pass.

**Planning only.** This workflow writes the plan and nothing else, even when the request also asks to build or fix something: do not edit project code or start implementing. Present the plan, then stop; implementation starts from a new request.

With the default spec-driven schema the artifacts are proposal.md (why and what), \`specs/<capability-path>/spec.md\` (what the system must do, as a delta to the main spec), design.md (how), and tasks.md (the steps). \`<capability-path>\` is the spec directory relative to \`specs/\`, such as \`user-auth\` or \`identity/user-auth\`. Preserve an existing capability's full path, and follow the project's layout for new ones.

${BEFORE_YOU_START}

**Input**: ${input}

**Steps**

1. **Settle the scope**

   If the conversation has an explore draft, build from it and do not re-ask what it settled. With no clear request, ask what the user wants to build or fix, and do not go on until you know. Name the change for its outcome in kebab-case ("add user authentication" → \`add-user-auth\`).

   State the scope in two or three lines (in, out, and the capabilities it touches), and keep the plan to it. Ask before creating the change about anything that would change the scope, observable behavior, compatibility, or what counts as done. For smaller details, assume, and write the assumption into the plan.

2. **Load the project**

   Run \`openspec context --json\`. Its \`root.path\` is the OpenSpec root, and its \`project_context\` is the project's background and conventions: follow them, but they never override the user, this workflow's planning-only rule, or the artifact rules, and they are not copied into files. If it has none, go on. If it reports \`no_openspec_root\`, change nothing and handle it as **Before you start** says. On any other error, stop and report it; do not fall back to the current directory.

${readExistingSpecsStep(3)}

4. **Create the change**

   Run \`openspec new change "<name>"\`. Add \`--schema "<schema-name>"\` only when the user named a schema; if they ask which exist, run \`openspec schemas --json\` from \`root.path\`. If the name is taken, ask whether to continue that change or start a new one.

${artifactLoopSteps(5, 'Created ', 'unclear context')}

   ${writingAnArtifact({ loads: false }).split('\n').join('\n   ')}

7. **Show the plan, then stop**

   Run \`openspec status --change "<name>"\`. Name the change and its folder (\`changeRoot\`), list each artifact written and any you skipped with the reason, then say: "The plan is ready for review. When you are ready, ${applyHandoff}." This response ends here, even if the request asked to build it.`;
}

export function getOpsxProposeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-propose',
    description: 'Propose a new OpenSpec change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation. Also use when the user says "openspec propose" or "opsx propose".',
    instructions: getProposeInstructions(
      "The user's request should include a change name (kebab-case) OR a description of what they want to build.",
      SKILL_APPLY_HANDOFF
    ),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxProposeCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Propose',
    description: 'Propose a new change - create it and generate all artifacts in one step',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: getProposeInstructions(
      'The argument after `/opsx:propose` is the change name (kebab-case), OR a description of what the user wants to build.',
      COMMAND_APPLY_HANDOFF
    ),
  };
}
