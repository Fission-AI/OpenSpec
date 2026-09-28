## Context

OpenSpec currently has strong building blocks (workflow templates, command adapters, generation helpers), but orchestration concerns are distributed:

- Workflow definitions and projection lists are maintained separately
- Tool support is represented in multiple places with partial overlap
- Transforms can happen at template rendering time and inside individual adapters
- `init`/`update`/legacy-upgrade each run similar write pipelines with slight differences

The design goal is to preserve current behavior while making extension points explicit and deterministic.

## Goals / Non-Goals

**Goals:**
- Define one canonical source for workflow content and metadata
- Make tool/agent-specific behavior explicit and centrally discoverable
- Keep command adapters as the formatting boundary for tool syntax differences
- Consolidate artifact generation/write orchestration into one reusable engine
- Improve correctness with enforceable validation and parity tests

**Non-Goals:**
- Redesigning command semantics or workflow instruction content
- Changing user-facing CLI command names/flags in this proposal
- Merging unrelated legacy cleanup behavior beyond artifact generation reuse

## Decisions

### 1. Canonical `WorkflowManifest`

**Decision**: Represent each workflow once in a manifest entry containing canonical skill and command definitions plus metadata defaults.

Suggested shape:

```ts
interface WorkflowManifestEntry {
  workflowId: string; // e.g. 'explore', 'ff', 'onboard'
  skillDirName: string; // e.g. 'openspec-explore'
  skill: SkillTemplate;
  command?: CommandTemplate;
  commandId?: string;
  tags: string[];
  compatibility: string;
}
```

**Rationale**:
- Eliminates drift between multiple hand-maintained arrays
- Makes workflow completeness testable in one place
- Keeps split workflow modules while centralizing registration

### 2. `ToolProfileRegistry` for capability wiring

**Decision**: Add a tool profile layer that maps tool IDs to generation capabilities and behavior.

Suggested shape:

```ts
interface ToolProfile {
  toolId: string;
  skillsDir?: string;
  commandAdapterId?: string;
  transforms: string[];
}
```

**Rationale**:
- Prevents capability drift between `AI_TOOLS`, adapter registry, and detection logic
- Allows intentional "skills-only" tools without implicit special casing
- Provides one place to answer "what does this tool support?"

### 3. First-class transform pipeline

**Decision**: Model transforms as ordered plugins with scope + phase + applicability.

Suggested shape:

```ts
interface ArtifactTransform {
  id: string;
  scope: 'skill' | 'command' | 'both';
  phase: 'preAdapter' | 'postAdapter';
  priority: number;
  applies(ctx: GenerationContext): boolean;
  transform(content: string, ctx: GenerationContext): string;
}
```

Execution order:
1. Render canonical content from manifest
2. Apply matching `preAdapter` transforms
3. For commands, run adapter formatting
4. Apply matching `postAdapter` transforms
5. Validate and write

**Rationale**:
- Keeps adapters focused on tool formatting, not scattered behavioral rewrites
- Makes agent-specific modifications explicit and testable
- Replaces ad-hoc transform calls in `init`/`update`

### 4. Shared `ArtifactSyncEngine`

**Decision**: Introduce a single orchestration engine used by all generation entry points.

Responsibilities:
- Build generation plan from `(workflows × selected tools × artifact kinds)`
- Run render/transform/adapter pipeline
- Validate outputs
- Write files and return result summary

**Rationale**:
- Removes duplicated loops and divergent behavior across init/update paths
- Enables dry-run and future preview features without re-implementing logic
- Improves reliability of updates and legacy migrations

### 5. Validation + parity guardrails

**Decision**: Add strict checks in tests (and optional runtime assertions in dev builds) for:

- Required skill metadata fields (`license`, `compatibility`, `metadata`) present for all manifest entries
- Projection consistency (skills, commands, detection names derived from manifest)
- Tool profile consistency (adapter existence, expected capabilities)
- Golden/parity output for key workflows/tools

**Rationale**:
- Converts prior review issues into enforced invariants
- Preserves output fidelity while enabling internal refactors
- Makes regressions obvious during CI

## Risks / Trade-offs

**Risk: Migration complexity**
A broad refactor can destabilize generation paths.
→ Mitigation: introduce in phases with parity tests before cutover.

**Risk: Over-abstraction**
Too many layers can obscure simple flows.
→ Mitigation: keep interfaces minimal and colocate registries with generation code.

**Trade-off: More upfront structure**
Adding manifest/profile/transform registries increases conceptual surface area.
→ Accepted: this cost is offset by reduced drift and easier extension.

## Implementation Approach

1. Build manifest + profile + transform types and registries behind current public API
2. Rewire `getSkillTemplates`/`getCommandContents` to derive from manifest
3. Introduce `ArtifactSyncEngine` and switch `init` to use it with parity checks
4. Switch `update` and legacy upgrade flows to same engine
5. Remove duplicate/hardcoded lists after parity is green
