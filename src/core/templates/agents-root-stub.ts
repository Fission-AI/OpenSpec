export const agentsRootStubTemplate = `# LightSpec Instructions

These instructions are for AI assistants working in this project.

Always open \`@/lightspec/AGENTS.md\` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use \`@/lightspec/AGENTS.md\` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'lightspec update' can refresh the instructions.
`;
