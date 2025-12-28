## Why

The ArtifactGraph (Slice 1) and InstructionLoader (Slice 3) provide programmatic APIs for artifact-based workflow management. Users currently have no CLI interface to:
- See artifact completion status for a change
- Discover what artifacts are ready to create
- Get enriched instructions for creating artifacts
- Create new changes with proper validation

This proposal adds CLI commands that expose the artifact workflow functionality to users and agents.

## What Changes

- **NEW**: `openspec status --change <id>` shows artifact completion state
- **NEW**: `openspec next --change <id>` shows artifacts ready to create
- **NEW**: `openspec instructions <artifact> --change <id>` outputs enriched template
- **NEW**: `openspec templates [--schema <name>]` shows resolved template paths
- **NEW**: `openspec new change <name>` creates a new change directory

All commands are top-level for fluid UX. They integrate with existing core modules:
- Uses `loadChangeContext()`, `formatChangeStatus()`, `generateInstructions()` from instruction-loader
- Uses `ArtifactGraph`, `detectCompleted()` from artifact-graph
- Uses `createChange()`, `validateChangeName()` from change-utils

**Experimental isolation**: All commands are implemented in a single file (`src/commands/artifact-workflow.ts`) for easy removal if the feature doesn't work out. Help text marks them as experimental.

## Impact

- Affected specs: NEW `cli-artifact-workflow` capability
- Affected code:
  - `src/cli/index.ts` - register new commands
  - `src/commands/artifact-workflow.ts` - new command implementations
- No changes to existing commands or specs
- Builds on completed Slice 1, 2, and 3 implementations
