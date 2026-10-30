/**
 * The artifact loop shared by propose and ff: write every artifact the apply
 * phase transitively depends on, in dependency order, grounded in the project.
 *
 * How to write one artifact (instruction fields, output path, delegation)
 * is `writingAnArtifact()` in references.ts. This loop decides which
 * artifacts to write and when to stop; each rule in it answers a reported
 * failure (#788, #1260, #1399, #1412, #339).
 */

/**
 * Read what the project already specifies before planning anything. Agents
 * that read the existing specs wrote better proposals almost every time, but
 * most never opened them when the step was only implied, so it is a step of
 * its own, ahead of the first draft.
 */
export function readExistingSpecsStep(n: number): string {
  return `${n}. **Read the related specs**

   Run \`openspec list --specs --json\`, then read each spec this change could touch in full: \`openspec show "<spec-id>" --type spec\`. Keep the names they use, reuse an existing capability's exact path rather than a near-duplicate, describe today's behavior as they do, and call out any conflict with a current requirement. If the change alters what an existing requirement promises (a new field its export or listing must now carry), it needs a MODIFIED delta too. If no capability is related, say so in one line and continue.`;
}

/**
 * Steps "get the artifact build order" and "create every artifact in the
 * required set", numbered from `first`.
 *
 * @param progress - the progress line prefix each workflow prints
 * @param clarifyWhen - how unclear an artifact's context must be before the
 *   workflow stops to ask; propose and ff hold different thresholds (#1837)
 */
export function artifactLoopSteps(first: number, progress: string, clarifyWhen: string): string {
  return `${first}. **Find the artifacts to write**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   The set to write is \`applyRequires\` plus every artifact those reach through \`requires\` edges (spec-driven: proposal, specs, design, tasks). Follow the edges, not \`status\`: status only checks that files exist, so a \`done\` artifact can still depend on a missing one. Leave artifacts outside the set alone.

${first + 1}. **Write them, in dependency order**

   Track the set in a todo list. For each \`ready\` artifact:
   - Run \`openspec instructions <artifact-id> --change "<name>" --json\`, and re-read its finished dependencies from disk.
   - **Look at the project first**, read-only and in proportion to the change: its \`context\` and \`rules\`, then the code, tests, and docs it touches (the code may live outside the OpenSpec root). Reuse what you find for later artifacts. If the code already does part of the request, say so and plan only the gap, which can be a spec update alone. If the target is unclear, ask. With no code yet, or none you can read, say so. Keep what you saw apart from what you assume, and raise conflicts with the specs rather than settling them quietly. Do this now, not as a task for later.
   - Write it as **Writing an artifact** below describes, show "${progress}<artifact-id>", and re-run status: one artifact can unblock others.

   An artifact is finished when it is written or \`skipped\` (the change declares \`skip_specs\`, so its files must not exist). Skip any other only when its own \`instruction\`, read with \`openspec instructions\`, marks it optional, as spec-driven's design.md does; never skip specs by your own judgment. Say what you skipped and why, do not revisit it, and keep going: a skipped dependency does not block what comes after it.

   Stop when every artifact in the set is finished. If one needs input from the user (${clarifyWhen}), ask, then continue.`;
}
