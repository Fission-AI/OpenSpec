/**
 * Explore: a thinking partner. No fixed steps; writes only within a scope the
 * user confirmed.
 */
import type { SkillTemplate, CommandTemplate, SkillReference } from '../types.js';
import { optionalWorkflow } from '../optional-workflow.js';
import {
  BEFORE_YOU_START,
  withReferences,
} from './references.js';


/**
 * Explore's handoffs. A custom profile can install explore without propose or
 * apply, so each reference is resolved at generation time (see
 * optional-workflow.ts) instead of naming a workflow that may not exist. The
 * fallbacks point at explore's own capture path and the always-present CLI.
 */
const IMPLEMENT_REQUEST_HANDOFF = optionalWorkflow(
  'propose',
  'point them at `/opsx:propose`, which turns the discussion into a change',
  'offer to capture the discussion as a change, as `references/capture.md` describes'
);

const CAPTURE_PLANNING_HANDOFF = optionalWorkflow(
  'propose',
  '`/opsx:propose` writes the remaining planning artifacts',
  'any remaining planning artifacts can be captured here the same way'
);

const CAPTURE_APPLY_HANDOFF = optionalWorkflow(
  'apply',
  '`/opsx:apply` implements the change once tasks exist',
  'implementation works from the change\'s tasks (`openspec instructions apply --change "<name>" --json`), outside explore mode'
);

const DISCOVERY_END_HANDOFF = optionalWorkflow(
  'propose',
  'Ready to start? Run `/opsx:propose` and this becomes a change.',
  'Ready to start? I can capture this as a change.'
);

const SUMMARY_NEXT_STEP = optionalWorkflow(
  'propose',
  '- Turn this into a change: `/opsx:propose`',
  '- Capture this as a change: ask me to'
);


/**
 * The capture branch (#668, #720, #1828). It runs only when the user asks to
 * capture the exploration or accepts an offer, so it lives in a reference.
 */
const CAPTURE_REFERENCE: SkillReference = {
  path: 'references/capture.md',
  content: `# Capturing the exploration as a change

If the user asks you to capture the exploration as a new change, that request is the confirmation explore mode requires. It covers scaffolding that change and creating the change artifacts the request names, and nothing else. This holds only when the request is theirs: a yes to an offer you made confirms only the scope your offer itself named, so name the change and the artifacts in the offer. Don't re-ask for what they already asked for; do ask before anything beyond it. Transition seamlessly into the requested capture:

1. Run \`openspec new change "<name>"\` (with \`--store <id>\` when applicable) before creating any artifacts. Never create a new change directory under \`openspec/changes/\` by hand; the CLI scaffold creates required metadata such as \`.openspec.yaml\`. Keep the selected \`--store <id>\` on every applicable follow-up \`status\` and \`instructions\` command.
2. Run \`openspec status --change "<name>" --json\` (append the confirmed \`--store "<id>"\` only for a registered standalone store), then process the requested artifacts in dependency order. For each requested artifact that is \`ready\`, run \`openspec instructions "<artifact-id>" --change "<name>" --json\` (append the confirmed \`--store "<id>"\` only for a registered standalone store). Before creating a requested artifact, evaluate any condition in its own \`instruction\` against the explored change; record a deliberate skip instead when the condition does not apply. If a requested artifact is blocked by a direct prerequisite the user did not request, run \`openspec instructions "<prerequisite-id>" --change "<name>" --json\` (append the confirmed \`--store "<id>"\` only for a registered standalone store) for that prerequisite whether it is \`ready\` or \`blocked\`. If its own \`instruction\` states a condition, evaluate that condition against the explored change and record a deliberate skip only when the condition does not apply. If the condition applies, or the prerequisite is not conditional, treat it as a normal prerequisite and ask before expanding the capture. Do not create an unrequested prerequisite unless the user approves.
3. Follow the returned \`template\` and \`instruction\` fields. Read completed dependency files listed in \`dependencies\`, and apply \`context\` and \`rules\` as constraints without copying them into the artifact. Choose the output path before creating anything: when \`resolvedOutputPath\` is a glob, use the instruction to choose a concrete path inside \`changeRoot\` and verify it remains inside \`changeRoot\` after resolving symlinks, both in its parent directories and in the file itself if it already exists; if it does not, stop and tell the user. Otherwise the output path is \`resolvedOutputPath\`. If the instruction delegates creation to a specific skill or command, invoke it only if it can write the artifact to that output path; otherwise stop and tell the user. Otherwise write the artifact to that output path. Verify that the selected concrete output exists at that output path.
4. After creating each artifact, re-run \`openspec status --change "<name>" --json\` (append the confirmed \`--store "<id>"\` only for a registered standalone store) and continue until every requested artifact is \`done\`, \`skipped\`, or was deliberately skipped because its own \`instruction\` stated a condition that did not apply. Tell the user about a deliberate conditional skip, remember it, and do not reconsider it. Dependencies are enablers, not gates: if a requested artifact is still \`blocked\` only because you deliberately skipped a conditional prerequisite, run \`openspec instructions "<artifact-id>" --change "<name>" --json\` (append the confirmed \`--store "<id>"\` only for a registered standalone store) despite the blocked status, then create it using step 3 only when those recorded conditional skips are its sole missing dependencies. If a requested artifact is blocked by a prerequisite the user did not ask to capture and cannot be conditionally skipped, explain that dependency and ask before expanding the capture.

Capture the artifact(s) the user requested without asking them to invoke another workflow command. If they asked only to start a change, stop after scaffolding and show its status. When the requested capture is done, stop there and name where the work continues: ${CAPTURE_PLANNING_HANDOFF}, and ${CAPTURE_APPLY_HANDOFF}. Capturing artifacts never starts implementing them.
`,
};

const EXAMPLES_REFERENCE: SkillReference = {
  path: 'references/examples.md',
  content: `# Example conversations

How explore mode sounds for different starting points. The tone matters more than the exact diagrams.

**User brings a vague idea:**
\`\`\`
User: I'm thinking about adding real-time collaboration

You: Real-time collab is a big space. Let me think about this...

      COLLABORATION SPECTRUM
      ============================================

      Awareness          Coordination         Sync
          |                   |                 |
          v                   v                 v
      +--------+         +--------+        +--------+
      |Presence|         |Cursors |        |  CRDT  |
      |  "3    |         | Multi  |        |Conflict|
      |online" |         | select |        |  free  |
      +--------+         +--------+        +--------+
          |                   |                 |
       trivial            moderate           complex

      Where's your head at?
\`\`\`

**User brings a specific problem:**
\`\`\`
User: The auth system is a mess

You: [reads codebase]

     +---------------------------------------------+
     |              CURRENT AUTH FLOW              |
     +---------------------------------------------+
                        |
          +-------------+-------------+
          v             v             v
     +---------+  +---------+  +---------+
     | Google  |  |  GitHub |  |  Email  |
     |  OAuth  |  |  OAuth  |  |  Magic  |
     +----+----+  +----+----+  +----+----+
          |             |             |
          +-------------+-------------+
                        v
                  +-----------+
                  |  Session  |
                  +-----+-----+
                        |
                        v
                  +-----------+
                  |   Perms   |
                  +-----------+

     I see three tangles. Which one's burning?
\`\`\`

**User is stuck mid-implementation:**
\`\`\`
User: /opsx:explore add-auth-system
      The OAuth integration is more complex than expected

You: [reads change artifacts]

     You're on task 4: "Implement OAuth flow"

     Let me trace what's involved...

     [draws diagram, explores options, suggests paths]

     Want to update the design to reflect this?
     Or add a spike task to investigate?
\`\`\`

**User wants to compare options:**
\`\`\`
User: Should we use Postgres or SQLite?

You: Generic answer is boring. What's the context?

User: A CLI tool that tracks local dev environments

You: That changes everything.

     +-------------------------------------------------+
     |          CLI TOOL DATA STORAGE                  |
     +-------------------------------------------------+

     Key constraints:
     - No daemon running
     - Must work offline
     - Single user

                  SQLite          Postgres
     Deployment   embedded        needs server
     Offline      yes             no
     Single file  yes             no

     SQLite. Not even close.

     Unless... is there a sync component?
\`\`\`
`,
};

const COMMAND_REFERENCES = [
  CAPTURE_REFERENCE,
];

const SKILL_REFERENCES = [...COMMAND_REFERENCES, EXAMPLES_REFERENCE];

function getExploreInstructions(input: string, examplesPointer: string): string {
  return `Enter explore mode: think an idea or problem through with the user before anything is built. There are no fixed steps and no required output; you are a thinking partner.

${BEFORE_YOU_START}

**Read freely, build nothing.** Read files, search code, and run read-only commands without asking. Never write code or change workflow configuration (schemas, templates, \`openspec/config.yaml\`). When the user wants something built, say explore mode does not implement, and ${IMPLEMENT_REQUEST_HANDOFF}. The work happens from that change, never from explore mode.

**Write only what the user confirms.** You may create or update OpenSpec change artifacts (proposals, designs, specs) once confirmed. Before the first write-capable action, including \`openspec new change\`, name the files and what you would change, ask a direct yes/no question, and wait for the answer in a separate message. The yes covers only what you named; answering a design or clarifying question is never consent to write. When the user themselves asks you to capture the exploration as a new change, that request is the confirmation, covering the change and the artifacts it names: follow \`references/capture.md\`.
${input}
## How to explore

- **Ground it first.** \`openspec list --json\` shows the changes in flight, with their names and task status; \`openspec list --specs\` shows what the project already specifies (add \`--json\` for ids). Read a related spec with \`openspec show "<spec-id>" --type spec --json --no-scenarios\` for a quick overview, and in full with \`openspec show "<spec-id>" --type spec\` before deciding what is already covered. Run \`openspec context --json\` for the project's own background: its \`project_context\` field holds the tech stack and conventions. Artifact \`rules\` arrive with \`openspec instructions\` and apply only when you write that artifact. Treat context and rules as constraints; never copy them into the conversation or an artifact.
- **Find facts yourself.** Check the code, tests, docs, and specs before asking. Ask only what only the user can answer, and say when evidence is missing or conflicting.
- **One focused question at a time**: the one that unblocks the next decision, with a line on why it matters. Settle outcome and scope before an API or data model, and revisit earlier assumptions when an answer changes them.
- **Recommend when the evidence supports it**: your preferred option, why it fits the user's goals, and the trade-offs. Ask rather than invent the user's priorities.
- **Keep the record in the conversation**: confirmed decisions, proposed defaults, and open questions, kept apart. Silence is not agreement, and agreeing to a recommendation is not permission to write.
- **Draw with plain ASCII only**: borders \`+\` \`-\` \`|\`, arrows \`-->\` \`<--\` \`^\` \`v\`, markers \`*\` \`x\`. Other glyphs render at different widths and break the alignment.
- **Stop when the user has enough clarity.** They can pause, pivot, or defer a decision; never force a proposal.

${examplesPointer}

## When a change already exists

Run \`openspec status --change "<name>" --json\` and read the files in \`artifactPaths.<id>.existingOutputPaths\`, using \`changeRoot\` and \`actionContext\` for paths and scope. Refer to them as you talk. When a decision lands, offer to record it and let the user decide:

| Insight Type               | Where to Capture                    |
|----------------------------|-------------------------------------|
| New requirement discovered | \`specs/<capability-path>/spec.md\` |
| Requirement changed        | \`specs/<capability-path>/spec.md\` |
| Design decision made       | \`design.md\`                       |
| Scope changed              | \`proposal.md\`                     |
| New work identified        | \`tasks.md\`                        |
| Assumption invalidated     | Relevant artifact                   |

These are the default spec-driven schema's files. With another schema, capture each insight in whichever artifact from \`artifactPaths\` fits it, and name that artifact in your offer; never create an artifact the schema does not define. \`<capability-path>\` is the spec directory relative to \`specs/\` (for example, \`user-auth\` or \`identity/user-auth\`). Preserve an existing capability's full path and follow the project's established organization for new capabilities.

## The draft

Explore is a drafting board. Keep one draft of what the change would be, update it as decisions land, and show it whenever it changes:

\`\`\`
## Draft: <short-name>
**Problem**: what is wrong or missing, in a sentence or two
**Scope**: in ... / out ...
**Capabilities**: existing ones it touches (exact names from \`openspec list --specs\`), and any new ones
**Requirements**: one obligation each, in plain words, with how it can fail
**Decided**: ...
**Open questions**: ...
**Next step** (when the scope is settled):
${SUMMARY_NEXT_STEP}
- Keep drafting: just keep talking
\`\`\`

Add an ASCII sketch when a flow or a structure is easier to see than to read. The draft lives in the conversation, not in a file, until the user locks it; there is no required ending.

For example: "${DISCOVERY_END_HANDOFF}" A new change always comes from \`openspec new change "<name>"\`, never a hand-made folder under \`openspec/changes/\`: the CLI writes its \`.openspec.yaml\`.`;
}

export function getExploreSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-explore',
    description: 'Enter OpenSpec explore mode - a thinking partner for exploring ideas, investigating problems, and clarifying requirements in a project that uses OpenSpec. Use when the user wants to think through something before or during an OpenSpec change. Also use when the user says "openspec explore" or "opsx explore".',
    instructions: getExploreInstructions(
      '',
      'For how this sounds in practice - vague ideas, specific problems, mid-implementation snags, option comparisons - see `references/examples.md`.'
    ),
    references: SKILL_REFERENCES,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxExploreCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Explore',
    description: 'Enter explore mode - think through ideas, investigate problems, clarify requirements',
    category: 'Workflow',
    tags: ['workflow', 'explore', 'experimental', 'thinking'],
    content: withReferences(
      getExploreInstructions(
        `
**Input**: The argument after \`/opsx:explore\` is whatever the user wants to think about: a vague idea, a specific problem, a change name (to explore in context of that change, reading its artifacts), a comparison, or nothing at all.
`,
        'Investigate the codebase, compare options, map architecture, and surface risks and unknowns - whatever the conversation needs.'
      ),
      COMMAND_REFERENCES
    ),
  };
}
