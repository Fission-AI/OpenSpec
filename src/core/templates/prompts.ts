const BT = String.fromCharCode(96);

export const BASE_GUARDRAILS = `**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to ${BT}openspec/AGENTS.md${BT} (located inside the ${BT}openspec/${BT} directory—run ${BT}ls openspec${BT} or ${BT}openspec update${BT} if you don't see it) if you need additional OpenSpec conventions or clarifications.
- If the ${BT}openspec${BT} CLI is not installed or available in the shell, guide the user to install it globally via ${BT}npm install -g @fission-ai/openspec${BT} before proceeding.`;

export const PROPOSAL_GUARDRAILS = `${BASE_GUARDRAILS}
- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.
- Do not write any code during the proposal stage. Only create design documents (proposal.md, tasks.md, design.md, and spec deltas). Implementation happens in the apply stage after approval.`;

export const PROPOSAL_STEPS = `**Steps**
1. Review ${BT}openspec/project.md${BT}, run ${BT}openspec list${BT} and ${BT}openspec list --specs${BT}, and inspect related code or docs (e.g., via ${BT}rg${BT}/${BT}ls${BT}) to ground the proposal in current behaviour; note any gaps that require clarification.
2. Choose a unique verb-led ${BT}change-id${BT} and scaffold ${BT}proposal.md${BT}, ${BT}tasks.md${BT}, and ${BT}design.md${BT} (when needed) under ${BT}openspec/changes/<id>/${BT}.
3. Map the change into concrete capabilities or requirements, breaking multi-scope efforts into distinct spec deltas with clear relationships and sequencing.
4. Capture architectural reasoning in ${BT}design.md${BT} when the solution spans multiple systems, introduces new patterns, or demands trade-off discussion before committing to specs.
5. Draft spec deltas in ${BT}changes/<id>/specs/<capability>/spec.md${BT} (one folder per capability) using ${BT}## ADDED|MODIFIED|REMOVED Requirements${BT} with at least one ${BT}#### Scenario:${BT} per requirement and cross-reference related capabilities when relevant.
6. Draft ${BT}tasks.md${BT} as an ordered list of small, verifiable work items that deliver user-visible progress, include validation (tests, tooling), and highlight dependencies or parallelizable work.
7. Validate with ${BT}openspec validate <id> --strict${BT} and resolve every issue before sharing the proposal.`;

export const PROPOSAL_REFERENCES = `**Reference**
- Use ${BT}openspec show <id> --json --deltas-only${BT} or ${BT}openspec show <spec> --type spec${BT} to inspect details when validation fails.
- Search existing requirements with ${BT}rg -n "Requirement:|Scenario:" openspec/specs${BT} before writing new ones.
- Explore the codebase with ${BT}rg <keyword>${BT}, ${BT}ls${BT}, or direct file reads so proposals align with current implementation realities.`;

export const APPLY_STEPS = `**Steps**
Track these steps as TODOs and complete them one by one.
1. Read ${BT}changes/<id>/proposal.md${BT}, ${BT}design.md${BT} (if present), and ${BT}tasks.md${BT} to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
3. Confirm completion before updating statuses—make sure every item in ${BT}tasks.md${BT} is finished.
4. Update the checklist after all work is done so each task is marked ${BT}- [x]${BT} and reflects reality.
5. Reference ${BT}openspec list${BT} or ${BT}openspec show <item>${BT} when additional context is required.`;

export const APPLY_REFERENCES = `**Reference**
- Use ${BT}openspec show <id> --json --deltas-only${BT} if you need additional context from the proposal while implementing.`;

export const ARCHIVE_STEPS = `**Steps**
1. Determine the change ID to archive:
   - If this prompt already includes a specific change ID (for example inside a ${BT}<ChangeId>${BT} block populated by slash-command arguments), use that value after trimming whitespace.
   - If the conversation references a change loosely (for example by title or summary), run ${BT}openspec list${BT} to surface likely IDs, share the relevant candidates, and confirm which one the user intends.
   - Otherwise, review the conversation, run ${BT}openspec list${BT}, and ask the user which change to archive; wait for a confirmed change ID before proceeding.
   - If you still cannot identify a single change ID, stop and tell the user you cannot archive anything yet.
2. Validate the change ID by running ${BT}openspec list${BT} (or ${BT}openspec show <id>${BT}) and stop if the change is missing, already archived, or otherwise not ready to archive.
3. Run ${BT}openspec archive <id> --yes${BT} so the CLI moves the change and applies spec updates without prompts (use ${BT}--skip-specs${BT} only for tooling-only work).
4. Review the command output to confirm the target specs were updated and the change landed in ${BT}changes/archive/${BT}.
5. Validate with ${BT}openspec validate --strict${BT} and inspect with ${BT}openspec show <id>${BT} if anything looks off.`;

export const ARCHIVE_REFERENCES = `**Reference**
- Use ${BT}openspec list${BT} to confirm change IDs before archiving.
- Inspect refreshed specs with ${BT}openspec list --specs${BT} and address any validation issues before handing off.`;