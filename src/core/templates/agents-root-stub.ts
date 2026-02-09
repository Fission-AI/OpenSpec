export const agentsRootStubTemplate = `# LightSpec Instructions

These instructions are for AI assistants working in this project.

- For complex features (new capability, breaking change, architecture/performance/security work), suggest switching to \`/plan\` mode if it's not already the case, then run \`lightspec-proposal\` before coding.
- If unsure which skill to run, list installed skills in your assistant's \`skills/\` folder.

Keep this managed block so 'lightspec update' can refresh the instructions.
`;
