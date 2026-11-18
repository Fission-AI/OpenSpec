/**
 * Gotchas: concrete corrections to mistakes agents made with these skills,
 * each one seen in real agent sessions and fixed by the sentence here. They
 * sit near the top of a skill so the agent reads them before it meets the
 * situation.
 */

/** Seen: apply ticked every task while `openspec validate` failed, and called the change done. */
const NOT_DONE_WHILE_INVALID = `- **A change is not done while \`openspec validate "<name>"\` fails.** Run it before you tick the last task. If it fails, leave that task unticked and report the error. A change with no delta specs fails until its \`.openspec.yaml\` has \`skip_specs: true\`: add that line when the proposal says callers see no change in behavior; otherwise stop and say the specs are missing.`;

/** Seen: archive dropped a sentence the main spec gained after the change was planned. */
const MODIFIED_REPLACES_WHOLE = `- **A MODIFIED requirement replaces the whole requirement in the main spec.** If the main spec now says something the delta's copy does not (it was edited after the change was planned), merging deletes it. Before you merge, run \`openspec show "<name>" --type change --json --diff\` and read each MODIFIED requirement's \`diff\`: a \`-\` line the change did not plan is text the merge would delete. If the main spec has a sentence the delta lacks, carry it into the delta, or stop without merging and name the sentence that would be lost. Never drop it on your own judgment, even when the code does not use it.`;

/** Seen: sync merged a `notes.md` written like a delta, which validate and archive never read. */
const ONLY_SPEC_MD = `- **Only files named \`spec.md\` are delta specs.** \`openspec validate\` and \`openspec archive\` read nothing else under \`specs/\`. Merge no other file, even when \`existingOutputPaths\` lists it or it is written like a delta; name it in your summary instead.`;

/** Seen: propose added a second requirement beside one that already promised the behavior, or contradicted it. */
const CHANGE_WHERE_IT_LIVES = `- **Change a promise where it lives.** If an existing requirement already promises the behavior, or the opposite of it, change that requirement with MODIFIED. Never add a second requirement that repeats or contradicts it. Only a promise no requirement makes gets its own ADDED requirement.`;

/** Seen: propose appended a sixth and seventh SHALL to a requirement that already made five promises. */
const ONE_SHALL = `- **One SHALL per requirement.** Do not add a SHALL to a requirement that has one. If a requirement you modify already makes several promises, keep one and move each other into its own ADDED requirement, scenarios included, so no promise is stated twice.`;

/** Seen: a plan to fix code that drifted from a correct spec rewrote that spec, and lost blind review for unasked scope. */
const RESTORING_A_PROMISE = `- **A fix that brings the code back to what a spec already promises changes no spec.** Write no delta for it: add \`skip_specs: true\` to the change's \`.openspec.yaml\`, and name in the proposal the requirement the fix restores.`;

/** Seen: plans lost blind review for artifacts that disagreed, unrequested scope, untestable scenarios, and missed cases. */
const READ_THE_PLAN_BACK = `- **Read the plan back before you show it.** Reread every artifact together and fix four things: places where the proposal, specs, design and tasks disagree; anything the request did not ask for; scenarios a test could not check as written (give exact values, outputs and errors); and any case the request covers that the plan leaves out.`;

/** Seen: final replies restated the files, buried the one decision the user had to check, and stopped without a next step. */
export const REPLY_GOTCHA = `- **Make the last message easy to take in at a glance.** Lead with what was done and where. Put each decision, assumption or problem the user should check on its own line. Leave out what the files already say and checks that found nothing. End with the next step.`;

/** Seen: tasks lost blind review for having no done check, testing everything in one last task, and leaving a broken existing test. */
const CHECKABLE_TASKS = `- **Every task says how to check it.** Keep tasks small, and give each one the test or command that shows it is done, with the scenario's exact values. Add tests only for behavior the change makes or restores, and plan the update of any existing test the change will break.`;

/** Seen: after a merge the user had to reread every requirement, with nothing to say which ones matched what they approved. */
export const SPEC_REVIEW_NOTE = `run \`openspec show "<name>" --type change --json --diff\` with the same selected-root flags, and end your summary with a short review note that tells the user what they can skip:
   - **Matches the approved delta:** MODIFIED requirements whose \`diff\` is empty.
   - **Agent-checked:** ADDED, REMOVED and RENAMED requirements. They have no diff, so say you checked them against the main spec.
   - **Read this:** every non-empty \`diff\` or \`warning\`, with what differs. Never decide on your own that a difference is fine.`;

export const SPEC_WRITING_GOTCHAS = `## Gotchas

${CHANGE_WHERE_IT_LIVES}
${ONE_SHALL}
${CHECKABLE_TASKS}
${REPLY_GOTCHA}`;

/** For the skills that write a plan without asking first. Update confirms each edit, so it has only the rules above. */
export const PLAN_WRITING_GOTCHAS = `${SPEC_WRITING_GOTCHAS}
${RESTORING_A_PROMISE}
${READ_THE_PLAN_BACK}`;

export const APPLY_GOTCHAS = `## Gotchas

${NOT_DONE_WHILE_INVALID}
${REPLY_GOTCHA}`;

export const MERGE_GOTCHAS = `## Gotchas

${MODIFIED_REPLACES_WHOLE}
${ONLY_SPEC_MD}
${REPLY_GOTCHA}`;
