# State Detection

## Requirement

The system SHALL detect artifact completion state by scanning the filesystem.

## Scenarios

### Scenario: Simple file exists
- **WHEN** an artifact generates "proposal.md" and the file exists
- **THEN** the artifact is marked as completed

### Scenario: Simple file missing
- **WHEN** an artifact generates "proposal.md" and the file does not exist
- **THEN** the artifact is not marked as completed

### Scenario: Glob pattern with files
- **WHEN** an artifact generates "specs/*.md" and the specs/ directory contains .md files
- **THEN** the artifact is marked as completed

### Scenario: Glob pattern empty
- **WHEN** an artifact generates "specs/*.md" and the specs/ directory is empty or missing
- **THEN** the artifact is not marked as completed

### Scenario: Missing change directory
- **WHEN** the change directory does not exist
- **THEN** all artifacts are marked as not completed (empty state)

## Design

### Decision: Filesystem as Database
Use file existence for state detection rather than a separate state file.

**Rationale:**
- Stateless - no state corruption possible
- Git-friendly - state derived from committed files
- Simple - no sync issues between state file and actual files

**Alternatives considered:**
- JSON/SQLite state file: More complex, sync issues, not git-friendly
- Git metadata: Too coupled to git, complex implementation

### Decision: Glob Pattern Support
Support glob patterns like `specs/*.md` in artifact `generates` field.

**Rationale:**
- Allows multiple files to satisfy a single artifact requirement
- Common pattern for spec directories with multiple files
- Uses standard glob syntax

### Decision: Immutable Completed Set
Represent completion state as an immutable Set of completed artifact IDs.

**Rationale:**
- Functional style, easier to reason about
- State derived fresh each query, no mutation needed
- Clear separation between graph structure and runtime state
- Filesystem can only detect binary existence (complete vs not complete)

**Note:** `inProgress` and `failed` states are deferred to future slices. They would require external state tracking (e.g., a status file) since file existence alone cannot distinguish these states.

## Tasks

### State Detection
- [ ] 4.1 Create `src/core/artifact-graph/state.ts` with state detection logic
- [ ] 4.2 Implement file existence checking for simple paths
- [ ] 4.3 Implement glob pattern matching for multi-file artifacts
- [ ] 4.4 Implement `detectCompleted(graph, changeDir)` - scan filesystem and return CompletedSet
- [ ] 4.5 Handle missing changeDir gracefully (return empty CompletedSet)

### Tests
- [ ] 9.9 Test: Empty/missing changeDir returns empty CompletedSet
- [ ] 9.10 Test: File existence marks artifact as completed
- [ ] 9.11 Test: Glob pattern specs/*.md detected as complete when files exist
- [ ] 9.12 Test: Glob pattern with empty directory not marked complete
