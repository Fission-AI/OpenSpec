/**
 * Archive: finish a change by merging its delta specs into the main specs and
 * moving it to the archive.
 *
 * `openspec archive` already does the merge, validates the result, and moves
 * the change, refusing anything it cannot apply cleanly. The workflow lets the
 * CLI do that work and keeps the agent's part to choosing the change and
 * relaying each confirmation to the user.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { optionalWorkflow } from '../optional-workflow.js';
import { BEFORE_YOU_START, RUNTIME_INPUTS } from './references.js';

/**
 * A requirement the delta ADDs can already exist in the main spec, for
 * example after a hand sync that worded it differently. `openspec archive`
 * refuses that; the sync workflow treats it as an update.
 */
const ALREADY_EXISTS_RECOVERY = optionalWorkflow(
  'sync',
  'offer to run `/opsx:sync` for this change (it updates a requirement that already exists), then archive with `--yes --skip-specs` once sync succeeds',
  'say that the main spec already has that requirement, and offer to archive with `--yes --skip-specs` once the user has reconciled it'
);

function getArchiveInstructions(input: string): string {
  return `Archive a completed change: merge its delta specs into the main specs, validate them, and move the change to the archive. The CLI does all three, or refuses and changes nothing; your part is choosing the change and asking the user about each warning.

${BEFORE_YOU_START}

**Input**: ${input}

**Steps**

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run \`openspec list --json\` and ask, listing active changes with their schema. Say "Using change: <name>" and how to pick another (\`/opsx:archive <other>\`).

2. **Load advisory inputs.** Run \`openspec instructions archive --change "<name>" --json\`. ${RUNTIME_INPUTS} This lookup is advisory and optional: if it fails or returns invalid JSON (for example on an older CLI), continue with neither. Do not report an error and do not stop.

3. **Check unfinished artifacts.** Run \`openspec status --change "<name>" --json\` and note any artifact that is neither \`done\` nor \`skipped\`. The preview in step 4 archives at once when nothing else needs confirmation, so if any artifact is unfinished, list them and ask whether to continue first. On "Cancel", stop.

4. **Preview.**
   \`\`\`bash
   openspec archive "<name>" --json
   \`\`\`
   Without \`--yes\` the CLI moves nothing that needs confirmation. Read the JSON:
   - \`archive\` is set: nothing needed confirmation, so the CLI already archived the change. Go to step 6.
   - \`archive_confirmation_required\` (main specs will change) or \`archive_tasks_incomplete\`: show each message, plus any unfinished artifact, and ask: "Archive and update the main specs (recommended)", "Archive without updating specs", or "Cancel".
   - \`archive_change_not_found\`: the name does not match an active change. Show the message, which lists the available changes, and stop.
   - \`archive_spec_update_failed\` with "already exists": a requirement this change ADDs is already in the main spec. Show the message and ${ALREADY_EXISTS_RECOVERY}.
   - Any other code is a problem \`--yes\` cannot fix. Show the \`message\` and \`fix\`, then stop: nothing has moved.

   Route on the answer:
   - "Cancel" — stop, do not archive. Nothing has moved.
   - Archive and update specs — run step 5 with \`--yes\`.
   - Archive without updating specs — run step 5 with \`--yes --skip-specs\`.
   - Anything else — ask again rather than archiving.

5. **Archive.**
   \`\`\`bash
   openspec archive "<name>" --json --yes
   \`\`\`
   Add \`--skip-specs\` only when the user chose not to update specs. Never pass \`--no-validate\`. If the response still has no \`archive\` object, show each \`status\` message and \`fix\` and stop: the CLI refused, so the change and main specs are as they were.

6. **Summarize** from the \`archive\` object: \`archivedAs\` and \`path\`, whether \`specsUpdated\`, the requirement \`totals\`, and any warning the user accepted.

**Guardrails**
- Let \`openspec archive\` merge, validate, and move the change. Do not edit main specs or move \`changeRoot\` by hand
- Pass \`--yes\` only after the user agrees to what the preview reported`;
}

export function getArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-archive-change',
    description: 'Archive a completed OpenSpec change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete. Also use when the user says "openspec archive" or "opsx archive".',
    instructions: getArchiveInstructions(
      'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.'
    ),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Archive',
    description: 'Archive a completed change in the experimental workflow',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental'],
    content: getArchiveInstructions(
      'Optionally specify a change name after `/opsx:archive` (e.g., `/opsx:archive add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.'
    ),
  };
}
