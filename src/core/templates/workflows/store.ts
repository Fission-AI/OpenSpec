/**
 * Skill Template Workflow Modules
 *
 * The one door to shared upstream work: a thin, state-routed skill. Every
 * mechanic lives in deterministic CLI commands with JSON output; this
 * skill only reads the world, routes to exactly one situation, and ends
 * every reply with numbered next moves computed from disk state.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

const STORE_DOOR_INSTRUCTIONS = `The one door to shared upstream work: set it up, draft requirements, link implementing work, see status, archive into standing truth. The user should never need to know the commands — you run them.

---

${STORE_SELECTION_GUIDANCE}

**Read the world FIRST — never ask the user anything a command can answer:**

1. \`openspec store list --json\` — which stores exist on this machine
2. \`openspec context --json\` — what the current repo references and what is in motion upstream
3. If a store is relevant: \`openspec list --downstream --store <id> --json\` — where everything stands

**Route to exactly ONE situation:**

- **No store registered** → offer to create one: \`openspec store setup <kebab-id>\` (no other flags needed — it picks ~/openspec/<id>, seeds a working requirements workflow, and prints the whole loop). Derive the id from the team or product name.
- **Store exists, nothing drafted** → capture: ask ONE question at most ("what's the work?"), derive a kebab-case name, run \`openspec new change <name> --store <id>\`, then follow \`openspec instructions <artifact> --change <name> --store <id>\` stage by stage — read the schema_notes and instruction blocks, author each artifact from the conversation, and STOP at each review gate the instructions declare.
- **Upstream change in motion** → continue its next incomplete artifact via \`openspec status --change <name> --store <id>\`, then \`openspec instructions <next-artifact> ...\`.
- **User is implementing upstream work in a code repo** → \`openspec new change <impl-name> --serves <store-id>/<change>\` — this wires context and status automatically; their instructions will open with the upstream block.
- **The rollup shows "all serving changes complete — archive it"** → confirm with the user, then \`openspec archive <change> --store <id> --yes\`, and show the standing spec it produced (\`openspec list --specs --store <id>\`).
- **The team wants its own workflow stages** → \`openspec schema init <name> --artifacts <their,stage,names> --store <id>\` (their order IS the chain), then edit the generated instructions/ and templates/ files with them.
- **Anything else / just checking in** → show the rollup and read it back plainly.

**Rules:**

- Quote real command output for any status claim — never estimate progress.
- Ask at most ONE question per message, and only when no command can answer it.
- Respect the schema: read \`schema_notes\` and per-artifact instructions verbatim; do not assume proposal/design/tasks exist — the workflow is whatever the schema says.
- If implementation shows an upstream requirement is wrong, flag it upstream instead of silently diverging.
- End EVERY reply with 2-4 numbered next moves computed from the current disk state, exactly one marked **(Recommended)**, each naming the real command it runs.`;

export function getStoreSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-store',
    description:
      "One door to shared upstream work (stores): set up a team store, draft requirements under the team's workflow, link implementing changes with --serves, show live cross-repo status, and archive approved work into standing specs. Use when the user mentions team requirements, shared or upstream work, a store, cross-repo status, or handing work to other repos.",
    instructions: STORE_DOOR_INSTRUCTIONS,
  };
}

export function getOpsxStoreCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Store',
    description:
      'One door to shared upstream work: set up, draft, link, status, archive',
    category: 'Workflow',
    tags: ['workflow', 'stores', 'experimental'],
    content: STORE_DOOR_INSTRUCTIONS,
  };
}
