## 1. Type Definitions
- [x] 1.1 Create `src/core/artifact-graph/types.ts` with Zod schemas (`ArtifactSchema`, `SchemaYamlSchema`) and inferred types via `z.infer<>`
- [x] 1.2 Define `CompletedSet` (Set<string>), `BlockedArtifacts`, and `ArtifactGraphResult` types for runtime state

## 2. Schema Parser
- [x] 2.1 Create `src/core/artifact-graph/schema.ts` with YAML loading and Zod validation via `.safeParse()`
- [x] 2.2 Implement dependency reference validation (ensure `requires` references valid artifact IDs)
- [x] 2.3 Implement duplicate artifact ID detection
- [x] 2.4 Add cycle detection during schema load (error format: "Cyclic dependency detected: A → B → C → A")

## 3. Artifact Graph Core
- [x] 3.1 Create `src/core/artifact-graph/graph.ts` with ArtifactGraph class
- [x] 3.2 Implement `fromYaml(path)` - load graph from schema file
- [x] 3.3 Implement `getBuildOrder()` - topological sort via Kahn's algorithm
- [x] 3.4 Implement `getArtifact(id)` - retrieve single artifact definition
- [x] 3.5 Implement `getAllArtifacts()` - list all artifacts

## 4. State Detection
- [x] 4.1 Create `src/core/artifact-graph/state.ts` with state detection logic
- [x] 4.2 Implement file existence checking for simple paths
- [x] 4.3 Implement glob pattern matching for multi-file artifacts
- [x] 4.4 Implement `detectCompleted(graph, changeDir)` - scan filesystem and return CompletedSet
- [x] 4.5 Handle missing changeDir gracefully (return empty CompletedSet)

## 5. Ready Calculation
- [x] 5.1 Implement `getNextArtifacts(graph, completed)` - find artifacts with all deps completed
- [x] 5.2 Implement `isComplete(graph, completed)` - check if all artifacts done
- [x] 5.3 Implement `getBlocked(graph, completed)` - return BlockedArtifacts map (artifact → unmet deps)

## 6. Schema Resolution
- [x] 6.1 Create `src/core/artifact-graph/resolver.ts` with schema resolution logic
- [x] 6.2 Add `getGlobalDataDir()` to `src/core/global-config.ts` (XDG_DATA_HOME with platform fallbacks)
- [x] 6.3 Implement `resolveSchema(name)` - global (`${XDG_DATA_HOME}/openspec/schemas/`) → built-in fallback

## 7. Built-in Schemas
- [x] 7.1 Create `src/core/artifact-graph/schemas/spec-driven.yaml` (default: proposal → specs → design → tasks)
- [x] 7.2 Create `src/core/artifact-graph/schemas/tdd.yaml` (alternative: tests → implementation → docs)

## 8. Integration
- [x] 8.1 Create `src/core/artifact-graph/index.ts` with public exports

## 9. Testing
- [x] 9.1 Test: Parse valid schema YAML returns correct artifact graph
- [x] 9.2 Test: Parse invalid schema (missing fields) throws descriptive error
- [x] 9.3 Test: Duplicate artifact IDs throws error
- [x] 9.4 Test: Invalid `requires` reference throws error identifying the invalid ID
- [x] 9.5 Test: Cycle in schema throws error listing cycle path (e.g., "A → B → C → A")
- [x] 9.6 Test: Compute build order returns correct topological ordering (linear chain)
- [x] 9.7 Test: Compute build order handles diamond dependencies correctly
- [x] 9.8 Test: Independent artifacts return in stable order
- [x] 9.9 Test: Empty/missing changeDir returns empty CompletedSet
- [x] 9.10 Test: File existence marks artifact as completed
- [x] 9.11 Test: Glob pattern specs/*.md detected as complete when files exist
- [x] 9.12 Test: Glob pattern with empty directory not marked complete
- [x] 9.13 Test: getNextArtifacts returns only root artifacts when nothing completed
- [x] 9.14 Test: getNextArtifacts includes artifact when all deps completed
- [x] 9.15 Test: getBlocked returns artifact with all unmet dependencies listed
- [x] 9.16 Test: isComplete() returns true when all artifacts completed
- [x] 9.17 Test: isComplete() returns false when some artifacts incomplete
- [x] 9.18 Test: Schema resolution finds global override before built-in
- [x] 9.19 Test: Schema resolution falls back to built-in when no global
