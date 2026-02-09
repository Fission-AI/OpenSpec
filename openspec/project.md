# OpenSpec Project Overview

A minimal CLI tool that helps developers set up OpenSpec file structures and keep AI instructions updated. The AI tools themselves handle all the change management complexity by working directly with markdown files.

## Technology Stack
- Language: TypeScript
- Runtime: Node.js (≥20.19.0, ESM modules)
- Package Manager: pnpm
- CLI Framework: Commander.js
- User Interaction: @inquirer/prompts
- Validation: Zod
- Terminal UI: Chalk, Ora
- File Operations: fast-glob
- YAML Parsing: yaml
- Distribution: npm package
- Testing: Vitest
- Versioning: @changesets/cli

## Project Structure
```
src/
├── commands/           # CLI command handlers
│   ├── change.ts      # Change proposal commands
│   ├── spec.ts        # Spec management commands
│   ├── completion.ts  # Shell completion commands
│   ├── config.ts      # Configuration commands
│   ├── validate.ts    # Validation commands
│   └── show.ts        # Display commands
├── core/
│   ├── configurators/  # AI tool configuration
│   │   ├── registry.ts
│   │   ├── [agent].ts
│   │   └── slash/      # Slash command configurators
│   ├── completions/    # Shell completion system
│   │   ├── generators/ # Bash, Zsh, Fish, PowerShell
│   │   ├── installers/
│   │   └── templates/
│   ├── artifact-graph/ # Artifact dependency resolution
│   ├── templates/      # AI instruction templates
│   ├── schemas/        # OpenSpec schema definitions
│   ├── parsers/        # Markdown/change parsers
│   └── validation/     # Spec validation logic
└── utils/              # Shared utilities

dist/           # Compiled output (gitignored)
```

## Conventions
- TypeScript strict mode enabled
- ES2022 target, NodeNext module resolution
- Async/await for all asynchronous operations
- Minimal dependencies principle
- Clear separation of CLI, core logic, and utilities
- ESLint with typescript-eslint
- File naming: kebab-case for directories, PascalCase for types
- AI-friendly code with descriptive names

## Error Handling
- Let errors bubble up to CLI level for consistent user messaging
- Use native Error types with descriptive messages
- Exit with appropriate codes: 0 (success), 1 (general error), 2 (misuse)
- No try-catch in utility functions, handle at command level

## Logging
- Use console methods directly (no logging library)
- console.log() for normal output
- console.error() for errors (outputs to stderr)
- Use chalk for colored output
- Use ora for spinners/loading indicators
- No verbose/debug modes initially (keep it simple)

## Testing Strategy
- Framework: Vitest with globals enabled
- Test files: `test/**/*.test.ts`
- Environment: node (default)
- Coverage: text, json, html reporters
- Run tests: `pnpm test`
- Watch mode: `pnpm test:watch`
- Coverage report: `pnpm test:coverage`
- Test timeout: 10s (configurable)

## Development Workflow
- Use pnpm for all package management
- Run `pnpm run build` to compile TypeScript
- Run `pnpm run dev` for development mode
- Test locally with `pnpm link`
- Follow OpenSpec's own change-driven development process
- Use changesets for versioning: `pnpm changeset`
- Release: `pnpm run release` (CI) or `pnpm run release:local`
- Postinstall script ensures permissions