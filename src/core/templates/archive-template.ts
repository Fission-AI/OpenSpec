import { baseGuardrails } from './skill-common-template.js';

export const archiveFrontmatter = `---
name: lightspec-archive
description: Archive a deployed LightSpec change and update specs.
disable-model-invocation: true
user-invocable: true
metadata:
  source: lightspec
  workflow: archive
---`;

const archiveSteps = `**Steps**
1. Determine the change ID to archive:
   - If this prompt already includes a specific change ID (for example inside a \`<ChangeId>\` block populated by slash-command arguments), use that value after trimming whitespace.
   - If the conversation references a change loosely (for example by title or summary), run \`lightspec list\` to surface likely IDs, share the relevant candidates, and confirm which one the user intends.
   - Otherwise, review the conversation, run \`lightspec list\`, and ask the user which change to archive; wait for a confirmed change ID before proceeding.
   - If you still cannot identify a single change ID, stop and tell the user you cannot archive anything yet.
2. Validate the change ID by running \`lightspec list\` (or \`lightspec show <id>\`) and stop if the change is missing, already archived, or otherwise not ready to archive.
3. Run \`lightspec archive <id> --yes\` so the CLI moves the change and applies spec updates without prompts (use \`--skip-specs\` only for tooling-only work).
4. Review the command output to confirm the target specs were updated and the change landed in \`changes/archive/\`.
5. Validate with \`lightspec validate --strict --no-interactive\` and inspect with \`lightspec show <id>\` if anything looks off.`;

const archiveReferences = `**Reference**
- Use \`lightspec list\` to confirm change IDs before archiving.
- Inspect refreshed specs with \`lightspec list --specs\` and address any validation issues before handing off.`;

export const archiveTemplate = [
  baseGuardrails,
  archiveSteps,
  archiveReferences,
].join('\n\n');
