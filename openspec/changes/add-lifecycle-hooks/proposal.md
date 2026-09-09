# Change: Add Lifecycle Hooks for Proposal, Apply, and Archive Phases

## Why

OpenSpec's lifecycle phases (proposal, apply, archive) generate instructions for AI agents, but there's no way to inject custom behavior at phase boundaries without modifying OpenSpec's source code. Users integrating external tools (Linear, Jira, GitHub Issues, custom CI pipelines) must fork and modify slash command templates directly. A hooks system would allow users to define custom markdown instructions that get injected before/after each phase, enabling integrations like automatic issue tracking without touching OpenSpec internals.

## What Changes

- **New capability**: `lifecycle-hooks` - defines how hooks are discovered and injected
- Discover hooks by convention from `openspec/hooks/{integration}/` directories
- Hook files named `{before|after}-{phase}.md` (e.g., `before-proposal.md`, `after-apply.md`)
- Extend slash command template generation to inject hook instructions at phase boundaries
- Support before/after hooks for any phase (proposal, apply, archive, or custom phases)
- Multiple integrations compose automatically - all hooks for same phase are concatenated
- Hooks are markdown instruction files that get concatenated into the phase instructions

## Capabilities

### New Capabilities
- `lifecycle-hooks` - Configuration and injection of custom instructions at lifecycle phase boundaries

### Modified Capabilities
- `slash-commands` - Extend template generation to discover and inject hooks

## Impact

- **Affected code**:
  - `src/core/hooks.ts` (new) - Hook discovery and loading from `openspec/hooks/` directory
  - `src/core/templates/slash-command-templates.ts` - Inject hook content into phase instructions
  - `src/commands/artifact-workflow.ts` - Pass project root to template generation
- **Affected files**: `openspec/hooks/` directory structure for hook files
- **Users**: Can define custom integrations (Linear MCP, Jira, etc.) by adding hook files to `openspec/hooks/{integration}/` without forking OpenSpec
