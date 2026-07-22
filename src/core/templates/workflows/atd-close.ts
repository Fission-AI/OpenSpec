/**
 * ATD close workflow templates (skill + slash command).
 *
 * Step 5 of the ATD journey: façade over the generic archive workflow with a
 * hard completion gate. Close never performs closure work (publication, Jira
 * closure) and never offers the generic archive's incomplete-work override;
 * it retains the archive workflow's delta-spec sync assessment.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { buildArchiveChangeBody } from './archive-change.js';
import { buildAtdSchemaGuard, buildAtdJourneyFooter } from './atd-workflow-shared.js';

const ATD_CLOSE_INSTRUCTIONS = buildArchiveChangeBody({
  intro: 'Close an ATD change: hard-gate on every tracked task being complete, then archive (step 5 of the ATD journey).',
  inputLine: 'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.',
  completionSection: `2. **Check ATD schema and status**

   Run \`openspec status --change "<name>" --json\` and parse:
   - \`schemaName\`: The workflow being used
   - \`planningHome\`, \`changeRoot\`, \`artifactPaths\`, and \`actionContext\`: path and scope context (used by the sync and archive steps)
${buildAtdSchemaGuard('openspec-archive-change')}
3. **Hard completion gate (no override)**

   Run \`openspec instructions apply --change "<name>" --json\` and read \`state\`.

   Archive is allowed ONLY when \`state\` is \`"all_done"\` — every tracked task checkbox is complete, including the ATD closure tasks (standards conformance, solution-document reconciliation, publication, Jira closure). Do not rely on any particular task-group heading; the apply state covers all tracked work.

   If \`state\` is anything other than \`"all_done"\`:
   - List every incomplete artifact and unchecked task from the response
   - Direct the developer to \`atd-change-apply\` to finish the work
   - STOP. There is no override: close never archives incomplete work, and never performs publication, Jira closure, or any other closure work itself.`,
  // The default ATD install does not carry the generic sync workflow, so close
  // states the merge procedure inline instead of delegating to it.
  syncInstruction: `To sync, perform the merge yourself, inline and synchronously: for each capability with a delta spec, apply its ADDED requirements to \`<planningHome.root>/openspec/specs/<capability>/spec.md\` (creating the file if needed), update MODIFIED requirements while leaving their untouched scenarios intact, delete REMOVED requirements, and move RENAMED requirements to their new names. Do not delegate the merge to a background task — step 5 would move \`changeRoot\` out from under a sync that is still reading it, leaving the change archived and the main specs never updated.`,
  summaryTailBullets: `   - Spec sync status (synced / sync skipped / no delta specs)`,
  outputSections: `**Output On Success**

\`\`\`markdown
## Change Closed

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** the archive path derived from \`planningHome.changesDir\`/YYYY-MM-DD-<name>/
**Specs:** <"✓ Synced to main specs" only if the step 4 verification passed; otherwise "No delta specs" or "Sync skipped">

All tracked tasks complete, including the ATD closure tasks.
\`\`\`

**Output On Gate Failure**

\`\`\`markdown
## Close Blocked

**Change:** <change-name>
**Schema:** <schema-name>

Apply state is not \`all_done\`. Incomplete items:
- [ ] <each missing artifact or unchecked task>

Finish these with \`atd-change-apply\`, then run close again. Close has no override.
\`\`\``,
  guardrails: `- Always prompt for change selection if not provided
- Accept only \`atd-sdlc\` and \`atd-sdlc-lite\` changes; direct others to the generic archive workflow
- Never archive unless \`openspec instructions apply --json\` reports \`state: "all_done"\` — no override, no exceptions
- Never perform publication, Jira closure, or any other closure work here — that work lives in the apply-phase closure tasks
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- If sync is requested, perform the delta-spec merge inline (agent-driven) and verify it before archiving
- Never archive while a spec sync is still in flight — merge inline and verify the main specs before moving \`changeRoot\`
- If delta specs exist, always run the sync assessment and show the combined summary before prompting`,
  outro: buildAtdJourneyFooter(
    5,
    'This is the final step: a successful archive completes the journey. Incomplete work always routes back to `atd-change-apply`.'
  ),
});

export function getAtdCloseSkillTemplate(): SkillTemplate {
  return {
    name: 'atd-change-close',
    description:
      'Close an ATD change: require every tracked task complete (no override), assess delta-spec sync, then archive. Step 5 of the ATD journey; use after atd-change-verify.',
    instructions: ATD_CLOSE_INSTRUCTIONS,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAtdCloseCommandTemplate(): CommandTemplate {
  return {
    name: 'atd-close',
    description: 'Close an ATD change: hard completion gate, then archive (step 5 of the ATD journey)',
    category: 'Workflow',
    tags: ['workflow', 'atd', 'close'],
    content: ATD_CLOSE_INSTRUCTIONS,
  };
}
