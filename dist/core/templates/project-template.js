export const projectTemplate = (context = {}) => `# ${context.projectName || 'Project'} Context

## Purpose
${context.description || '[Describe your project\'s purpose and goals]'}

## Tech Stack
${context.techStack?.length ? context.techStack.map(tech => `- ${tech}`).join('\n') : '- [List your primary technologies]\n- [e.g., TypeScript, React, Node.js]'}

## Project Conventions

### Code Style
[Describe your code style preferences, formatting rules, and naming conventions]

### Architecture Patterns
[Document your architectural decisions and patterns]

### Testing Strategy
[Explain your testing approach and requirements]

### Git Workflow
[Describe your branching strategy and commit conventions]

## Domain Context
[Add domain-specific knowledge that AI assistants need to understand]

## Important Constraints
[List any technical, business, or regulatory constraints]

## External Dependencies
[Document key external services, APIs, or systems]
`;
//# sourceMappingURL=project-template.js.map