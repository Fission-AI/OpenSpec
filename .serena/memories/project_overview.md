# OpenSpec - Project Overview

## Purpose
OpenSpec is an AI-native spec-driven development framework (CLI tool & library). It provides a structured workflow for software specification using AI, enabling teams to create, manage, and archive feature specs and proposals.

## Key Concept
The `/opsx:propose` → `/opsx:archive` workflow creates artifact-guided spec documents:
- `proposal.md` — why we're doing this, what's changing
- `specs/` — requirements and scenarios
- `design.md` — technical approach
- `tasks.md` — implementation checklist

## Tech Stack
- **Language**: TypeScript (ESM, Node.js >=20.19.0)
- **Package manager**: pnpm
- **Build**: `node build.js` (custom build script)
- **Test**: Vitest
- **Lint**: ESLint (typescript-eslint)
- **CLI entry**: `bin/openspec.js`
- **Package**: `@fission-ai/openspec` v1.2.0 (MIT, published on npm)

## Key Dependencies
- `commander` — CLI framework
- `@inquirer/prompts` — interactive prompts
- `chalk`, `ora` — terminal UX
- `yaml`, `zod` — schema validation
- `fast-glob` — file scanning

## Repository Structure
```
openspec/      — spec documents
schemas/       — JSON schemas
src/           — TypeScript source
bin/           — CLI entry point
scripts/       — postinstall, check scripts
docs/          — documentation
test/          — test files
.changeset/    — changeset version management
```
