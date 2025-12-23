## 1. Type Definitions
- [ ] 1.1 Create `src/core/artifact-graph/types.ts` with Zod schemas (`ArtifactSchema`, `SchemaYamlSchema`) and inferred types via `z.infer<>`
- [ ] 1.2 Define `ArtifactState` and `ArtifactGraphResult` interfaces for runtime state

## 2. Schema Parser
- [ ] 2.1 Create `src/core/artifact-graph/schema.ts` with YAML loading and Zod validation via `.safeParse()`
- [ ] 2.2 Implement dependency reference validation (ensure `requires` references valid artifact IDs)
- [ ] 2.3 Add cycle detection during schema load

## 3. Artifact Graph Core
- [ ] 3.1 Create `src/core/artifact-graph/graph.ts` with ArtifactGraph class
- [ ] 3.2 Implement `fromYaml(path)` - load graph from schema file
- [ ] 3.3 Implement `getBuildOrder()` - topological sort via Kahn's algorithm
- [ ] 3.4 Implement `getArtifact(id)` - retrieve single artifact definition
- [ ] 3.5 Implement `getAllArtifacts()` - list all artifacts

## 4. State Detection
- [ ] 4.1 Create `src/core/artifact-graph/state.ts` with state detection logic
- [ ] 4.2 Implement file existence checking for simple paths
- [ ] 4.3 Implement glob pattern matching for multi-file artifacts
- [ ] 4.4 Implement `detectState(graph, changeDir)` - scan filesystem and return ArtifactState

## 5. Ready Calculation
- [ ] 5.1 Implement `getNextArtifacts(graph, state)` - find artifacts with all deps completed
- [ ] 5.2 Implement `isComplete(graph, state)` - check if all artifacts done
- [ ] 5.3 Implement `getBlocked(graph, state)` - find artifacts with unmet dependencies

## 6. Integration
- [ ] 6.1 Create `src/core/artifact-graph/index.ts` with public exports
- [ ] 6.2 Add example schema YAML for testing

## 7. Testing
- [ ] 7.1 Test: Parse schema YAML returns correct artifact graph
- [ ] 7.2 Test: Compute build order returns correct topological ordering
- [ ] 7.3 Test: Empty directory shows only root artifacts as ready
- [ ] 7.4 Test: Directory with proposal.md shows specs as ready
- [ ] 7.5 Test: Glob pattern specs/*.md detected as complete when files exist
- [ ] 7.6 Test: All artifacts present returns isComplete() true
- [ ] 7.7 Test: Cycle in schema throws clear error
