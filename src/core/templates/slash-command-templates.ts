export type SlashCommandId = 'proposal' | 'apply' | 'archive';

const baseGuardrails = `**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to \`openspec/AGENTS.md\` (located inside the \`openspec/\` directory—run \`ls openspec\` or \`openspec update\` if you don't see it) if you need additional OpenSpec conventions or clarifications.`;

const proposalGuardrails = `${baseGuardrails}\n- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.`;

const proposalSteps = `**Steps**
1. Review \`openspec/project.md\`, run \`openspec list\` and \`openspec list --specs\`, and inspect related code or docs (e.g., via \`rg\`/\`ls\`) to ground the proposal in current behaviour; note any gaps that require clarification.
2. Choose a unique verb-led \`change-id\` and create the change directory \`openspec/changes/<id>/\`.
3. Create \`proposal.md\` in \`openspec/changes/<id>/\`:
   - **CRITICAL**: Check if \`openspec/templates/proposal.md.template\` exists
   - If exists: Read the template file and replace variables (\`{{changeId}}\` → actual change-id, \`{{date}}\` → current date in YYYY-MM-DD format)
   - If not exists: Use the default structure from \`openspec/AGENTS.md\` (see "Proposal Structure" section)
4. Create \`tasks.md\` in \`openspec/changes/<id>/\`:
   - **CRITICAL**: Check if \`openspec/templates/tasks.md.template\` exists
   - If exists: Read the template file and replace variables (\`{{changeId}}\` → actual change-id, \`{{date}}\` → current date in YYYY-MM-DD format)
   - If not exists: Use the default structure from \`openspec/AGENTS.md\` (see "Proposal Structure" section)
5. Create \`design.md\` in \`openspec/changes/<id>/\` (only when needed—see criteria in \`openspec/AGENTS.md\`):
   - **CRITICAL**: Check if \`openspec/templates/design.md.template\` exists
   - If exists: Read the template file and replace variables (\`{{changeId}}\` → actual change-id, \`{{date}}\` → current date in YYYY-MM-DD format)
   - If not exists: Use the default structure from \`openspec/AGENTS.md\` (see "Proposal Structure" section)
6. Map the change into concrete capabilities or requirements, breaking multi-scope efforts into distinct spec deltas with clear relationships and sequencing.
7. Create spec deltas in \`openspec/changes/<id>/specs/<capability>/spec.md\` (one folder per capability):
   - **CRITICAL**: Check if \`openspec/templates/spec.md.template\` exists
   - If exists: Read the template file and replace variables (\`{{changeId}}\` → actual change-id, \`{{date}}\` → current date in YYYY-MM-DD format, \`{{capability}}\` → capability name)
   - If not exists: Use \`## ADDED|MODIFIED|REMOVED Requirements\` format with at least one \`#### Scenario:\` per requirement
   - Cross-reference related capabilities when relevant
8. Validate with \`openspec validate <id> --strict\` and resolve every issue before sharing the proposal.`;

const proposalReferences = `**Reference**
- **Template Processing**: For each file type (proposal, tasks, design, spec), always check \`openspec/templates/<type>.md.template\` first. If the template exists, read it and replace all variables before writing the file. Template variables:
  - \`{{changeId}}\` → the actual change-id (e.g., \`add-user-auth\`)
  - \`{{date}}\` → current date in YYYY-MM-DD format (e.g., \`2025-11-14\`)
  - \`{{capability}}\` → capability name (only used in spec.md, e.g., \`user-auth\`)
- Use \`openspec show <id> --json --deltas-only\` or \`openspec show <spec> --type spec\` to inspect details when validation fails.
- Search existing requirements with \`rg -n "Requirement:|Scenario:" openspec/specs\` before writing new ones.
- Explore the codebase with \`rg <keyword>\`, \`ls\`, or direct file reads so proposals align with current implementation realities.`;

const applySteps = `**Steps**
Track these steps as TODOs and complete them one by one.
1. Read \`openspec/changes/<id>/proposal.md\`, \`design.md\` (if present), and \`tasks.md\` to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
3. Confirm completion before updating statuses—make sure every item in \`tasks.md\` is finished.
4. Update the checklist after all work is done so each task is marked \`- [x]\` and reflects reality.
5. Reference \`openspec list\` or \`openspec show <item>\` when additional context is required.`;

const applyReferences = `**Reference**
- Use \`openspec show <id> --json --deltas-only\` if you need additional context from the proposal while implementing.`;

const archiveSteps = `**Steps**
1. Determine the change ID to archive:
   - If this prompt already includes a specific change ID (for example inside a \`<ChangeId>\` block populated by slash-command arguments), use that value after trimming whitespace.
   - If the conversation references a change loosely (for example by title or summary), run \`openspec list\` to surface likely IDs, share the relevant candidates, and confirm which one the user intends.
   - Otherwise, review the conversation, run \`openspec list\`, and ask the user which change to archive; wait for a confirmed change ID before proceeding.
   - If you still cannot identify a single change ID, stop and tell the user you cannot archive anything yet.
2. Validate the change ID by running \`openspec list\` (or \`openspec show <id>\`) and stop if the change is missing, already archived, or otherwise not ready to archive.
3. Run \`openspec archive <id> --yes\` so the CLI moves the change and applies spec updates without prompts (use \`--skip-specs\` only for tooling-only work).
4. Review the command output to confirm the target specs were updated and the change landed in \`openspec/changes/archive/\`.
5. Validate with \`openspec validate --strict\` and inspect with \`openspec show <id>\` if anything looks off.`;

const archiveReferences = `**Reference**
- Use \`openspec list\` to confirm change IDs before archiving.
- Inspect refreshed specs with \`openspec list --specs\` and address any validation issues before handing off.`;

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: [proposalGuardrails, proposalSteps, proposalReferences].join('\n\n'),
  apply: [baseGuardrails, applySteps, applyReferences].join('\n\n'),
  archive: [baseGuardrails, archiveSteps, archiveReferences].join('\n\n')
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}
