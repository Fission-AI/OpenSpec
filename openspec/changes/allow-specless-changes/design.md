## Context

OpenSpec's `spec-driven` schema requires every change to include delta specs. Two separate systems enforce this:

1. **Validation** (`Validator.validateChangeDeltaSpecs()`): hard-fails with `CHANGE_NO_DELTAS` when `totalDeltas === 0`
2. **Artifact graph** (`detectCompleted()` in `state.ts`): `specs` artifact completion is determined by file existence (`specs/**/*.md`). Since `tasks` depends on `specs`, a change with no spec files can never reach `tasks: ready`.

No config is passed into either system today. The Validator receives only `strictMode`; `detectCompleted()` receives only the graph and change directory.

### Key code locations

- `src/core/project-config.ts` — `ProjectConfigSchema` (Zod), `readProjectConfig()`
- `src/core/validation/validator.ts` — `validateChangeDeltaSpecs()`, line 269: `totalDeltas === 0` → ERROR
- `src/core/validation/constants.ts` — `VALIDATION_MESSAGES.CHANGE_NO_DELTAS`
- `src/core/artifact-graph/state.ts` — `detectCompleted()`: iterates artifacts, checks file existence
- `src/commands/validate.ts` — `ValidateCommand.validateByType()`: creates Validator, calls validation

### Existing patterns

- Config is flat: `schema` (string), `context` (string), `rules` (record of string arrays). No nested config objects.
- No `z.enum` or tri-state config patterns exist today.
- Validation levels are `'ERROR' | 'WARNING' | 'INFO'`. Report validity: `errors === 0` (non-strict) or `errors === 0 && warnings === 0` (strict).
- The proposal instruction and template are static (from `schema.yaml`). Config-aware guidance uses the existing `rules` injection mechanism.

## Goals / Non-Goals

**Goals:**
- Add top-level `requireSpecDeltas` tri-state to project config: `"error"` (default) | `"warn"` | `false`
- Validation respects the setting: ERROR, WARNING, or silent
- Artifact graph respects the setting: synthetically complete `specs` when not required
- Propose workflow works end-to-end for specless changes (with `rules.proposal` guidance in config)

**Non-Goals:**
- Per-change override via `.openspec.yaml` — deferred (adds I/O to `detectCompleted()`)
- Dynamic instruction adaptation based on config — projects use `rules` config instead
- New `--no-specs` flag for `openspec new change` — potential follow-up

## Decisions

### 1. Config shape: top-level `requireSpecDeltas` tri-state

```typescript
const RequireSpecDeltasSchema = z.union([
  z.enum(["error", "warn"]),
  z.literal(false),
]);

// Added to ProjectConfigSchema alongside schema, context, rules
requireSpecDeltas: RequireSpecDeltasSchema.optional()
```

**Why top-level:** The existing config is flat — `schema`, `context`, `rules`. A top-level key follows the same pattern. This setting affects both validation and the artifact graph, so it doesn't belong under a `validation` namespace.

**Why tri-state over boolean:** The primary use case needs full suppression (no output). A boolean forces a choice between "error" and "silent", losing the middle ground of "visible but non-blocking."

**Why `false` instead of `"off"`:** `false` is YAML's native representation for "disabled." Bare `off` is a YAML 1.1 boolean alias for `false`, which would cause confusion.

### 2. Thread config into the Validator

Pass a config object instead of bare `strictMode`:

```typescript
type SpecDeltaRequirement = 'error' | 'warn' | false;

interface ValidatorConfig {
  strictMode?: boolean;
  requireSpecDeltas?: SpecDeltaRequirement; // default 'error'
}
```

`ValidateCommand` reads project config via `readProjectConfig(process.cwd())` and passes `requireSpecDeltas` through. The Validator remains a pure logic class with no I/O.

### 3. Tri-state behavior in `validateChangeDeltaSpecs()`

```typescript
if (totalDeltas === 0) {
  if (this.requireSpecDeltas === 'error') {
    issues.push({ level: 'ERROR', ... });
  } else if (this.requireSpecDeltas === 'warn') {
    issues.push({ level: 'WARNING', ... });
  }
  // false → no issue emitted
}
```

Existing `createReport()` handles the rest: `valid = strictMode ? (errors === 0 && warnings === 0) : (errors === 0)`.

### 4. Synthetic completion in `detectCompleted()`

In `state.ts`, after the file-existence scan, if the `specs` artifact is not completed and the config allows specless changes:

```typescript
export function detectCompleted(
  graph: ArtifactGraph,
  changeDir: string,
  options?: { requireSpecDeltas?: 'error' | 'warn' | false }
): CompletedSet {
  const completed = new Set<string>();
  // ... existing file-existence loop ...

  // Synthetically mark specs as complete when not required
  const specsArtifact = graph.getAllArtifacts().find(a => a.id === 'specs');
  if (specsArtifact && !completed.has('specs') &&
      options?.requireSpecDeltas !== undefined &&
      options?.requireSpecDeltas !== 'error') {
    completed.add('specs');
  }

  return completed;
}
```

~5 lines added. `loadChangeContext()` in `instruction-loader.ts` reads project config and passes it through.

**Why hardcode `'specs'`:** The `specs` artifact is the only one with a glob pattern that might legitimately have zero files. A more general "optional artifacts" system would be over-engineering for now.

### 5. "Skipped" status in display

`formatChangeStatus()` already has access to the graph, completed set, and change directory. To distinguish "done" from "skipped":

```typescript
// In formatChangeStatus(), when mapping artifact statuses:
if (context.completed.has(artifact.id)) {
  const hasFiles = artifactOutputExists(context.changeDir, artifact.generates);
  return {
    id: artifact.id,
    outputPath: artifact.generates,
    status: hasFiles ? 'done' : 'skipped',
  };
}
```

If the artifact is in the completed set but has no files on disk, it was synthetically completed → `'skipped'`.

Add to `ArtifactStatus.status`: `'done' | 'ready' | 'blocked' | 'skipped'`
Add to `getStatusIndicator()`: `'skipped'` → `[~]` with `chalk.dim`
Add to `getStatusColor()`: `'skipped'` → `chalk.dim`

Skipped artifacts count toward the completed total in `printStatusText()` (they unblock downstream work).

### 6. No schema changes needed

`apply.requires: [tasks]` doesn't include `specs` directly. The blocker was `tasks.requires: [specs, design]` in the artifact dependency graph, which the synthetic completion resolves.

## Risks / Trade-offs

- **[Risk] Teams accidentally skip specs for feature work** → `"warn"` keeps it visible; `false` requires explicit opt-in in config. Teams can use `--strict` in CI.
- **[Risk] Tri-state is the first `z.union` in config** → Well-established pattern (ESLint). Resilient parsing handles per-field failures.
- **[Risk] Hardcoding `'specs'` in detectCompleted** → Pragmatic for now. If more artifacts need optional behavior, generalize to an `optional` field in schema.yaml.
- **[Risk] `loadChangeContext` needs config access** → It already imports `readProjectConfig` (line 8 of instruction-loader.ts). Minimal wiring.

## Open Questions

_(none)_
