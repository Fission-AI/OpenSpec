# OpenSpec - Style & Conventions

## Language & Type System
- TypeScript (strict), ESM modules (`"type": "module"`)
- Zod for runtime schema validation
- Type hints and interfaces preferred

## Code Style
- ESLint with `typescript-eslint` config (`eslint.config.js`)
- File naming: camelCase for source files, kebab-case for scripts
- Test files co-located or in `test/` directory, suffix `.test.ts`

## Naming Conventions
- CLI commands: kebab-case (`opsx:propose`, `opsx:archive`)
- Package: scoped npm (`@fission-ai/openspec`)
- Changeset-based versioning (`@changesets/cli`)
