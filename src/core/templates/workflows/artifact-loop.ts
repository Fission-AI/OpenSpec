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
  return `${n}. **Read the existing specs**

   Run \`openspec list --specs --json\` for the capabilities the project already specifies. For every capability this change could touch, read the spec in full with \`openspec show "<spec-id>" --type spec\`. Use what you read: keep the existing names for components and behaviors, describe today's behavior accurately, reuse an existing capability's exact path instead of a near-duplicate, and call out any conflict with a current requirement. When the change alters what an existing requirement promises (a new field its export, listing, or format must now carry), add a MODIFIED delta for that requirement too. If no capability is related, say so in one line and continue.`;
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
  return `${first}. **Get the artifact build order**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Read \`applyRequires\` (the artifact ids implementation needs), \`artifacts\`, each with its \`status\` and its \`requires\` edges, and the \`changeRoot\` and \`artifactPaths\` paths.

${first + 1}. **Create every artifact in the required set**

   The required set is \`applyRequires\` plus every artifact reachable from those by following the \`requires\` edges in \`status --json\`; walk them transitively (spec-driven closes over proposal, specs, design, tasks). Leave artifacts outside that set alone. \`status\` is file-existence only, so an \`applyRequires\` artifact reading \`done\` does NOT mean its dependencies exist. Use each artifact's \`requires\` edges, not its \`status\`, to build the required set: a \`done\` artifact still lists what it depends on.

   Track the set in a todo list. For each \`ready\` artifact, in dependency order:
   - Run \`openspec instructions <artifact-id> --change "<name>" --json\`.
   - Read any completed dependency files, re-reading them from disk every time.
   - **Inspect the relevant project before drafting**. Read \`context\` and \`rules\` first, then the relevant implementation, nearby tests, configuration, and documentation outside \`openspec/\`. Keep inspection read-only and proportional to the change, and reuse findings for later artifacts. If the code already does part of what is asked, say so and plan only the gap, which can be a spec update alone; the planning home may be separate from the code. If the target is unclear, ask. For greenfield or non-code changes, inspect the available structure and relevant documents. If source is unavailable, state the limitation. Distinguish observed behavior from assumptions and proposed additions, and surface conflicts with existing specs instead of silently deciding which is correct. Do this discovery now, not as an "explore the codebase" task for later.
   - Write it as **Writing an artifact** below describes, then show "${progress}<artifact-id>".
   - Re-run \`openspec status --change "<name>" --json\` and re-check - creating one can unblock others.

   **Continue until every artifact in the required set exists (not just \`apply.requires\`).** Create every artifact in the required set that is missing. An artifact reading \`status: "skipped"\` is satisfied (the change declares \`skip_specs\`), and its files must NOT exist. Skip any other artifact only when status reports it skipped, or when its own \`instruction\` says it is conditional: run \`openspec instructions <artifact-id> --change "<name>" --json\` and skip only if its \`instruction\` field marks it optional. Spec-driven's \`design.md\` qualifies; \`specs\` qualifies only through \`skipped\`, never by your own judgment. Tell the user, and do not reconsider it. Dependencies are enablers, not gates: if an artifact is still \`blocked\` only because you skipped a conditional dependency, write it anyway.

   Stop when every artifact in the required set is \`done\`, \`skipped\`, or was deliberately skipped. **If an artifact requires user input** (${clarifyWhen}), ask the user to clarify, then continue.`;
}
