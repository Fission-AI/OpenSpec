/**
 * Shared store-selection guidance for skill template workflows.
 *
 * Interpolated into every workflow's instructions so generated skills
 * consistently teach how to target a registered store with `--store <id>`.
 */
export const STORE_SELECTION_GUIDANCE = `**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run \`openspec store list --json\` to discover registered store ids, then add \`--store <id>\` to every \`openspec\` command in this workflow. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local \`openspec/\` root.`;
