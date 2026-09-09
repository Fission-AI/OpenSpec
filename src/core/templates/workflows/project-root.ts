/**
 * Shared project-root guidance for skill template workflows.
 *
 * Generated skills and commands are installed once per machine, so they are
 * offered in every repository the agent opens - including repositories that
 * never ran `openspec init`. Nothing stops the workflow there: `openspec new
 * change` falls back to an implicit root and creates `openspec/` in whatever
 * directory the agent happens to be in.
 *
 * This guidance is interpolated into every workflow so the agent checks for a
 * root before writing. `openspec list --json` is the check because it refuses
 * to fabricate an implicit root: it reports `root: null` both when nothing is
 * set up and when only stores are registered.
 *
 * What follows the check depends on how the workflow was reached, because the
 * two cases want opposite things (#1645). A skill the model picked on its own
 * in an unrelated repository must get out of the way: the user asked for help,
 * not for OpenSpec, and answering with a setup menu is the reported bug. A
 * user who named OpenSpec, named the skill, or ran its slash command is owed
 * an answer about OpenSpec, so that case stops and asks.
 *
 * One text serves both surfaces. `apply-change` and `onboard` render a single
 * body into the skill and the command alike, so a command-only variant would
 * mean threading a surface flag through bodies that deliberately have none.
 * The bullets scope themselves instead: a slash command is an explicit
 * invocation, so its branch is the only one that can apply there.
 */
export const PROJECT_ROOT_GUARD = `**Project check:** These steps expect a project that already uses OpenSpec. Before the first step that writes anything (\`new change\`, \`archive\`, \`sync specs\`, or authoring an artifact file), confirm the project has a root: run \`openspec list --json\` (with \`--store <id>\` when a store is selected, since the store is then the root) and read \`root\`. A root object means the project is set up. \`"root": null\` means it is not - there is no \`openspec/\` directory here, and a write such as \`openspec new change\` would create one as a side effect. The command also exits non-zero, which is that answer rather than a broken CLI, so read the JSON instead of retrying or working around it.

With no root, what happens next depends on how this workflow was reached:

- **Auto-selected**: you chose this workflow yourself, without the user naming OpenSpec, naming this skill, or running its slash command. Stop using OpenSpec and answer the request normally, as you would with no OpenSpec installed. Do not ask them to set anything up and do not mention OpenSpec setup.
- **Explicit OpenSpec request**: the user named OpenSpec, named this skill, or ran its slash command. Stop before writing and ask how to proceed: set this project up (\`openspec init\`), target a store they already have (\`--store <id>\`), or continue without OpenSpec for this request. Wait for their answer.

In both branches, never create the root as a side effect: do not run \`openspec init\` until the user asks for it, do not hand-create \`openspec/\` files, and do not let a command create it.`;
