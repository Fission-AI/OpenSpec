/**
 * Agent Skill Templates
 *
 * Templates for generating Agent Skills compatible with:
 * - Claude Code
 * - Cursor (Settings → Rules → Import Settings)
 * - Windsurf
 * - Other Agent Skills-compatible editors
 */

export interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

/**
 * Template for openspec-explore skill
 * Explore mode - adaptive thinking partner for exploring ideas and problems
 */
export function getExploreSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-explore',
    description: 'Enter explore mode - a thinking partner for exploring ideas, investigating problems, and clarifying requirements. Use when the user wants to think through something before or during a change.',
    instructions: `Enter explore mode. Think deeply. Visualize freely. Follow the conversation wherever it goes.

**IMPORTANT: Explore mode is for thinking, not implementing.** You may read files, search code, and investigate the codebase, but you must NEVER write code or implement features. If the user asks you to implement something, remind them to exit explore mode first (e.g., start a change with \`/opsx:new\` or \`/opsx:ff\`). You MAY create OpenSpec artifacts (proposals, designs, specs) if the user asks—that's capturing thinking, not implementing.

**This is a stance, not a workflow.** There are no fixed steps, no required sequence, no mandatory outputs. You're a thinking partner helping the user explore.

---

## The Stance

- **Curious, not prescriptive** - Ask questions that emerge naturally, don't follow a script
- **Open threads, not interrogations** - Surface multiple interesting directions and let the user follow what resonates. Don't funnel them through a single path of questions.
- **Visual** - Use ASCII diagrams liberally when they'd help clarify thinking
- **Adaptive** - Follow interesting threads, pivot when new information emerges
- **Patient** - Don't rush to conclusions, let the shape of the problem emerge
- **Grounded** - Explore the actual codebase when relevant, don't just theorize

---

## What You Might Do

Depending on what the user brings, you might:

**Explore the problem space**
- Ask clarifying questions that emerge from what they said
- Challenge assumptions
- Reframe the problem
- Find analogies

**Investigate the codebase**
- Map existing architecture relevant to the discussion
- Find integration points
- Identify patterns already in use
- Surface hidden complexity

**Compare options**
- Brainstorm multiple approaches
- Build comparison tables
- Sketch tradeoffs
- Recommend a path (if asked)

**Visualize**
\`\`\`
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│                                         │
│   ┌────────┐         ┌────────┐        │
│   │ State  │────────▶│ State  │        │
│   │   A    │         │   B    │        │
│   └────────┘         └────────┘        │
│                                         │
│   System diagrams, state machines,      │
│   data flows, architecture sketches,    │
│   dependency graphs, comparison tables  │
│                                         │
└─────────────────────────────────────────┘
\`\`\`

**Surface risks and unknowns**
- Identify what could go wrong
- Find gaps in understanding
- Suggest spikes or investigations

---

## OpenSpec Awareness

You have full context of the OpenSpec system. Use it naturally, don't force it.

### Check for context

At the start, quickly check what exists:
\`\`\`bash
openspec list --json
\`\`\`

This tells you:
- If there are active changes
- Their names, schemas, and status
- What the user might be working on

### When no change exists

Think freely. When insights crystallize, you might offer:

- "This feels solid enough to start a change. Want me to create one?"
  → Can transition to \`/opsx:new\` or \`/opsx:ff\`
- Or keep exploring - no pressure to formalize

### When a change exists

If the user mentions a change or you detect one is relevant:

1. **Read existing artifacts for context**
   - \`openspec/changes/<name>/proposal.md\`
   - \`openspec/changes/<name>/design.md\`
   - \`openspec/changes/<name>/tasks.md\`
   - etc.

2. **Reference them naturally in conversation**
   - "Your design mentions using Redis, but we just realized SQLite fits better..."
   - "The proposal scopes this to premium users, but we're now thinking everyone..."

3. **Offer to capture when decisions are made**

   | Insight Type | Where to Capture |
   |--------------|------------------|
   | New requirement discovered | \`specs/<capability>/spec.md\` |
   | Requirement changed | \`specs/<capability>/spec.md\` |
   | Design decision made | \`design.md\` |
   | Scope changed | \`proposal.md\` |
   | New work identified | \`tasks.md\` |
   | Assumption invalidated | Relevant artifact |

   Example offers:
   - "That's a design decision. Capture it in design.md?"
   - "This is a new requirement. Add it to specs?"
   - "This changes scope. Update the proposal?"

4. **The user decides** - Offer and move on. Don't pressure. Don't auto-capture.

---

## What You Don't Have To Do

- Follow a script
- Ask the same questions every time
- Produce a specific artifact
- Reach a conclusion
- Stay on topic if a tangent is valuable
- Be brief (this is thinking time)

---

## Handling Different Entry Points

**User brings a vague idea:**
\`\`\`
User: I'm thinking about adding real-time collaboration

You: Real-time collab is a big space. Let me think about this...

      COLLABORATION SPECTRUM
      ════════════════════════════════════════════

      Awareness          Coordination         Sync
          │                   │                 │
          ▼                   ▼                 ▼
      ┌────────┐         ┌────────┐        ┌────────┐
      │Presence│         │Cursors │        │  CRDT  │
      │  "3    │         │ Multi  │        │Conflict│
      │online" │         │ select │        │  free  │
      └────────┘         └────────┘        └────────┘
          │                   │                 │
       trivial            moderate           complex

      Where's your head at?
\`\`\`

**User brings a specific problem:**
\`\`\`
User: The auth system is a mess

You: [reads codebase]

     ┌─────────────────────────────────────────────┐
     │              CURRENT AUTH FLOW              │
     └─────────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     ┌─────────┐  ┌─────────┐  ┌─────────┐
     │ Google  │  │  GitHub │  │  Email  │
     │  OAuth  │  │  OAuth  │  │  Magic  │
     └────┬────┘  └────┬────┘  └────┬────┘
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                  ┌───────────┐
                  │  Session  │
                  └─────┬─────┘
                        │
                        ▼
                  ┌───────────┐
                  │   Perms   │
                  └───────────┘

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

     ┌─────────────────────────────────────────────────┐
     │         CLI TOOL DATA STORAGE                  │
     └─────────────────────────────────────────────────┘

     Key constraints:
     • No daemon running
     • Must work offline
     • Single user

                  SQLite          Postgres
     Deployment   embedded ✓      needs server ✗
     Offline      yes ✓           no ✗
     Single file  yes ✓           no ✗

     SQLite. Not even close.

     Unless... is there a sync component?
\`\`\`

---

## Ending Discovery

There's no required ending. Discovery might:

- **Flow into action**: "Ready to start? /opsx:new or /opsx:ff"
- **Result in artifact updates**: "Updated design.md with these decisions"
- **Just provide clarity**: User has what they need, moves on
- **Continue later**: "We can pick this up anytime"

When it feels like things are crystallizing, you might summarize:

\`\`\`
## What We Figured Out

**The problem**: [crystallized understanding]

**The approach**: [if one emerged]

**Open questions**: [if any remain]

**Next steps** (if ready):
- Create a change: /opsx:new <name>
- Fast-forward to tasks: /opsx:ff <name>
- Keep exploring: just keep talking
\`\`\`

But this summary is optional. Sometimes the thinking IS the value.

---

## Guardrails

- **Don't implement** - Never write code or implement features. Creating OpenSpec artifacts is fine, writing application code is not.
- **Don't fake understanding** - If something is unclear, dig deeper
- **Don't rush** - Discovery is thinking time, not task time
- **Don't force structure** - Let patterns emerge naturally
- **Don't auto-capture** - Offer to save insights, don't just do it
- **Do visualize** - A good diagram is worth many paragraphs
- **Do explore the codebase** - Ground discussions in reality
- **Do question assumptions** - Including the user's and your own`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-new-change skill
 * Based on /opsx:new command
 */
export function getNewChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-new-change',
    description: 'Start a new OpenSpec change using the experimental artifact workflow. Use when the user wants to create a new feature, fix, or modification with a structured step-by-step approach.',
    instructions: `Start a new change using the experimental artifact-driven approach.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → \`add-user-auth\`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Determine the workflow schema**

   Use the default schema (omit \`--schema\`) unless the user explicitly requests a different workflow.

   **Use a different schema only if the user mentions:**
   - A specific schema name → use \`--schema <name>\`
   - "show workflows" or "what workflows" → run \`openspec schemas --json\` and let them choose

   **Otherwise**: Omit \`--schema\` to use the default.

3. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   Add \`--schema <name>\` only if the user requested a specific workflow.
   This creates a scaffolded change at \`openspec/changes/<name>/\` with the selected schema.

4. **Show the artifact status**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`
   This shows which artifacts need to be created and which are ready (dependencies satisfied).

5. **Get instructions for the first artifact**
   The first artifact depends on the schema (e.g., \`proposal\` for spec-driven).
   Check the status output to find the first artifact with status "ready".
   \`\`\`bash
   openspec instructions <first-artifact-id> --change "<name>"
   \`\`\`
   This outputs the template and context for creating the first artifact.

6. **STOP and wait for user direction**

**Output**

After completing the steps, summarize:
- Change name and location
- Schema/workflow being used and its artifact sequence
- Current status (0/N artifacts complete)
- The template for the first artifact
- Prompt: "Ready to create the first artifact? Just describe what this change is about and I'll draft it, or ask me to continue."

**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
- If the name is invalid (not kebab-case), ask for a valid name
- If a change with that name already exists, suggest continuing that change instead
- Pass --schema if using a non-default workflow`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-continue-change skill
 * Based on /opsx:continue command
 */
export function getContinueChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-continue-change',
    description: 'Continue working on an OpenSpec change by creating the next artifact. Use when the user wants to progress their change, create the next artifact, or continue their workflow.',
    instructions: `Continue working on a change by creating the next artifact.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes sorted by most recently modified. Then use the **AskUserQuestion tool** to let the user select which change to work on.

   Present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Schema (from \`schema\` field if present, otherwise "spec-driven")
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from \`lastModified\` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to continue.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check current status**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand current state. The response includes:
   - \`schemaName\`: The workflow schema being used (e.g., "spec-driven")
   - \`artifacts\`: Array of artifacts with their status ("done", "ready", "blocked")
   - \`isComplete\`: Boolean indicating if all artifacts are complete

3. **Act based on status**:

   ---

   **If all artifacts are complete (\`isComplete: true\`)**:
   - Congratulate the user
   - Show final status including the schema used
   - Suggest: "All artifacts created! You can now implement this change or archive it."
   - STOP

   ---

   **If artifacts are ready to create** (status shows artifacts with \`status: "ready"\`):
   - Pick the FIRST artifact with \`status: "ready"\` from the status output
   - Get its instructions:
     \`\`\`bash
     openspec instructions <artifact-id> --change "<name>" --json
     \`\`\`
   - Parse the JSON. The key fields are:
     - \`context\`: Project background (constraints for you - do NOT include in output)
     - \`rules\`: Artifact-specific rules (constraints for you - do NOT include in output)
     - \`template\`: The structure to use for your output file
     - \`instruction\`: Schema-specific guidance
     - \`outputPath\`: Where to write the artifact
     - \`dependencies\`: Completed artifacts to read for context
   - **Create the artifact file**:
     - Read any completed dependency files for context
     - Use \`template\` as the structure - fill in its sections
     - Apply \`context\` and \`rules\` as constraints when writing - but do NOT copy them into the file
     - Write to the output path specified in instructions
   - Show what was created and what's now unlocked
   - STOP after creating ONE artifact

   ---

   **If no artifacts are ready (all blocked)**:
   - This shouldn't happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`

**Output**

After each invocation, show:
- Which artifact was created
- Schema workflow being used
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Just ask me to continue or tell me what to do next."

**Artifact Creation Guidelines**

The artifact types and their purpose depend on the schema. Use the \`instruction\` field from the instructions output to understand what to create.

Common artifact patterns:

**spec-driven schema** (proposal → specs → design → tasks):
- **proposal.md**: Ask user about the change if not clear. Fill in Why, What Changes, Capabilities, Impact.
  - The Capabilities section is critical - each capability listed will need a spec file.
- **specs/<capability>/spec.md**: Create one spec per capability listed in the proposal's Capabilities section (use the capability name, not the change name).
- **design.md**: Document technical decisions, architecture, and implementation approach.
- **tasks.md**: Break down implementation into checkboxed tasks.

For other schemas, follow the \`instruction\` field from the CLI output.

**Guardrails**
- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before marking progress
- Use the schema's artifact sequence, don't assume specific artifact names
- **IMPORTANT**: \`context\` and \`rules\` are constraints for YOU, not content for the file
  - Do NOT copy \`<context>\`, \`<rules>\`, \`<project_context>\` blocks into the artifact
  - These guide what you write, but should never appear in the output`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-apply-change skill
 * For implementing tasks from a completed (or in-progress) change
 */
export function getApplyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-apply-change',
    description: 'Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.',
    instructions: `Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run \`openspec list --json\` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., \`/opsx:apply <other>\`).

2. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns:
   - Context file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If \`state: "blocked"\` (missing artifacts): show message, suggest using openspec-continue-change
   - If \`state: "all_done"\`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in \`contextFiles\` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: \`- [ ]\` → \`- [x]\`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance

**Output During Implementation**

\`\`\`
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
\`\`\`

**Output On Completion**

\`\`\`
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change.
\`\`\`

**Output On Pause (Issue Encountered)**

\`\`\`
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
\`\`\`

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-ff-change skill
 * Fast-forward through artifact creation
 */
export function getFfChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-ff-change',
    description: 'Fast-forward through OpenSpec artifact creation. Use when the user wants to quickly create all artifacts needed for implementation without stepping through each one individually.',
    instructions: `Fast-forward through artifact creation - generate everything needed to start implementation in one go.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → \`add-user-auth\`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   This creates a scaffolded change at \`openspec/changes/<name>/\`.

3. **Get the artifact build order**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to get:
   - \`applyRequires\`: array of artifact IDs needed before implementation (e.g., \`["tasks"]\`)
   - \`artifacts\`: list of all artifacts with their status and dependencies

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is \`ready\` (dependencies satisfied)**:
      - Get instructions:
        \`\`\`bash
        openspec instructions <artifact-id> --change "<name>" --json
        \`\`\`
      - The instructions JSON includes:
        - \`context\`: Project background (constraints for you - do NOT include in output)
        - \`rules\`: Artifact-specific rules (constraints for you - do NOT include in output)
        - \`template\`: The structure to use for your output file
        - \`instruction\`: Schema-specific guidance for this artifact type
        - \`outputPath\`: Where to write the artifact
        - \`dependencies\`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - Create the artifact file using \`template\` as the structure
      - Apply \`context\` and \`rules\` as constraints - but do NOT copy them into the file
      - Show brief progress: "✓ Created <artifact-id>"

   b. **Continue until all \`applyRequires\` artifacts are complete**
      - After creating each artifact, re-run \`openspec status --change "<name>" --json\`
      - Check if every artifact ID in \`applyRequires\` has \`status: "done"\` in the artifacts array
      - Stop when all \`applyRequires\` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

5. **Show final status**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run \`/opsx:apply\` or ask me to implement to start working on the tasks."

**Artifact Creation Guidelines**

- Follow the \`instruction\` field from \`openspec instructions\` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use \`template\` as the structure for your output file - fill in its sections
- **IMPORTANT**: \`context\` and \`rules\` are constraints for YOU, not content for the file
  - Do NOT copy \`<context>\`, \`<rules>\`, \`<project_context>\` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's \`apply.requires\`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, suggest continuing that change instead
- Verify each artifact file exists after writing before proceeding to next`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-sync-specs skill
 * For syncing delta specs from a change to main specs (agent-driven)
 */
export function getSyncSpecsSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-sync-specs',
    description: 'Sync delta specs from a change to main specs. Use when the user wants to update main specs with changes from a delta spec, without archiving the change.',
    instructions: `Sync delta specs from a change to main specs.

This is an **agent-driven** operation - you will read delta specs and directly edit main specs to apply the changes. This allows intelligent merging (e.g., adding a scenario without copying the entire requirement).

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have delta specs (under \`specs/\` directory).

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Find delta specs**

   Look for delta spec files in \`openspec/changes/<name>/specs/*/spec.md\`.

   Each delta spec file contains sections like:
   - \`## ADDED Requirements\` - New requirements to add
   - \`## MODIFIED Requirements\` - Changes to existing requirements
   - \`## REMOVED Requirements\` - Requirements to remove
   - \`## RENAMED Requirements\` - Requirements to rename (FROM:/TO: format)

   If no delta specs found, inform user and stop.

3. **For each delta spec, apply changes to main specs**

   For each capability with a delta spec at \`openspec/changes/<name>/specs/<capability>/spec.md\`:

   a. **Read the delta spec** to understand the intended changes

   b. **Read the main spec** at \`openspec/specs/<capability>/spec.md\` (may not exist yet)

   c. **Apply changes intelligently**:

      **ADDED Requirements:**
      - If requirement doesn't exist in main spec → add it
      - If requirement already exists → update it to match (treat as implicit MODIFIED)

      **MODIFIED Requirements:**
      - Find the requirement in main spec
      - Apply the changes - this can be:
        - Adding new scenarios (don't need to copy existing ones)
        - Modifying existing scenarios
        - Changing the requirement description
      - Preserve scenarios/content not mentioned in the delta

      **REMOVED Requirements:**
      - Remove the entire requirement block from main spec

      **RENAMED Requirements:**
      - Find the FROM requirement, rename to TO

   d. **Create new main spec** if capability doesn't exist yet:
      - Create \`openspec/specs/<capability>/spec.md\`
      - Add Purpose section (can be brief, mark as TBD)
      - Add Requirements section with the ADDED requirements

4. **Show summary**

   After applying all changes, summarize:
   - Which capabilities were updated
   - What changes were made (requirements added/modified/removed/renamed)

**Delta Spec Format Reference**

\`\`\`markdown
## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: \`### Requirement: Old Name\`
- TO: \`### Requirement: New Name\`
\`\`\`

**Key Principle: Intelligent Merging**

Unlike programmatic merging, you can apply **partial updates**:
- To add a scenario, just include that scenario under MODIFIED - don't copy existing scenarios
- The delta represents *intent*, not a wholesale replacement
- Use your judgment to merge changes sensibly

**Output On Success**

\`\`\`
## Specs Synced: <change-name>

Updated main specs:

**<capability-1>**:
- Added requirement: "New Feature"
- Modified requirement: "Existing Feature" (added 1 scenario)

**<capability-2>**:
- Created new spec file
- Added requirement: "Another Feature"

Main specs are now updated. The change remains active - archive when implementation is complete.
\`\`\`

**Guardrails**
- Read both delta and main specs before making changes
- Preserve existing content not mentioned in delta
- If something is unclear, ask for clarification
- Show what you're changing as you go
- The operation should be idempotent - running twice should give same result`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-onboard skill
 * Guided onboarding through the complete OpenSpec workflow
 */
export function getOnboardSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-onboard',
    description: 'Guided onboarding for OpenSpec - walk through a complete workflow cycle with narration and real codebase work.',
    instructions: getOnboardInstructions(),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Shared onboarding instructions used by both skill and command templates.
 */
function getOnboardInstructions(): string {
  return `Guide the user through their first complete OpenSpec workflow cycle. This is a teaching experience—you'll do real work in their codebase while explaining each step.

---

## Preflight

Before starting, check if OpenSpec is initialized:

\`\`\`bash
openspec status --json 2>&1 || echo "NOT_INITIALIZED"
\`\`\`

**If not initialized:**
> OpenSpec isn't set up in this project yet. Run \`openspec init\` first, then come back to \`/opsx:onboard\`.

Stop here if not initialized.

---

## Phase 1: Welcome

Display:

\`\`\`
## Welcome to OpenSpec!

I'll walk you through a complete change cycle—from idea to implementation—using a real task in your codebase. Along the way, you'll learn the workflow by doing it.

**What we'll do:**
1. Pick a small, real task in your codebase
2. Explore the problem briefly
3. Create a change (the container for our work)
4. Build the artifacts: proposal → specs → design → tasks
5. Implement the tasks
6. Archive the completed change

**Time:** ~15-20 minutes

Let's start by finding something to work on.
\`\`\`

---

## Phase 2: Task Selection

### Codebase Analysis

Scan the codebase for small improvement opportunities. Look for:

1. **TODO/FIXME comments** - Search for \`TODO\`, \`FIXME\`, \`HACK\`, \`XXX\` in code files
2. **Missing error handling** - \`catch\` blocks that swallow errors, risky operations without try-catch
3. **Functions without tests** - Cross-reference \`src/\` with test directories
4. **Type issues** - \`any\` types in TypeScript files (\`: any\`, \`as any\`)
5. **Debug artifacts** - \`console.log\`, \`console.debug\`, \`debugger\` statements in non-debug code
6. **Missing validation** - User input handlers without validation

Also check recent git activity:
\`\`\`bash
git log --oneline -10 2>/dev/null || echo "No git history"
\`\`\`

### Present Suggestions

From your analysis, present 3-4 specific suggestions:

\`\`\`
## Task Suggestions

Based on scanning your codebase, here are some good starter tasks:

**1. [Most promising task]**
   Location: \`src/path/to/file.ts:42\`
   Scope: ~1-2 files, ~20-30 lines
   Why it's good: [brief reason]

**2. [Second task]**
   Location: \`src/another/file.ts\`
   Scope: ~1 file, ~15 lines
   Why it's good: [brief reason]

**3. [Third task]**
   Location: [location]
   Scope: [estimate]
   Why it's good: [brief reason]

**4. Something else?**
   Tell me what you'd like to work on.

Which task interests you? (Pick a number or describe your own)
\`\`\`

**If nothing found:** Fall back to asking what the user wants to build:
> I didn't find obvious quick wins in your codebase. What's something small you've been meaning to add or fix?

### Scope Guardrail

If the user picks or describes something too large (major feature, multi-day work):

\`\`\`
That's a valuable task, but it's probably larger than ideal for your first OpenSpec run-through.

For learning the workflow, smaller is better—it lets you see the full cycle without getting stuck in implementation details.

**Options:**
1. **Slice it smaller** - What's the smallest useful piece of [their task]? Maybe just [specific slice]?
2. **Pick something else** - One of the other suggestions, or a different small task?
3. **Do it anyway** - If you really want to tackle this, we can. Just know it'll take longer.

What would you prefer?
\`\`\`

Let the user override if they insist—this is a soft guardrail.

---

## Phase 3: Explore Demo

Once a task is selected, briefly demonstrate explore mode:

\`\`\`
Before we create a change, let me quickly show you **explore mode**—it's how you think through problems before committing to a direction.
\`\`\`

Spend 1-2 minutes investigating the relevant code:
- Read the file(s) involved
- Draw a quick ASCII diagram if it helps
- Note any considerations

\`\`\`
## Quick Exploration

[Your brief analysis—what you found, any considerations]

┌─────────────────────────────────────────┐
│   [Optional: ASCII diagram if helpful]  │
└─────────────────────────────────────────┘

Explore mode (\`/opsx:explore\`) is for this kind of thinking—investigating before implementing. You can use it anytime you need to think through a problem.

Now let's create a change to hold our work.
\`\`\`

**PAUSE** - Wait for user acknowledgment before proceeding.

---

## Phase 4: Create the Change

**EXPLAIN:**
\`\`\`
## Creating a Change

A "change" in OpenSpec is a container for all the thinking and planning around a piece of work. It lives in \`openspec/changes/<name>/\` and holds your artifacts—proposal, specs, design, tasks.

Let me create one for our task.
\`\`\`

**DO:** Create the change with a derived kebab-case name:
\`\`\`bash
openspec new change "<derived-name>"
\`\`\`

**SHOW:**
\`\`\`
Created: \`openspec/changes/<name>/\`

The folder structure:
\`\`\`
openspec/changes/<name>/
├── proposal.md    ← Why we're doing this (empty, we'll fill it)
├── design.md      ← How we'll build it (empty)
├── specs/         ← Detailed requirements (empty)
└── tasks.md       ← Implementation checklist (empty)
\`\`\`

Now let's fill in the first artifact—the proposal.
\`\`\`

---

## Phase 5: Proposal

**EXPLAIN:**
\`\`\`
## The Proposal

The proposal captures **why** we're making this change and **what** it involves at a high level. It's the "elevator pitch" for the work.

I'll draft one based on our task.
\`\`\`

**DO:** Draft the proposal content (don't save yet):

\`\`\`
Here's a draft proposal:

---

## Why

[1-2 sentences explaining the problem/opportunity]

## What Changes

[Bullet points of what will be different]

## Capabilities

### New Capabilities
- \`<capability-name>\`: [brief description]

### Modified Capabilities
<!-- If modifying existing behavior -->

## Impact

- \`src/path/to/file.ts\`: [what changes]
- [other files if applicable]

---

Does this capture the intent? I can adjust before we save it.
\`\`\`

**PAUSE** - Wait for user approval/feedback.

After approval, save the proposal:
\`\`\`bash
openspec instructions proposal --change "<name>" --json
\`\`\`
Then write the content to \`openspec/changes/<name>/proposal.md\`.

\`\`\`
Proposal saved. This is your "why" document—you can always come back and refine it as understanding evolves.

Next up: specs.
\`\`\`

---

## Phase 6: Specs

**EXPLAIN:**
\`\`\`
## Specs

Specs define **what** we're building in precise, testable terms. They use a requirement/scenario format that makes expected behavior crystal clear.

For a small task like this, we might only need one spec file.
\`\`\`

**DO:** Create the spec file:
\`\`\`bash
mkdir -p openspec/changes/<name>/specs/<capability-name>
\`\`\`

Draft the spec content:

\`\`\`
Here's the spec:

---

## ADDED Requirements

### Requirement: <Name>

<Description of what the system should do>

#### Scenario: <Scenario name>

- **WHEN** <trigger condition>
- **THEN** <expected outcome>
- **AND** <additional outcome if needed>

---

This format—WHEN/THEN/AND—makes requirements testable. You can literally read them as test cases.
\`\`\`

Save to \`openspec/changes/<name>/specs/<capability>/spec.md\`.

---

## Phase 7: Design

**EXPLAIN:**
\`\`\`
## Design

The design captures **how** we'll build it—technical decisions, tradeoffs, approach.

For small changes, this might be brief. That's fine—not every change needs deep design discussion.
\`\`\`

**DO:** Draft design.md:

\`\`\`
Here's the design:

---

## Context

[Brief context about the current state]

## Goals / Non-Goals

**Goals:**
- [What we're trying to achieve]

**Non-Goals:**
- [What's explicitly out of scope]

## Decisions

### Decision 1: [Key decision]

[Explanation of approach and rationale]

---

For a small task, this captures the key decisions without over-engineering.
\`\`\`

Save to \`openspec/changes/<name>/design.md\`.

---

## Phase 8: Tasks

**EXPLAIN:**
\`\`\`
## Tasks

Finally, we break the work into implementation tasks—checkboxes that drive the apply phase.

These should be small, clear, and in logical order.
\`\`\`

**DO:** Generate tasks based on specs and design:

\`\`\`
Here are the implementation tasks:

---

## 1. [Category or file]

- [ ] 1.1 [Specific task]
- [ ] 1.2 [Specific task]

## 2. Verify

- [ ] 2.1 [Verification step]

---

Each checkbox becomes a unit of work in the apply phase. Ready to implement?
\`\`\`

**PAUSE** - Wait for user to confirm they're ready to implement.

Save to \`openspec/changes/<name>/tasks.md\`.

---

## Phase 9: Apply (Implementation)

**EXPLAIN:**
\`\`\`
## Implementation

Now we implement each task, checking them off as we go. I'll announce each one and occasionally note how the specs/design informed the approach.
\`\`\`

**DO:** For each task:

1. Announce: "Working on task N: [description]"
2. Implement the change in the codebase
3. Reference specs/design naturally: "The spec says X, so I'm doing Y"
4. Mark complete in tasks.md: \`- [ ]\` → \`- [x]\`
5. Brief status: "✓ Task N complete"

Keep narration light—don't over-explain every line of code.

After all tasks:

\`\`\`
## Implementation Complete

All tasks done:
- [x] Task 1
- [x] Task 2
- [x] ...

The change is implemented! One more step—let's archive it.
\`\`\`

---

## Phase 10: Archive

**EXPLAIN:**
\`\`\`
## Archiving

When a change is complete, we archive it. This moves it from \`openspec/changes/\` to \`openspec/changes/archive/YYYY-MM-DD-<name>/\`.

Archived changes become your project's decision history—you can always find them later to understand why something was built a certain way.
\`\`\`

**DO:**
\`\`\`bash
openspec archive "<name>"
\`\`\`

**SHOW:**
\`\`\`
Archived to: \`openspec/changes/archive/YYYY-MM-DD-<name>/\`

The change is now part of your project's history. The code is in your codebase, the decision record is preserved.
\`\`\`

---

## Phase 11: Recap & Next Steps

\`\`\`
## Congratulations!

You just completed a full OpenSpec cycle:

1. **Explore** - Thought through the problem
2. **New** - Created a change container
3. **Proposal** - Captured WHY
4. **Specs** - Defined WHAT in detail
5. **Design** - Decided HOW
6. **Tasks** - Broke it into steps
7. **Apply** - Implemented the work
8. **Archive** - Preserved the record

This same rhythm works for any size change—a small fix or a major feature.

---

## Command Reference

| Command | What it does |
|---------|--------------|
| \`/opsx:explore\` | Think through problems before/during work |
| \`/opsx:new\` | Start a new change, step through artifacts |
| \`/opsx:ff\` | Fast-forward: create all artifacts at once |
| \`/opsx:continue\` | Continue working on an existing change |
| \`/opsx:apply\` | Implement tasks from a change |
| \`/opsx:verify\` | Verify implementation matches artifacts |
| \`/opsx:archive\` | Archive a completed change |

---

## What's Next?

Try \`/opsx:new\` or \`/opsx:ff\` on something you actually want to build. You've got the rhythm now!
\`\`\`

---

## Graceful Exit Handling

### User wants to stop mid-way

If the user says they need to stop, want to pause, or seem disengaged:

\`\`\`
No problem! Your change is saved at \`openspec/changes/<name>/\`.

To pick up where we left off later:
- \`/opsx:continue <name>\` - Resume artifact creation
- \`/opsx:apply <name>\` - Jump to implementation (if tasks exist)

The work won't be lost. Come back whenever you're ready.
\`\`\`

Exit gracefully without pressure.

### User just wants command reference

If the user says they just want to see the commands or skip the tutorial:

\`\`\`
## OpenSpec Quick Reference

| Command | What it does |
|---------|--------------|
| \`/opsx:explore\` | Think through problems (no code changes) |
| \`/opsx:new <name>\` | Start a new change, step by step |
| \`/opsx:ff <name>\` | Fast-forward: all artifacts at once |
| \`/opsx:continue <name>\` | Continue an existing change |
| \`/opsx:apply <name>\` | Implement tasks |
| \`/opsx:verify <name>\` | Verify implementation |
| \`/opsx:archive <name>\` | Archive when done |

Try \`/opsx:new\` to start your first change, or \`/opsx:ff\` if you want to move fast.
\`\`\`

Exit gracefully.

---

## Guardrails

- **Follow the EXPLAIN → DO → SHOW → PAUSE pattern** at key transitions (after explore, after proposal draft, after tasks, after archive)
- **Keep narration light** during implementation—teach without lecturing
- **Don't skip phases** even if the change is small—the goal is teaching the workflow
- **Pause for acknowledgment** at marked points, but don't over-pause
- **Handle exits gracefully**—never pressure the user to continue
- **Use real codebase tasks**—don't simulate or use fake examples
- **Adjust scope gently**—guide toward smaller tasks but respect user choice`;
}

// -----------------------------------------------------------------------------
// Slash Command Templates
// -----------------------------------------------------------------------------

export interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}

/**
 * Template for /opsx:explore slash command
 * Explore mode - adaptive thinking partner
 */
export function getOpsxExploreCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Explore',
    description: 'Enter explore mode - think through ideas, investigate problems, clarify requirements',
    category: 'Workflow',
    tags: ['workflow', 'explore', 'experimental', 'thinking'],
    content: `Enter explore mode. Think deeply. Visualize freely. Follow the conversation wherever it goes.

**IMPORTANT: Explore mode is for thinking, not implementing.** You may read files, search code, and investigate the codebase, but you must NEVER write code or implement features. If the user asks you to implement something, remind them to exit explore mode first (e.g., start a change with \`/opsx:new\` or \`/opsx:ff\`). You MAY create OpenSpec artifacts (proposals, designs, specs) if the user asks—that's capturing thinking, not implementing.

**This is a stance, not a workflow.** There are no fixed steps, no required sequence, no mandatory outputs. You're a thinking partner helping the user explore.

**Input**: The argument after \`/opsx:explore\` is whatever the user wants to think about. Could be:
- A vague idea: "real-time collaboration"
- A specific problem: "the auth system is getting unwieldy"
- A change name: "add-dark-mode" (to explore in context of that change)
- A comparison: "postgres vs sqlite for this"
- Nothing (just enter explore mode)

---

## The Stance

- **Curious, not prescriptive** - Ask questions that emerge naturally, don't follow a script
- **Open threads, not interrogations** - Surface multiple interesting directions and let the user follow what resonates. Don't funnel them through a single path of questions.
- **Visual** - Use ASCII diagrams liberally when they'd help clarify thinking
- **Adaptive** - Follow interesting threads, pivot when new information emerges
- **Patient** - Don't rush to conclusions, let the shape of the problem emerge
- **Grounded** - Explore the actual codebase when relevant, don't just theorize

---

## What You Might Do

Depending on what the user brings, you might:

**Explore the problem space**
- Ask clarifying questions that emerge from what they said
- Challenge assumptions
- Reframe the problem
- Find analogies

**Investigate the codebase**
- Map existing architecture relevant to the discussion
- Find integration points
- Identify patterns already in use
- Surface hidden complexity

**Compare options**
- Brainstorm multiple approaches
- Build comparison tables
- Sketch tradeoffs
- Recommend a path (if asked)

**Visualize**
\`\`\`
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│                                         │
│   ┌────────┐         ┌────────┐        │
│   │ State  │────────▶│ State  │        │
│   │   A    │         │   B    │        │
│   └────────┘         └────────┘        │
│                                         │
│   System diagrams, state machines,      │
│   data flows, architecture sketches,    │
│   dependency graphs, comparison tables  │
│                                         │
└─────────────────────────────────────────┘
\`\`\`

**Surface risks and unknowns**
- Identify what could go wrong
- Find gaps in understanding
- Suggest spikes or investigations

---

## OpenSpec Awareness

You have full context of the OpenSpec system. Use it naturally, don't force it.

### Check for context

At the start, quickly check what exists:
\`\`\`bash
openspec list --json
\`\`\`

This tells you:
- If there are active changes
- Their names, schemas, and status
- What the user might be working on

If the user mentioned a specific change name, read its artifacts for context.

### When no change exists

Think freely. When insights crystallize, you might offer:

- "This feels solid enough to start a change. Want me to create one?"
  → Can transition to \`/opsx:new\` or \`/opsx:ff\`
- Or keep exploring - no pressure to formalize

### When a change exists

If the user mentions a change or you detect one is relevant:

1. **Read existing artifacts for context**
   - \`openspec/changes/<name>/proposal.md\`
   - \`openspec/changes/<name>/design.md\`
   - \`openspec/changes/<name>/tasks.md\`
   - etc.

2. **Reference them naturally in conversation**
   - "Your design mentions using Redis, but we just realized SQLite fits better..."
   - "The proposal scopes this to premium users, but we're now thinking everyone..."

3. **Offer to capture when decisions are made**

   | Insight Type | Where to Capture |
   |--------------|------------------|
   | New requirement discovered | \`specs/<capability>/spec.md\` |
   | Requirement changed | \`specs/<capability>/spec.md\` |
   | Design decision made | \`design.md\` |
   | Scope changed | \`proposal.md\` |
   | New work identified | \`tasks.md\` |
   | Assumption invalidated | Relevant artifact |

   Example offers:
   - "That's a design decision. Capture it in design.md?"
   - "This is a new requirement. Add it to specs?"
   - "This changes scope. Update the proposal?"

4. **The user decides** - Offer and move on. Don't pressure. Don't auto-capture.

---

## What You Don't Have To Do

- Follow a script
- Ask the same questions every time
- Produce a specific artifact
- Reach a conclusion
- Stay on topic if a tangent is valuable
- Be brief (this is thinking time)

---

## Ending Discovery

There's no required ending. Discovery might:

- **Flow into action**: "Ready to start? \`/opsx:new\` or \`/opsx:ff\`"
- **Result in artifact updates**: "Updated design.md with these decisions"
- **Just provide clarity**: User has what they need, moves on
- **Continue later**: "We can pick this up anytime"

When things crystallize, you might offer a summary - but it's optional. Sometimes the thinking IS the value.

---

## Guardrails

- **Don't implement** - Never write code or implement features. Creating OpenSpec artifacts is fine, writing application code is not.
- **Don't fake understanding** - If something is unclear, dig deeper
- **Don't rush** - Discovery is thinking time, not task time
- **Don't force structure** - Let patterns emerge naturally
- **Don't auto-capture** - Offer to save insights, don't just do it
- **Do visualize** - A good diagram is worth many paragraphs
- **Do explore the codebase** - Ground discussions in reality
- **Do question assumptions** - Including the user's and your own`
  };
}

/**
 * Template for /opsx:new slash command
 */
export function getOpsxNewCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: New',
    description: 'Start a new change using the experimental artifact workflow (OPSX)',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: `Start a new change using the experimental artifact-driven approach.

**Input**: The argument after \`/opsx:new\` is the change name (kebab-case), OR a description of what the user wants to build.

**Steps**

1. **If no input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → \`add-user-auth\`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Determine the workflow schema**

   Use the default schema (omit \`--schema\`) unless the user explicitly requests a different workflow.

   **Use a different schema only if the user mentions:**
   - A specific schema name → use \`--schema <name>\`
   - "show workflows" or "what workflows" → run \`openspec schemas --json\` and let them choose

   **Otherwise**: Omit \`--schema\` to use the default.

3. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   Add \`--schema <name>\` only if the user requested a specific workflow.
   This creates a scaffolded change at \`openspec/changes/<name>/\` with the selected schema.

4. **Show the artifact status**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`
   This shows which artifacts need to be created and which are ready (dependencies satisfied).

5. **Get instructions for the first artifact**
   The first artifact depends on the schema. Check the status output to find the first artifact with status "ready".
   \`\`\`bash
   openspec instructions <first-artifact-id> --change "<name>"
   \`\`\`
   This outputs the template and context for creating the first artifact.

6. **STOP and wait for user direction**

**Output**

After completing the steps, summarize:
- Change name and location
- Schema/workflow being used and its artifact sequence
- Current status (0/N artifacts complete)
- The template for the first artifact
- Prompt: "Ready to create the first artifact? Run \`/opsx:continue\` or just describe what this change is about and I'll draft it."

**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
- If the name is invalid (not kebab-case), ask for a valid name
- If a change with that name already exists, suggest using \`/opsx:continue\` instead
- Pass --schema if using a non-default workflow`
  };
}

/**
 * Template for /opsx:continue slash command
 */
export function getOpsxContinueCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Continue',
    description: 'Continue working on a change - create the next artifact (Experimental)',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: `Continue working on a change by creating the next artifact.

**Input**: Optionally specify a change name after \`/opsx:continue\` (e.g., \`/opsx:continue add-auth\`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes sorted by most recently modified. Then use the **AskUserQuestion tool** to let the user select which change to work on.

   Present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Schema (from \`schema\` field if present, otherwise "spec-driven")
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from \`lastModified\` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to continue.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check current status**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand current state. The response includes:
   - \`schemaName\`: The workflow schema being used (e.g., "spec-driven")
   - \`artifacts\`: Array of artifacts with their status ("done", "ready", "blocked")
   - \`isComplete\`: Boolean indicating if all artifacts are complete

3. **Act based on status**:

   ---

   **If all artifacts are complete (\`isComplete: true\`)**:
   - Congratulate the user
   - Show final status including the schema used
   - Suggest: "All artifacts created! You can now implement this change with \`/opsx:apply\` or archive it with \`/opsx:archive\`."
   - STOP

   ---

   **If artifacts are ready to create** (status shows artifacts with \`status: "ready"\`):
   - Pick the FIRST artifact with \`status: "ready"\` from the status output
   - Get its instructions:
     \`\`\`bash
     openspec instructions <artifact-id> --change "<name>" --json
     \`\`\`
   - Parse the JSON. The key fields are:
     - \`context\`: Project background (constraints for you - do NOT include in output)
     - \`rules\`: Artifact-specific rules (constraints for you - do NOT include in output)
     - \`template\`: The structure to use for your output file
     - \`instruction\`: Schema-specific guidance
     - \`outputPath\`: Where to write the artifact
     - \`dependencies\`: Completed artifacts to read for context
   - **Create the artifact file**:
     - Read any completed dependency files for context
     - Use \`template\` as the structure - fill in its sections
     - Apply \`context\` and \`rules\` as constraints when writing - but do NOT copy them into the file
     - Write to the output path specified in instructions
   - Show what was created and what's now unlocked
   - STOP after creating ONE artifact

   ---

   **If no artifacts are ready (all blocked)**:
   - This shouldn't happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`

**Output**

After each invocation, show:
- Which artifact was created
- Schema workflow being used
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Run \`/opsx:continue\` to create the next artifact"

**Artifact Creation Guidelines**

The artifact types and their purpose depend on the schema. Use the \`instruction\` field from the instructions output to understand what to create.

Common artifact patterns:

**spec-driven schema** (proposal → specs → design → tasks):
- **proposal.md**: Ask user about the change if not clear. Fill in Why, What Changes, Capabilities, Impact.
  - The Capabilities section is critical - each capability listed will need a spec file.
- **specs/<capability>/spec.md**: Create one spec per capability listed in the proposal's Capabilities section (use the capability name, not the change name).
- **design.md**: Document technical decisions, architecture, and implementation approach.
- **tasks.md**: Break down implementation into checkboxed tasks.

For other schemas, follow the \`instruction\` field from the CLI output.

**Guardrails**
- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before marking progress
- Use the schema's artifact sequence, don't assume specific artifact names
- **IMPORTANT**: \`context\` and \`rules\` are constraints for YOU, not content for the file
  - Do NOT copy \`<context>\`, \`<rules>\`, \`<project_context>\` blocks into the artifact
  - These guide what you write, but should never appear in the output`
  };
}

/**
 * Template for /opsx:apply slash command
 */
export function getOpsxApplyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Apply',
    description: 'Implement tasks from an OpenSpec change (Experimental)',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: `Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name (e.g., \`/opsx:apply add-auth\`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run \`openspec list --json\` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., \`/opsx:apply <other>\`).

2. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns:
   - Context file paths (varies by schema)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If \`state: "blocked"\` (missing artifacts): show message, suggest using \`/opsx:continue\`
   - If \`state: "all_done"\`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in \`contextFiles\` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: \`- [ ]\` → \`- [x]\`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance

**Output During Implementation**

\`\`\`
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
\`\`\`

**Output On Completion**

\`\`\`
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! You can archive this change with \`/opsx:archive\`.
\`\`\`

**Output On Pause (Issue Encountered)**

\`\`\`
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
\`\`\`

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly`
  };
}


/**
 * Template for /opsx:ff slash command
 */
export function getOpsxFfCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Fast Forward',
    description: 'Create a change and generate all artifacts needed for implementation in one go',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: `Fast-forward through artifact creation - generate everything needed to start implementation.

**Input**: The argument after \`/opsx:ff\` is the change name (kebab-case), OR a description of what the user wants to build.

**Steps**

1. **If no input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → \`add-user-auth\`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   This creates a scaffolded change at \`openspec/changes/<name>/\`.

3. **Get the artifact build order**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to get:
   - \`applyRequires\`: array of artifact IDs needed before implementation (e.g., \`["tasks"]\`)
   - \`artifacts\`: list of all artifacts with their status and dependencies

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is \`ready\` (dependencies satisfied)**:
      - Get instructions:
        \`\`\`bash
        openspec instructions <artifact-id> --change "<name>" --json
        \`\`\`
      - The instructions JSON includes:
        - \`context\`: Project background (constraints for you - do NOT include in output)
        - \`rules\`: Artifact-specific rules (constraints for you - do NOT include in output)
        - \`template\`: The structure to use for your output file
        - \`instruction\`: Schema-specific guidance for this artifact type
        - \`outputPath\`: Where to write the artifact
        - \`dependencies\`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - Create the artifact file using \`template\` as the structure
      - Apply \`context\` and \`rules\` as constraints - but do NOT copy them into the file
      - Show brief progress: "✓ Created <artifact-id>"

   b. **Continue until all \`applyRequires\` artifacts are complete**
      - After creating each artifact, re-run \`openspec status --change "<name>" --json\`
      - Check if every artifact ID in \`applyRequires\` has \`status: "done"\` in the artifacts array
      - Stop when all \`applyRequires\` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

5. **Show final status**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run \`/opsx:apply\` to start implementing."

**Artifact Creation Guidelines**

- Follow the \`instruction\` field from \`openspec instructions\` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use the \`template\` as a starting point, filling in based on context

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's \`apply.requires\`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next`
  };
}

/**
 * Template for openspec-archive-change skill
 * For archiving completed changes in the experimental workflow
 */
export function getArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-archive-change',
    description: 'Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.',
    instructions: `Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run \`openspec status --change "<name>" --json\` to check artifact completion.

   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used
   - \`artifacts\`: List of artifacts with their status (\`done\` or other)

   **If any artifacts are not \`done\`:**
   - Display warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically \`tasks.md\`) to check for incomplete tasks.

   Count tasks marked with \`- [ ]\` (incomplete) vs \`- [x]\` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Assess delta spec sync state**

   Check for delta specs at \`openspec/changes/<name>/specs/\`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at \`openspec/specs/<capability>/spec.md\`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, execute /opsx:sync logic (use the openspec-sync-specs skill). Proceed to archive regardless of choice.

5. **Perform the archive**

   Create the archive directory if it doesn't exist:
   \`\`\`bash
   mkdir -p openspec/changes/archive
   \`\`\`

   Generate target name using current date: \`YYYY-MM-DD-<change-name>\`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   \`\`\`bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   \`\`\`

6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable)
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

\`\`\`
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")

All artifacts complete. All tasks complete.
\`\`\`

**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use openspec-sync-specs approach (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for openspec-bulk-archive-change skill
 * For archiving multiple completed changes at once
 */
export function getBulkArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-bulk-archive-change',
    description: 'Archive multiple completed changes at once. Use when archiving several parallel changes.',
    instructions: `Archive multiple completed changes in a single operation.

This skill allows you to batch-archive changes, handling spec conflicts intelligently by checking the codebase to determine what's actually implemented.

**Input**: None required (prompts for selection)

**Steps**

1. **Get active changes**

   Run \`openspec list --json\` to get all active changes.

   If no active changes exist, inform user and stop.

2. **Prompt for change selection**

   Use **AskUserQuestion tool** with multi-select to let user choose changes:
   - Show each change with its schema
   - Include an option for "All changes"
   - Allow any number of selections (1+ works, 2+ is the typical use case)

   **IMPORTANT**: Do NOT auto-select. Always let the user choose.

3. **Batch validation - gather status for all selected changes**

   For each selected change, collect:

   a. **Artifact status** - Run \`openspec status --change "<name>" --json\`
      - Parse \`schemaName\` and \`artifacts\` list
      - Note which artifacts are \`done\` vs other states

   b. **Task completion** - Read \`openspec/changes/<name>/tasks.md\`
      - Count \`- [ ]\` (incomplete) vs \`- [x]\` (complete)
      - If no tasks file exists, note as "No tasks"

   c. **Delta specs** - Check \`openspec/changes/<name>/specs/\` directory
      - List which capability specs exist
      - For each, extract requirement names (lines matching \`### Requirement: <name>\`)

4. **Detect spec conflicts**

   Build a map of \`capability -> [changes that touch it]\`:

   \`\`\`
   auth -> [change-a, change-b]  <- CONFLICT (2+ changes)
   api  -> [change-c]            <- OK (only 1 change)
   \`\`\`

   A conflict exists when 2+ selected changes have delta specs for the same capability.

5. **Resolve conflicts agentically**

   **For each conflict**, investigate the codebase:

   a. **Read the delta specs** from each conflicting change to understand what each claims to add/modify

   b. **Search the codebase** for implementation evidence:
      - Look for code implementing requirements from each delta spec
      - Check for related files, functions, or tests

   c. **Determine resolution**:
      - If only one change is actually implemented -> sync that one's specs
      - If both implemented -> apply in chronological order (older first, newer overwrites)
      - If neither implemented -> skip spec sync, warn user

   d. **Record resolution** for each conflict:
      - Which change's specs to apply
      - In what order (if both)
      - Rationale (what was found in codebase)

6. **Show consolidated status table**

   Display a table summarizing all changes:

   \`\`\`
   | Change               | Artifacts | Tasks | Specs   | Conflicts | Status |
   |---------------------|-----------|-------|---------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | None      | Ready  |
   | add-oauth           | Done      | 4/4   | 1 delta | auth (!)  | Ready* |
   | add-verify-skill    | 1 left    | 2/5   | None    | None      | Warn   |
   \`\`\`

   For conflicts, show the resolution:
   \`\`\`
   * Conflict resolution:
     - auth spec: Will apply add-oauth then add-jwt (both implemented, chronological order)
   \`\`\`

   For incomplete changes, show warnings:
   \`\`\`
   Warnings:
   - add-verify-skill: 1 incomplete artifact, 3 incomplete tasks
   \`\`\`

7. **Confirm batch operation**

   Use **AskUserQuestion tool** with a single confirmation:

   - "Archive N changes?" with options based on status
   - Options might include:
     - "Archive all N changes"
     - "Archive only N ready changes (skip incomplete)"
     - "Cancel"

   If there are incomplete changes, make clear they'll be archived with warnings.

8. **Execute archive for each confirmed change**

   Process changes in the determined order (respecting conflict resolution):

   a. **Sync specs** if delta specs exist:
      - Use the openspec-sync-specs approach (agent-driven intelligent merge)
      - For conflicts, apply in resolved order
      - Track if sync was done

   b. **Perform the archive**:
      \`\`\`bash
      mkdir -p openspec/changes/archive
      mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
      \`\`\`

   c. **Track outcome** for each change:
      - Success: archived successfully
      - Failed: error during archive (record error)
      - Skipped: user chose not to archive (if applicable)

9. **Display summary**

   Show final results:

   \`\`\`
   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management-cli -> archive/2026-01-19-schema-management-cli/
   - project-config -> archive/2026-01-19-project-config/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 4 delta specs synced to main specs
   - 1 conflict resolved (auth: applied both in chronological order)
   \`\`\`

   If any failures:
   \`\`\`
   Failed 1 change:
   - some-change: Archive directory already exists
   \`\`\`

**Conflict Resolution Examples**

Example 1: Only one implemented
\`\`\`
Conflict: specs/auth/spec.md touched by [add-oauth, add-jwt]

Checking add-oauth:
- Delta adds "OAuth Provider Integration" requirement
- Searching codebase... found src/auth/oauth.ts implementing OAuth flow

Checking add-jwt:
- Delta adds "JWT Token Handling" requirement
- Searching codebase... no JWT implementation found

Resolution: Only add-oauth is implemented. Will sync add-oauth specs only.
\`\`\`

Example 2: Both implemented
\`\`\`
Conflict: specs/api/spec.md touched by [add-rest-api, add-graphql]

Checking add-rest-api (created 2026-01-10):
- Delta adds "REST Endpoints" requirement
- Searching codebase... found src/api/rest.ts

Checking add-graphql (created 2026-01-15):
- Delta adds "GraphQL Schema" requirement
- Searching codebase... found src/api/graphql.ts

Resolution: Both implemented. Will apply add-rest-api specs first,
then add-graphql specs (chronological order, newer takes precedence).
\`\`\`

**Output On Success**

\`\`\`
## Bulk Archive Complete

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/
- <change-2> -> archive/YYYY-MM-DD-<change-2>/

Spec sync summary:
- N delta specs synced to main specs
- No conflicts (or: M conflicts resolved)
\`\`\`

**Output On Partial Success**

\`\`\`
## Bulk Archive Complete (partial)

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/

Skipped M changes:
- <change-2> (user chose not to archive incomplete)

Failed K changes:
- <change-3>: Archive directory already exists
\`\`\`

**Output When No Changes**

\`\`\`
## No Changes to Archive

No active changes found. Use \`/opsx:new\` to create a new change.
\`\`\`

**Guardrails**
- Allow any number of changes (1+ is fine, 2+ is the typical use case)
- Always prompt for selection, never auto-select
- Detect spec conflicts early and resolve by checking codebase
- When both changes are implemented, apply specs in chronological order
- Skip spec sync only when implementation is missing (warn user)
- Show clear per-change status before confirming
- Use single confirmation for entire batch
- Track and report all outcomes (success/skip/fail)
- Preserve .openspec.yaml when moving to archive
- Archive directory target uses current date: YYYY-MM-DD-<name>
- If archive target exists, fail that change but continue with others`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for /opsx:sync slash command
 */
export function getOpsxSyncCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Sync',
    description: 'Sync delta specs from a change to main specs',
    category: 'Workflow',
    tags: ['workflow', 'specs', 'experimental'],
    content: `Sync delta specs from a change to main specs.

This is an **agent-driven** operation - you will read delta specs and directly edit main specs to apply the changes. This allows intelligent merging (e.g., adding a scenario without copying the entire requirement).

**Input**: Optionally specify a change name after \`/opsx:sync\` (e.g., \`/opsx:sync add-auth\`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have delta specs (under \`specs/\` directory).

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Find delta specs**

   Look for delta spec files in \`openspec/changes/<name>/specs/*/spec.md\`.

   Each delta spec file contains sections like:
   - \`## ADDED Requirements\` - New requirements to add
   - \`## MODIFIED Requirements\` - Changes to existing requirements
   - \`## REMOVED Requirements\` - Requirements to remove
   - \`## RENAMED Requirements\` - Requirements to rename (FROM:/TO: format)

   If no delta specs found, inform user and stop.

3. **For each delta spec, apply changes to main specs**

   For each capability with a delta spec at \`openspec/changes/<name>/specs/<capability>/spec.md\`:

   a. **Read the delta spec** to understand the intended changes

   b. **Read the main spec** at \`openspec/specs/<capability>/spec.md\` (may not exist yet)

   c. **Apply changes intelligently**:

      **ADDED Requirements:**
      - If requirement doesn't exist in main spec → add it
      - If requirement already exists → update it to match (treat as implicit MODIFIED)

      **MODIFIED Requirements:**
      - Find the requirement in main spec
      - Apply the changes - this can be:
        - Adding new scenarios (don't need to copy existing ones)
        - Modifying existing scenarios
        - Changing the requirement description
      - Preserve scenarios/content not mentioned in the delta

      **REMOVED Requirements:**
      - Remove the entire requirement block from main spec

      **RENAMED Requirements:**
      - Find the FROM requirement, rename to TO

   d. **Create new main spec** if capability doesn't exist yet:
      - Create \`openspec/specs/<capability>/spec.md\`
      - Add Purpose section (can be brief, mark as TBD)
      - Add Requirements section with the ADDED requirements

4. **Show summary**

   After applying all changes, summarize:
   - Which capabilities were updated
   - What changes were made (requirements added/modified/removed/renamed)

**Delta Spec Format Reference**

\`\`\`markdown
## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: \`### Requirement: Old Name\`
- TO: \`### Requirement: New Name\`
\`\`\`

**Key Principle: Intelligent Merging**

Unlike programmatic merging, you can apply **partial updates**:
- To add a scenario, just include that scenario under MODIFIED - don't copy existing scenarios
- The delta represents *intent*, not a wholesale replacement
- Use your judgment to merge changes sensibly

**Output On Success**

\`\`\`
## Specs Synced: <change-name>

Updated main specs:

**<capability-1>**:
- Added requirement: "New Feature"
- Modified requirement: "Existing Feature" (added 1 scenario)

**<capability-2>**:
- Created new spec file
- Added requirement: "Another Feature"

Main specs are now updated. The change remains active - archive when implementation is complete.
\`\`\`

**Guardrails**
- Read both delta and main specs before making changes
- Preserve existing content not mentioned in delta
- If something is unclear, ask for clarification
- Show what you're changing as you go
- The operation should be idempotent - running twice should give same result`
  };
}

/**
 * Template for openspec-verify-change skill
 * For verifying implementation matches change artifacts before archiving
 */
export function getVerifyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-verify-change',
    description: 'Verify implementation matches change artifacts. Use when the user wants to validate that implementation is complete, correct, and coherent before archiving.',
    instructions: `Verify that an implementation matches the change artifacts (specs, tasks, design).

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have implementation tasks (tasks artifact exists).
   Include the schema used for each change if available.
   Mark changes with incomplete tasks as "(In Progress)".

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used (e.g., "spec-driven")
   - Which artifacts exist for this change

3. **Get the change directory and load artifacts**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns the change directory and context files. Read all available artifacts from \`contextFiles\`.

4. **Initialize verification report structure**

   Create a report structure with three dimensions:
   - **Completeness**: Track tasks and spec coverage
   - **Correctness**: Track requirement implementation and scenario coverage
   - **Coherence**: Track design adherence and pattern consistency

   Each dimension can have CRITICAL, WARNING, or SUGGESTION issues.

5. **Verify Completeness**

   **Task Completion**:
   - If tasks.md exists in contextFiles, read it
   - Parse checkboxes: \`- [ ]\` (incomplete) vs \`- [x]\` (complete)
   - Count complete vs total tasks
   - If incomplete tasks exist:
     - Add CRITICAL issue for each incomplete task
     - Recommendation: "Complete task: <description>" or "Mark as done if already implemented"

   **Spec Coverage**:
   - If delta specs exist in \`openspec/changes/<name>/specs/\`:
     - Extract all requirements (marked with "### Requirement:")
     - For each requirement:
       - Search codebase for keywords related to the requirement
       - Assess if implementation likely exists
     - If requirements appear unimplemented:
       - Add CRITICAL issue: "Requirement not found: <requirement name>"
       - Recommendation: "Implement requirement X: <description>"

6. **Verify Correctness**

   **Requirement Implementation Mapping**:
   - For each requirement from delta specs:
     - Search codebase for implementation evidence
     - If found, note file paths and line ranges
     - Assess if implementation matches requirement intent
     - If divergence detected:
       - Add WARNING: "Implementation may diverge from spec: <details>"
       - Recommendation: "Review <file>:<lines> against requirement X"

   **Scenario Coverage**:
   - For each scenario in delta specs (marked with "#### Scenario:"):
     - Check if conditions are handled in code
     - Check if tests exist covering the scenario
     - If scenario appears uncovered:
       - Add WARNING: "Scenario not covered: <scenario name>"
       - Recommendation: "Add test or implementation for scenario: <description>"

7. **Verify Coherence**

   **Design Adherence**:
   - If design.md exists in contextFiles:
     - Extract key decisions (look for sections like "Decision:", "Approach:", "Architecture:")
     - Verify implementation follows those decisions
     - If contradiction detected:
       - Add WARNING: "Design decision not followed: <decision>"
       - Recommendation: "Update implementation or revise design.md to match reality"
   - If no design.md: Skip design adherence check, note "No design.md to verify against"

   **Code Pattern Consistency**:
   - Review new code for consistency with project patterns
   - Check file naming, directory structure, coding style
   - If significant deviations found:
     - Add SUGGESTION: "Code pattern deviation: <details>"
     - Recommendation: "Consider following project pattern: <example>"

8. **Generate Verification Report**

   **Summary Scorecard**:
   \`\`\`
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   \`\`\`

   **Issues by Priority**:

   1. **CRITICAL** (Must fix before archive):
      - Incomplete tasks
      - Missing requirement implementations
      - Each with specific, actionable recommendation

   2. **WARNING** (Should fix):
      - Spec/design divergences
      - Missing scenario coverage
      - Each with specific recommendation

   3. **SUGGESTION** (Nice to fix):
      - Pattern inconsistencies
      - Minor improvements
      - Each with specific recommendation

   **Final Assessment**:
   - If CRITICAL issues: "X critical issue(s) found. Fix before archiving."
   - If only warnings: "No critical issues. Y warning(s) to consider. Ready for archive (with noted improvements)."
   - If all clear: "All checks passed. Ready for archive."

**Verification Heuristics**

- **Completeness**: Focus on objective checklist items (checkboxes, requirements list)
- **Correctness**: Use keyword search, file path analysis, reasonable inference - don't require perfect certainty
- **Coherence**: Look for glaring inconsistencies, don't nitpick style
- **False Positives**: When uncertain, prefer SUGGESTION over WARNING, WARNING over CRITICAL
- **Actionability**: Every issue must have a specific recommendation with file/line references where applicable

**Graceful Degradation**

- If only tasks.md exists: verify task completion only, skip spec/design checks
- If tasks + specs exist: verify completeness and correctness, skip design
- If full artifacts: verify all three dimensions
- Always note which checks were skipped and why

**Output Format**

Use clear markdown with:
- Table for summary scorecard
- Grouped lists for issues (CRITICAL/WARNING/SUGGESTION)
- Code references in format: \`file.ts:123\`
- Specific, actionable recommendations
- No vague suggestions like "consider reviewing"`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

/**
 * Template for /opsx:archive slash command
 */
export function getOpsxArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Archive',
    description: 'Archive a completed change in the experimental workflow',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental'],
    content: `Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name after \`/opsx:archive\` (e.g., \`/opsx:archive add-auth\`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run \`openspec status --change "<name>" --json\` to check artifact completion.

   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used
   - \`artifacts\`: List of artifacts with their status (\`done\` or other)

   **If any artifacts are not \`done\`:**
   - Display warning listing incomplete artifacts
   - Prompt user for confirmation to continue
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically \`tasks.md\`) to check for incomplete tasks.

   Count tasks marked with \`- [ ]\` (incomplete) vs \`- [x]\` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Prompt user for confirmation to continue
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Assess delta spec sync state**

   Check for delta specs at \`openspec/changes/<name>/specs/\`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at \`openspec/specs/<capability>/spec.md\`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, execute \`/opsx:sync\` logic. Proceed to archive regardless of choice.

5. **Perform the archive**

   Create the archive directory if it doesn't exist:
   \`\`\`bash
   mkdir -p openspec/changes/archive
   \`\`\`

   Generate target name using current date: \`YYYY-MM-DD-<change-name>\`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   \`\`\`bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   \`\`\`

6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Spec sync status (synced / sync skipped / no delta specs)
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

\`\`\`
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs

All artifacts complete. All tasks complete.
\`\`\`

**Output On Success (No Delta Specs)**

\`\`\`
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** No delta specs

All artifacts complete. All tasks complete.
\`\`\`

**Output On Success With Warnings**

\`\`\`
## Archive Complete (with warnings)

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** Sync skipped (user chose to skip)

**Warnings:**
- Archived with 2 incomplete artifacts
- Archived with 3 incomplete tasks
- Delta spec sync was skipped (user chose to skip)

Review the archive if this was not intentional.
\`\`\`

**Output On Error (Archive Exists)**

\`\`\`
## Archive Failed

**Change:** <change-name>
**Target:** openspec/changes/archive/YYYY-MM-DD-<name>/

Target archive directory already exists.

**Options:**
1. Rename the existing archive
2. Delete the existing archive if it's a duplicate
3. Wait until a different date to archive
\`\`\`

**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use /opsx:sync approach (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting`
  };
}

/**
 * Template for /opsx:onboard slash command
 * Guided onboarding through the complete OpenSpec workflow
 */
export function getOpsxOnboardCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Onboard',
    description: 'Guided onboarding - walk through a complete OpenSpec workflow cycle with narration',
    category: 'Workflow',
    tags: ['workflow', 'onboarding', 'tutorial', 'learning'],
    content: getOnboardInstructions(),
  };
}

/**
 * Template for /opsx:bulk-archive slash command
 */
export function getOpsxBulkArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Bulk Archive',
    description: 'Archive multiple completed changes at once',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental', 'bulk'],
    content: `Archive multiple completed changes in a single operation.

This skill allows you to batch-archive changes, handling spec conflicts intelligently by checking the codebase to determine what's actually implemented.

**Input**: None required (prompts for selection)

**Steps**

1. **Get active changes**

   Run \`openspec list --json\` to get all active changes.

   If no active changes exist, inform user and stop.

2. **Prompt for change selection**

   Use **AskUserQuestion tool** with multi-select to let user choose changes:
   - Show each change with its schema
   - Include an option for "All changes"
   - Allow any number of selections (1+ works, 2+ is the typical use case)

   **IMPORTANT**: Do NOT auto-select. Always let the user choose.

3. **Batch validation - gather status for all selected changes**

   For each selected change, collect:

   a. **Artifact status** - Run \`openspec status --change "<name>" --json\`
      - Parse \`schemaName\` and \`artifacts\` list
      - Note which artifacts are \`done\` vs other states

   b. **Task completion** - Read \`openspec/changes/<name>/tasks.md\`
      - Count \`- [ ]\` (incomplete) vs \`- [x]\` (complete)
      - If no tasks file exists, note as "No tasks"

   c. **Delta specs** - Check \`openspec/changes/<name>/specs/\` directory
      - List which capability specs exist
      - For each, extract requirement names (lines matching \`### Requirement: <name>\`)

4. **Detect spec conflicts**

   Build a map of \`capability -> [changes that touch it]\`:

   \`\`\`
   auth -> [change-a, change-b]  <- CONFLICT (2+ changes)
   api  -> [change-c]            <- OK (only 1 change)
   \`\`\`

   A conflict exists when 2+ selected changes have delta specs for the same capability.

5. **Resolve conflicts agentically**

   **For each conflict**, investigate the codebase:

   a. **Read the delta specs** from each conflicting change to understand what each claims to add/modify

   b. **Search the codebase** for implementation evidence:
      - Look for code implementing requirements from each delta spec
      - Check for related files, functions, or tests

   c. **Determine resolution**:
      - If only one change is actually implemented -> sync that one's specs
      - If both implemented -> apply in chronological order (older first, newer overwrites)
      - If neither implemented -> skip spec sync, warn user

   d. **Record resolution** for each conflict:
      - Which change's specs to apply
      - In what order (if both)
      - Rationale (what was found in codebase)

6. **Show consolidated status table**

   Display a table summarizing all changes:

   \`\`\`
   | Change               | Artifacts | Tasks | Specs   | Conflicts | Status |
   |---------------------|-----------|-------|---------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | None      | Ready  |
   | add-oauth           | Done      | 4/4   | 1 delta | auth (!)  | Ready* |
   | add-verify-skill    | 1 left    | 2/5   | None    | None      | Warn   |
   \`\`\`

   For conflicts, show the resolution:
   \`\`\`
   * Conflict resolution:
     - auth spec: Will apply add-oauth then add-jwt (both implemented, chronological order)
   \`\`\`

   For incomplete changes, show warnings:
   \`\`\`
   Warnings:
   - add-verify-skill: 1 incomplete artifact, 3 incomplete tasks
   \`\`\`

7. **Confirm batch operation**

   Use **AskUserQuestion tool** with a single confirmation:

   - "Archive N changes?" with options based on status
   - Options might include:
     - "Archive all N changes"
     - "Archive only N ready changes (skip incomplete)"
     - "Cancel"

   If there are incomplete changes, make clear they'll be archived with warnings.

8. **Execute archive for each confirmed change**

   Process changes in the determined order (respecting conflict resolution):

   a. **Sync specs** if delta specs exist:
      - Use the openspec-sync-specs approach (agent-driven intelligent merge)
      - For conflicts, apply in resolved order
      - Track if sync was done

   b. **Perform the archive**:
      \`\`\`bash
      mkdir -p openspec/changes/archive
      mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
      \`\`\`

   c. **Track outcome** for each change:
      - Success: archived successfully
      - Failed: error during archive (record error)
      - Skipped: user chose not to archive (if applicable)

9. **Display summary**

   Show final results:

   \`\`\`
   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management-cli -> archive/2026-01-19-schema-management-cli/
   - project-config -> archive/2026-01-19-project-config/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 4 delta specs synced to main specs
   - 1 conflict resolved (auth: applied both in chronological order)
   \`\`\`

   If any failures:
   \`\`\`
   Failed 1 change:
   - some-change: Archive directory already exists
   \`\`\`

**Conflict Resolution Examples**

Example 1: Only one implemented
\`\`\`
Conflict: specs/auth/spec.md touched by [add-oauth, add-jwt]

Checking add-oauth:
- Delta adds "OAuth Provider Integration" requirement
- Searching codebase... found src/auth/oauth.ts implementing OAuth flow

Checking add-jwt:
- Delta adds "JWT Token Handling" requirement
- Searching codebase... no JWT implementation found

Resolution: Only add-oauth is implemented. Will sync add-oauth specs only.
\`\`\`

Example 2: Both implemented
\`\`\`
Conflict: specs/api/spec.md touched by [add-rest-api, add-graphql]

Checking add-rest-api (created 2026-01-10):
- Delta adds "REST Endpoints" requirement
- Searching codebase... found src/api/rest.ts

Checking add-graphql (created 2026-01-15):
- Delta adds "GraphQL Schema" requirement
- Searching codebase... found src/api/graphql.ts

Resolution: Both implemented. Will apply add-rest-api specs first,
then add-graphql specs (chronological order, newer takes precedence).
\`\`\`

**Output On Success**

\`\`\`
## Bulk Archive Complete

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/
- <change-2> -> archive/YYYY-MM-DD-<change-2>/

Spec sync summary:
- N delta specs synced to main specs
- No conflicts (or: M conflicts resolved)
\`\`\`

**Output On Partial Success**

\`\`\`
## Bulk Archive Complete (partial)

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/

Skipped M changes:
- <change-2> (user chose not to archive incomplete)

Failed K changes:
- <change-3>: Archive directory already exists
\`\`\`

**Output When No Changes**

\`\`\`
## No Changes to Archive

No active changes found. Use \`/opsx:new\` to create a new change.
\`\`\`

**Guardrails**
- Allow any number of changes (1+ is fine, 2+ is the typical use case)
- Always prompt for selection, never auto-select
- Detect spec conflicts early and resolve by checking codebase
- When both changes are implemented, apply specs in chronological order
- Skip spec sync only when implementation is missing (warn user)
- Show clear per-change status before confirming
- Use single confirmation for entire batch
- Track and report all outcomes (success/skip/fail)
- Preserve .openspec.yaml when moving to archive
- Archive directory target uses current date: YYYY-MM-DD-<name>
- If archive target exists, fail that change but continue with others`
  };
}

/**
 * Template for /opsx:verify slash command
 */
export function getOpsxVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Verify',
    description: 'Verify implementation matches change artifacts before archiving',
    category: 'Workflow',
    tags: ['workflow', 'verify', 'experimental'],
    content: `Verify that an implementation matches the change artifacts (specs, tasks, design).

**Input**: Optionally specify a change name after \`/opsx:verify\` (e.g., \`/opsx:verify add-auth\`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have implementation tasks (tasks artifact exists).
   Include the schema used for each change if available.
   Mark changes with incomplete tasks as "(In Progress)".

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used (e.g., "spec-driven")
   - Which artifacts exist for this change

3. **Get the change directory and load artifacts**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns the change directory and context files. Read all available artifacts from \`contextFiles\`.

4. **Initialize verification report structure**

   Create a report structure with three dimensions:
   - **Completeness**: Track tasks and spec coverage
   - **Correctness**: Track requirement implementation and scenario coverage
   - **Coherence**: Track design adherence and pattern consistency

   Each dimension can have CRITICAL, WARNING, or SUGGESTION issues.

5. **Verify Completeness**

   **Task Completion**:
   - If tasks.md exists in contextFiles, read it
   - Parse checkboxes: \`- [ ]\` (incomplete) vs \`- [x]\` (complete)
   - Count complete vs total tasks
   - If incomplete tasks exist:
     - Add CRITICAL issue for each incomplete task
     - Recommendation: "Complete task: <description>" or "Mark as done if already implemented"

   **Spec Coverage**:
   - If delta specs exist in \`openspec/changes/<name>/specs/\`:
     - Extract all requirements (marked with "### Requirement:")
     - For each requirement:
       - Search codebase for keywords related to the requirement
       - Assess if implementation likely exists
     - If requirements appear unimplemented:
       - Add CRITICAL issue: "Requirement not found: <requirement name>"
       - Recommendation: "Implement requirement X: <description>"

6. **Verify Correctness**

   **Requirement Implementation Mapping**:
   - For each requirement from delta specs:
     - Search codebase for implementation evidence
     - If found, note file paths and line ranges
     - Assess if implementation matches requirement intent
     - If divergence detected:
       - Add WARNING: "Implementation may diverge from spec: <details>"
       - Recommendation: "Review <file>:<lines> against requirement X"

   **Scenario Coverage**:
   - For each scenario in delta specs (marked with "#### Scenario:"):
     - Check if conditions are handled in code
     - Check if tests exist covering the scenario
     - If scenario appears uncovered:
       - Add WARNING: "Scenario not covered: <scenario name>"
       - Recommendation: "Add test or implementation for scenario: <description>"

7. **Verify Coherence**

   **Design Adherence**:
   - If design.md exists in contextFiles:
     - Extract key decisions (look for sections like "Decision:", "Approach:", "Architecture:")
     - Verify implementation follows those decisions
     - If contradiction detected:
       - Add WARNING: "Design decision not followed: <decision>"
       - Recommendation: "Update implementation or revise design.md to match reality"
   - If no design.md: Skip design adherence check, note "No design.md to verify against"

   **Code Pattern Consistency**:
   - Review new code for consistency with project patterns
   - Check file naming, directory structure, coding style
   - If significant deviations found:
     - Add SUGGESTION: "Code pattern deviation: <details>"
     - Recommendation: "Consider following project pattern: <example>"

8. **Generate Verification Report**

   **Summary Scorecard**:
   \`\`\`
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   \`\`\`

   **Issues by Priority**:

   1. **CRITICAL** (Must fix before archive):
      - Incomplete tasks
      - Missing requirement implementations
      - Each with specific, actionable recommendation

   2. **WARNING** (Should fix):
      - Spec/design divergences
      - Missing scenario coverage
      - Each with specific recommendation

   3. **SUGGESTION** (Nice to fix):
      - Pattern inconsistencies
      - Minor improvements
      - Each with specific recommendation

   **Final Assessment**:
   - If CRITICAL issues: "X critical issue(s) found. Fix before archiving."
   - If only warnings: "No critical issues. Y warning(s) to consider. Ready for archive (with noted improvements)."
   - If all clear: "All checks passed. Ready for archive."

**Verification Heuristics**

- **Completeness**: Focus on objective checklist items (checkboxes, requirements list)
- **Correctness**: Use keyword search, file path analysis, reasonable inference - don't require perfect certainty
- **Coherence**: Look for glaring inconsistencies, don't nitpick style
- **False Positives**: When uncertain, prefer SUGGESTION over WARNING, WARNING over CRITICAL
- **Actionability**: Every issue must have a specific recommendation with file/line references where applicable

**Graceful Degradation**

- If only tasks.md exists: verify task completion only, skip spec/design checks
- If tasks + specs exist: verify completeness and correctness, skip design
- If full artifacts: verify all three dimensions
- Always note which checks were skipped and why

**Output Format**

Use clear markdown with:
- Table for summary scorecard
- Grouped lists for issues (CRITICAL/WARNING/SUGGESTION)
- Code references in format: \`file.ts:123\`
- Specific, actionable recommendations
- No vague suggestions like "consider reviewing"`
  };
}
/**
 * Template for feedback skill
 * For collecting and submitting user feedback with context enrichment
 */
export function getFeedbackSkillTemplate(): SkillTemplate {
  return {
    name: 'feedback',
    description: 'Collect and submit user feedback about OpenSpec with context enrichment and anonymization.',
    instructions: `Help the user submit feedback about OpenSpec.

**Goal**: Guide the user through collecting, enriching, and submitting feedback while ensuring privacy through anonymization.

**Process**

1. **Gather context from the conversation**
   - Review recent conversation history for context
   - Identify what task was being performed
   - Note what worked well or poorly
   - Capture specific friction points or praise

2. **Draft enriched feedback**
   - Create a clear, descriptive title (single sentence, no "Feedback:" prefix needed)
   - Write a body that includes:
     - What the user was trying to do
     - What happened (good or bad)
     - Relevant context from the conversation
     - Any specific suggestions or requests

3. **Anonymize sensitive information**
   - Replace file paths with \`<path>\` or generic descriptions
   - Replace API keys, tokens, secrets with \`<redacted>\`
   - Replace company/organization names with \`<company>\`
   - Replace personal names with \`<user>\`
   - Replace specific URLs with \`<url>\` unless public/relevant
   - Keep technical details that help understand the issue

4. **Present draft for approval**
   - Show the complete draft to the user
   - Display both title and body clearly
   - Ask for explicit approval before submitting
   - Allow the user to request modifications

5. **Submit on confirmation**
   - Use the \`openspec feedback\` command to submit
   - Format: \`openspec feedback "title" --body "body content"\`
   - The command will automatically add metadata (version, platform, timestamp)

**Example Draft**

\`\`\`
Title: Error handling in artifact workflow needs improvement

Body:
I was working on creating a new change and encountered an issue with
the artifact workflow. When I tried to continue after creating the
proposal, the system didn't clearly indicate that I needed to complete
the specs first.

Suggestion: Add clearer error messages that explain dependency chains
in the artifact workflow. Something like "Cannot create design.md
because specs are not complete (0/2 done)."

Context: Using the spec-driven schema with <path>/my-project
\`\`\`

**Anonymization Examples**

Before:
\`\`\`
Working on /Users/john/mycompany/auth-service/src/oauth.ts
Failed with API key: sk_live_abc123xyz
Working at Acme Corp
\`\`\`

After:
\`\`\`
Working on <path>/oauth.ts
Failed with API key: <redacted>
Working at <company>
\`\`\`

**Guardrails**

- MUST show complete draft before submitting
- MUST ask for explicit approval
- MUST anonymize sensitive information
- ALLOW user to modify draft before submitting
- DO NOT submit without user confirmation
- DO include relevant technical context
- DO keep conversation-specific insights

**User Confirmation Required**

Always ask:
\`\`\`
Here's the feedback I've drafted:

Title: [title]

Body:
[body]

Does this look good? I can modify it if you'd like, or submit it as-is.
\`\`\`

Only proceed with submission after user confirms.`
  };
}
