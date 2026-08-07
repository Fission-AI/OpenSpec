/**
 * Shared store-selection guidance for skill template workflows.
 *
 * Interpolated into every workflow's instructions so generated skills
 * consistently teach how to target a registered store with `--store <id>`.
 */
export const STORE_SELECTION_GUIDANCE = `**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run \`openspec store list --json\` to discover registered store ids, then pass \`--store <id>\` on the commands that read or write specs and changes (\`new change\`, \`status\`, \`instructions\`, \`list\`, \`show\`, \`validate\`, \`archive\`, \`doctor\`, \`context\`, \`view\`). Once selected, treat \`--store <id>\` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run \`openspec status --change "<name>" --json --store "<id>"\`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local \`openspec/\` root.`;
