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
 * root before writing and hands the decision back to the user instead of
 * setting the project up on its own. `openspec list --json` is the check
 * because it refuses to fabricate an implicit root: it reports `root: null`
 * both when nothing is set up and when only stores are registered.
 */
export const PROJECT_ROOT_GUARD = `**Project check:** These steps expect a project that already uses OpenSpec. Before the first step that writes anything (\`new change\`, \`archive\`, \`sync specs\`, or authoring an artifact file), confirm the project has a root: run \`openspec list --json\` and read \`root\`. A root object means the project is set up. \`"root": null\` means it is not - there is no \`openspec/\` directory here, and a write such as \`openspec new change\` would create one as a side effect. The command also exits non-zero, which is that answer rather than a broken CLI, so read the JSON instead of retrying or working around it. Then stop before writing and ask the user how to proceed: set this project up (\`openspec init\`), target a store they already have (\`--store <id>\`), or drop OpenSpec for this request and help them directly. Wait for their answer. Do not run \`openspec init\` until they ask for it, do not hand-create \`openspec/\` files, and do not let a command create the root as a side effect.`;
