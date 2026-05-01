# BR-OpenSpec — Agent Guide

## Project Overview

BR-OpenSpec is an AI-native system for spec-driven development. It is a Node.js CLI tool (published as `@fkmatsuda/br-openspec` on npm) that helps teams align on what to build before writing code. Each change gets its own folder with a proposal, specs, design, and tasks. OpenSpec generates AI assistant integrations (skills, slash commands, and config files) for 25+ tools including Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex, and many others.

The project uses its own spec-driven workflow. You will find active changes under `openspec/changes/` and archived changes under `openspec/changes/archive/`. The project's own specs live in `openspec/specs/`.

## Technology Stack

- **Runtime**: Node.js ≥20.19.0 (ESM modules only)
- **Language**: TypeScript 5.9+
- **Package Manager**: pnpm 9
- **CLI Framework**: Commander.js
- **Validation**: Zod
- **Config / Frontmatter**: YAML
- **Prompts**: @inquirer/prompts (must be dynamically imported — see Code Style)
- **Styling**: chalk, ora spinners
- **Telemetry**: PostHog (anonymous, opt-out)

## Build & Development Commands

All commands are run via pnpm:

```bash
# Install dependencies
pnpm install

# Build (compiles TypeScript to dist/ via custom build.js)
pnpm run build

# Watch mode for development
pnpm run dev

# Develop CLI locally (builds then runs bin/openspec.js)
pnpm run dev:cli

# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run linting
pnpm lint

# Type check without emitting
pnpm exec tsc --noEmit
```

The build script (`build.js`) cleans `dist/` and invokes `tsc` directly. There is no bundler — the published package uses the raw compiled JavaScript from `dist/`.

## Project Structure

```
src/
  cli/           # CLI entry point (Commander.js program setup)
  commands/      # Command implementations (change, config, schema, show, spec, tools, validate, workflow)
  core/          # Core business logic
    archive.ts
    artifact-graph/     # Artifact graph engine for workflow schemas
    available-tools.ts
    command-generation/ # Adapter-based command/skill generation for 25+ AI tools
    completions/        # Shell completion generation (bash, zsh, fish, powershell)
    config.ts           # AI tool registry and constants
    config-prompts.ts
    config-schema.ts
    global-config.ts    # XDG-compliant global config management
    init.ts             # Project initialization command
    profiles.ts         # Workflow profiles (core vs custom)
    project-config.ts
    schemas/            # Zod schemas for validation
    shared/             # Shared skill generation and tool detection
    templates/          # Workflow template definitions
    tools-manager.ts
    update.ts
    validation/         # Spec/change validation engine
  prompts/       # Custom prompt components (searchable multi-select)
  telemetry/     # Anonymous usage analytics (PostHog)
  ui/            # ASCII art, welcome screens, palette
  utils/         # File system, interactive mode detection, task progress, etc.
  index.ts       # Public API exports

test/            # Mirror of src/ structure; Vitest tests
openspec/        # The project's own spec-driven content
  changes/       # Active and archived change proposals
  explorations/  # Design explorations
  specs/         # Living specifications
  config.yaml    # Project-level OpenSpec config
schemas/         # Built-in workflow schemas (e.g., spec-driven)
docs/            # Markdown documentation (English + pt-BR)
```

## Code Style Guidelines

- **ESM only**: All imports must use `.js` extensions (e.g., `import { foo } from './bar.js'`).
- **Dynamic imports for @inquirer**: `@inquirer/core` and `@inquirer/prompts` **must** be loaded with `import()` at runtime. Static imports of these packages are forbidden by ESLint because they have side effects that can hang the Node.js event loop when stdin is piped (see issue #367). The only exception is `src/core/init.ts`, which is itself dynamically imported from the CLI startup path.
- **Cross-platform paths**: Always use `path.join()` or `path.resolve()`. Never hardcode `/` or `\`. Tests must use `path.join()` for expected path values.
- **Constants over magic strings**: Reuse existing constants (e.g., `OPENSPEC_DIR_NAME`, `AI_TOOLS`) rather than inventing new detection mechanisms.
- **Explicit lookups preferred**: Prefer explicit list lookups over pattern matching or regex when generating or tracking artifacts.
- **TypeScript strict mode**: Enabled. `any` is allowed in existing code but should be avoided in new code.
- **Conventional commits**: Use `type(scope): subject` format for commit messages.

## Testing Strategy

- **Framework**: Vitest 3.x with `globals: true`
- **Pool**: `forks` (process isolation required because tests spawn CLI child processes and make `process.cwd()` assumptions)
- **Max workers**: Capped at 4 (or via `VITEST_MAX_WORKERS` env var) to prevent runaway CPU/memory in CI
- **Test timeout**: 10 seconds default; 3 second teardown timeout
- **Coverage**: `@vitest/coverage-v8`, outputs text/json/html; excludes `dist/`, `bin/`, `test/`, config files
- **Global setup**: `vitest.setup.ts` ensures the CLI is built before tests run
- **E2E tests**: Use `test/helpers/run-cli.ts` to spawn the compiled CLI in a child process and capture stdout/stderr
- **Mocking**: Vitest mocks are used heavily for `@inquirer/prompts`, file system modules, and UI components

## CI / CD

### GitHub Actions Workflows

- **`.github/workflows/ci.yml`**: Runs on PRs, merge groups, and pushes to `main`
  - `test_pr`: Build + test on Ubuntu (PRs)
  - `test_matrix`: Build + test on Ubuntu, macOS, and Windows (pushes to `main`)
  - `lint`: Build, type check (`tsc --noEmit`), lint, and verify `dist/cli/index.js` exists
  - `nix-flake-validate`: Validates Nix flake build (only when Nix-related files change)
  - `validate-changesets`: Ensures changesets are valid for PRs
  - `required-checks-pr` / `required-checks-main`: Aggregates all required checks

- **`.github/workflows/release-prepare.yml`**: Runs on pushes to `main`
  - Uses Changesets action to open/update a "Version Packages" PR
  - Publishes to npm via OIDC trusted publishing (no long-lived npm token)
  - Requires a GitHub App token for checkout so that CI runs on the version PR

### Release Process

- Uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation
- Run `pnpm changeset` to add a changeset
- The release PR is auto-created; merging it triggers the publish
- `pnpm run release:ci` is the publish script (verifies version then runs `changeset publish`)

## Deployment & Distribution

- **npm**: Published as `@fkmatsuda/br-openspec`
- **Nix**: `flake.nix` provides packages, apps, and dev shells for `x86_64-linux`, `aarch64-linux`, `x86_64-darwin`, `aarch64-darwin`
- **Global install**: `npm install -g @fkmatsuda/br-openspec@latest`
- **Entry points**:
  - CLI: `bin/openspec.js` → `dist/cli/index.js`
  - Library: `dist/index.js` / `dist/index.d.ts`

## Security & Privacy

- **Telemetry**: Anonymous usage stats sent to PostHog. Only command names and version are tracked. No arguments, paths, content, or PII.
  - Opt-out: `export OPENSPEC_TELEMETRY=0` or `export DO_NOT_TRACK=1`
  - Auto-disabled in CI (`CI=true`)
- **npm publishing**: Uses OIDC trusted publishing from GitHub Actions (no static tokens in repo)
- **Sensitive files**: `.env` files are gitignored. No API keys or secrets should be committed.

## Development Conventions

- **Spec-driven**: The project eats its own dog food. Changes should have a proposal and specs in `openspec/changes/` when they are significant.
- **Profile system**: Workflows are delivered based on profiles (`core` = streamlined, `custom` = user-selected). The global config controls delivery method (`skills`, `commands`, or `both`).
- **AI tool adapters**: Each supported AI tool has an adapter in `src/core/command-generation/adapters/`. New tool support requires adding an adapter and registering it in the factory.
- **Shell completions**: New CLI commands should update completion generators in `src/core/completions/`.
- **Legacy cleanup**: The init command detects and optionally cleans up legacy file layouts.
- **Windows awareness**: Any file system or path logic must work on Windows. CI tests on `windows-latest` with PowerShell.

## Useful Environment Variables

- `OPENSPEC_TELEMETRY=0` — Disable telemetry
- `DO_NOT_TRACK=1` — Disable telemetry (standard)
- `VITEST_MAX_WORKERS=N` — Override test parallelism
- `OPENSPEC_INTERACTIVE=0` — Force non-interactive mode (used in tests)
- `OPENSPEC_CONCURRENCY=N` — Max concurrent validations (default 6)
- `NO_COLOR=1` — Disable colored output (also `--no-color` flag)
- `XDG_CONFIG_HOME` — Override global config directory

## Key Files for Agents

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | CLI entry point; all commands are registered here |
| `src/core/config.ts` | AI tool registry (`AI_TOOLS` constant) |
| `src/core/global-config.ts` | XDG-compliant user config |
| `src/core/profiles.ts` | Workflow profile definitions |
| `src/core/init.ts` | Project initialization logic |
| `src/core/validation/validator.ts` | Spec/change validation engine |
| `test/helpers/run-cli.ts` | E2E test helper for CLI spawning |
| `openspec/config.yaml` | This project's own OpenSpec configuration |
| `build.js` | Build script (tsc wrapper) |
| `vitest.config.ts` | Test configuration |
| `eslint.config.js` | ESLint configuration (typescript-eslint) |

## Upstream Sync Strategy (BR-OpenSpec Fork)

BR-OpenSpec is a fork of the original OpenSpec project. All user-facing messages, UI text, workflow templates, and command descriptions are maintained in Brazilian Portuguese (`pt-BR`). When syncing with upstream, follow this process:

### 1. Setup

Ensure the upstream remote is configured:
```bash
git remote add upstream https://github.com/original/openspec.git  # adjust URL as needed
git fetch upstream
```

### 2. Create a Sync Branch

```bash
git checkout -b sync/upstream-$(date +%Y%m%d)
git merge upstream/main --no-edit
```

### 3. Resolve Conflicts in Messages Catalog

The central message catalog lives at `src/messages/index.ts`. When merging:
- Preserve existing Portuguese translations
- Add new English keys from upstream to the appropriate sections
- Translate new keys to Brazilian Portuguese immediately
- Maintain the existing domain-based organization (CLI_DESCRIPTIONS, CLI_MESSAGES, CHANGE_MESSAGES, etc.)

### 4. Identify and Translate New User-Facing Strings

After merge, find newly introduced hardcoded English strings:
```bash
git diff upstream/main..HEAD --name-only | grep "^src/"
```

Look for new occurrences of `console.log`, `console.error`, `console.warn`, `.description(`, and `message:` in modified files. Replace them with references to `src/messages/index.ts`.

### 5. Update Project Name References

New upstream code may reference "OpenSpec" instead of "BR-OpenSpec" in user-facing text. Update these in `src/messages/index.ts` and other user-facing locations. Do NOT change: `openspec` (CLI command), `openspec-` (prefixes), `OPENSPEC_` (constants), or technical URLs.

### 6. Update Tests

Run the full test suite:
```bash
pnpm test
```

Update test expectations in `test/` to match the Portuguese translations. Only change string assertions — never test logic.

### 7. Validate

```bash
pnpm run build
pnpm exec tsc --noEmit
pnpm lint
```

### 8. Workflow Template

An upstream sync workflow template is available at `src/core/templates/workflows/upstream-sync.ts` for agent-assisted syncs. It provides step-by-step instructions for the entire process.

### Key Principle

**Never leave English user-facing strings in `src/` after a sync.** All messages displayed to Brazilian users must be in `pt-BR`, centralized in `src/messages/index.ts`, and tested.
