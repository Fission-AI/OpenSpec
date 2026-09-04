/**
 * Shared project-root guidance for skill template workflows.
 *
 * Generated skills and commands are installed once per machine, so they are
 * offered in every repository the agent opens - including repositories that
 * never ran `openspec init`. Nothing stops the workflow there: `openspec new
 * change` falls back to an implicit root and creates `openspec/` in whatever
 * directory the agent happens to be in.
 *
 * This guidance is interpolated into every workflow so the agent checks
 * `root.source` before writing and hands the decision back to the user
 * instead of setting the project up on its own.
 */
export const PROJECT_ROOT_GUARD = `**Project check:** These steps expect a project that already uses OpenSpec. Before the first step that writes anything (\`new change\`, \`archive\`, \`sync specs\`, or authoring an artifact file), confirm the project has a root: run \`openspec status --json\` and read \`root.source\`. Any value other than \`implicit\` means the project is set up; \`"source": "implicit"\` means it is not - there is no \`openspec/\` directory here, and the next write would create one. An error saying \`No OpenSpec root found\` means the same thing. In that case stop before writing and ask the user how to proceed: set this project up (\`openspec init\`), target a store they already have (\`--store <id>\`), or drop OpenSpec for this request and help them directly. Wait for their answer. Do not run \`openspec init\` until they ask for it, do not hand-create \`openspec/\` files, and do not let a command create the root as a side effect.`;
