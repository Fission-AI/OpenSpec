## Why

The current OpenSpec system relies on conventions and AI inference for artifact ordering. A formal artifact graph with dependency awareness would enable deterministic "what's ready?" queries, making the system more predictable and enabling future features like automated pipeline execution.

## What Changes

- Add `ArtifactGraph` class to model artifacts as a DAG with dependency relationships
- Add `ArtifactState` type to track completion status (completed, in_progress, failed)
- Add filesystem-based state detection using file existence and glob patterns
- Add schema YAML parser to load artifact definitions
- Implement topological sort (Kahn's algorithm) for build order calculation
- Add `getNextArtifacts()` to find artifacts ready for creation

## Impact

- Affected specs: New `artifact-graph` capability
- Affected code: `src/core/artifact-graph/` (new directory)
- No changes to existing functionality - this is a parallel module
