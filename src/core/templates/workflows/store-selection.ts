/**
 * Shared store-selection guidance for skill template workflows.
 *
 * Interpolated into every workflow's instructions so generated skills
 * consistently teach how to target a registered store with `--store <id>`.
 */
export const STORE_SELECTION_GUIDANCE = `**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run \`openspec store list --json\` to discover registered store ids, then pass \`--store <id>\` on the commands that act on a selected root (\`new change\`, \`schema init\`, \`status\`, \`instructions\`, \`list\`, \`show\`, \`validate\`, \`archive\`, \`doctor\`, \`context\`, \`schemas\`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local \`openspec/\` root. **Upstream links:** when new work implements or serves work tracked in a store (the user names it, or \`openspec context\` lists it under "In motion"), create the change with \`--serves <store-id>/<change>\` — the link wires context and status automatically, and the change's instructions will carry the upstream artifacts to read first.`;
