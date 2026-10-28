/**
 * The router's guides: how to do the work well, whichever skill is running.
 * A skill's steps say what to do in order; a guide holds the judgment a step
 * leaves to you. Each guide covers one topic and states nothing the skills
 * or the schema already say.
 */

export interface OpenSpecGuide {
  path: string;
  content: string;
}

const CHANGES = `# Sizing a change

A change is one outcome a reviewer can accept or reject in one sitting, and that can ship on its own.

**Start from what exists.** Read the related specs and code before planning. If the code already does part of the request, plan only the gap. If it does all of it, the change may be a spec update alone, or nothing at all.

**Split it when the parts:**
- could ship, or be rolled back, on their own (a refactor and the feature built on it);
- need different reviewers (a public API change and an internal cleanup);
- invite a yes to one part and a no to another.

**Keep it together when** one part is useless without the other.

When you split, say so before writing anything: name each change, what it delivers, and the order. Plan the first one; list the rest so the user can start them next. Never widen a change past the request; name what you left out instead.

**Name the change for its outcome**, in kebab-case and starting with a verb: \`add-due-dates\`, \`fix-duplicate-archive\`, \`remove-legacy-export\`.
`;

const CAPABILITIES = `# Naming capabilities

A capability is one area of behavior the system keeps, with one spec at \`openspec/specs/<capability>/spec.md\`. Changes come and go; capabilities stay.

**Reuse before you create.** Run \`openspec list --specs\` and read the specs that look related. If one already covers the area, change it under its exact path, even if you would have named it differently.

**Name the behavior, not the work.**

| Good | Not | Why not |
|---|---|---|
| \`task-due-dates\` | \`add-due-dates\` | names the work, which is over once the change is archived |
| \`user-auth\` | \`login-endpoint-v2\` | names the code and a version |
| \`billing/invoices\` | \`misc\`, \`core\`, \`improvements\` | catch-alls with no boundary |

**Pick a boundary that can grow.** A good capability is one a person would look up by name ("how do invoices work?"), and it owns requirements that change for the same reasons. Too broad, and every change touches it. Too narrow, and readers hunt across folders for one behavior.

Use kebab-case. Nest (\`billing/invoices\`) only where the project already nests.
`;

const DECISIONS = `# Decisions to raise

Decide the small things yourself and say what you chose. Raise a decision when a wrong guess would be costly to undo, or would change what others rely on:

- **Breaking behavior**: an output, error, flag, data shape, or default that users or tests depend on.
- **Data**: migrations, deletion, retention, anything that cannot be rolled back.
- **Security and privacy**: who can see or do what, secrets, personal data.
- **Public surface**: a new API, CLI flag, file format, or config key that others will build on.
- **Scope**: anything the user did not ask for, or a request that reads two ways.
- **Dependencies and cost**: a new service, library, or ongoing expense.

**How to raise one:**
- If the request already answers it, follow the request. If the user is there to answer, ask before writing the artifact it would change.
- Give two or three options in a line each, with your recommendation and its trade-off. Put related questions in one message.
- When you must go on without an answer, pick the option that keeps today's behavior, and mark it as an assumption where a reviewer will see it.
- Record the answer where it belongs: the choice and its reason in the design (or the proposal when there is no design), the behavior it leads to in the specs.
`;

const DELTAS = `# How specs change

The main specs (\`openspec/specs/\`) say what the system does today. A change never edits them directly. It carries delta specs, at \`specs/<capability>/spec.md\` inside the change, that say what will be different:

| Section | Means | Carries |
|---|---|---|
| \`## ADDED Requirements\` | new behavior | the full requirement and its scenarios |
| \`## MODIFIED Requirements\` | changed behavior | the whole requirement as it will read, with every scenario that still holds |
| \`## REMOVED Requirements\` | behavior that goes away | the name, a **Reason**, and a **Migration** |
| \`## RENAMED Requirements\` | a new name, same behavior | \`FROM:\` and \`TO:\` lines |

The deltas merge into the main specs in the change's last task (with the default schema, "Update the specs"), or at archive, where \`openspec archive\` merges and validates them for you. To merge them yourself, follow \`references/sync.md\`.

## How requirements get lost

- **A partial MODIFIED.** The merge replaces the whole requirement with the delta's block, so whatever the block leaves out is deleted. Copy the existing requirement whole from the main spec, then edit it. For a separate new behavior, use ADDED.
- **A rename written as REMOVED plus ADDED.** Scenarios get dropped on the way, and readers lose the link between the old name and the new. Use RENAMED, plus MODIFIED if the behavior changes too.
- **A promise stacked onto another.** A new obligation added to an existing requirement makes it longer and harder to change. Ask whether the change is a new promise or a change to one the spec already makes: a new promise gets its own requirement and scenarios; MODIFIED changes what an existing promise says. Never add a requirement that restates a promise the spec already makes.
- **A near-duplicate capability.** \`user-authentication\` next to \`user-auth\` splits one behavior across two specs. Reuse the exact existing path.
- **Editing a main spec while a change is open.** The merge finds requirements by name, so a renamed or reworded main spec no longer matches the delta. Edit the delta instead; edit a main spec directly only to fix its Purpose.
- **Emptying a spec.** A spec cannot be left without requirements. Retiring a capability takes \`retire_capabilities: true\` in the change's \`.openspec.yaml\`.

## Writing a delta

- Write each requirement and scenario as the system will be once the change is merged, not relative to today ("as before", "no longer"): the delta becomes the main spec.
- Under MODIFIED, keep every existing scenario's heading exactly as it is and change only its steps; a renamed heading reads as a dropped scenario.

After writing deltas, run \`openspec validate "<change>"\`. It catches a MODIFIED block that drops a scenario the main spec still has.
`;

export const OPENSPEC_GUIDES: readonly OpenSpecGuide[] = [
  { path: 'references/changes.md', content: CHANGES },
  { path: 'references/capabilities.md', content: CAPABILITIES },
  { path: 'references/decisions.md', content: DECISIONS },
  { path: 'references/deltas.md', content: DELTAS },
];
