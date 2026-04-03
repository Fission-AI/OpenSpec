## Context

OpenSpec's plugin system (hooks, gates, skill overlays) executes everything sequentially. The `--subagents` and `--teams` orchestration modes exist only in the skill layer (odoo-claude-code overlays) — the CLI is orchestration-agnostic, outputting flat task lists without parallel hints.

Two new plugins need parallel execution: dual-review (Claude + Codex review in parallel after apply) and alignment-check (structural + semantic validation after propose). Rather than hardcoding these, we add a generic orchestration layer to the CLI that any plugin can leverage.

**Current boundary**: CLI provides metadata → Skill layer decides how to execute.
**New boundary**: CLI provides metadata + orchestration hints → Skill layer executes according to hints.

## Goals / Non-Goals

**Goals:**
- CLI-native `--subagents` / `--teams` flags on all `openspec instructions <phase>` commands
- Two-layer orchestration resolution: plugin declares capabilities, schema overrides decisions
- Parallel hook/gate dispatch for `command`-type handlers; `prompt`-type marked as `pending` for AI harness
- `OrchestrationHints` in instructions JSON output consumed by any AI harness
- Two reference plugins (dual-review, alignment-check) demonstrating the system
- `/codex:review` skill in odoo-claude-code

**Non-Goals:**
- CLI does NOT spawn AI agents — it only declares what CAN be parallel
- No changes to existing sequential behavior when flags are absent
- No new CLI commands — only flag additions to existing `instructions` commands
- Not building a general-purpose task scheduler — just parallel group hints

## Decisions

### D1: Orchestration as Hints, Not Execution

CLI outputs `OrchestrationHints` in JSON — the AI harness interprets them.

**Rationale**: OpenSpec is tool-agnostic. Claude Code uses `Agent`/`TeamCreate`, other harnesses may use different mechanisms. The CLI shouldn't know about specific AI tools.

**Alternative considered**: CLI directly spawns parallel processes → rejected because prompt-type gates require AI judgment, which the CLI can't provide.

### D2: Two-Layer Resolution (Plugin + Schema)

```
Plugin declares:  "I can run parallel with X"     (capability)
Schema declares:  "In this phase, X and Y parallel" (decision)
Merge: Schema always wins. Plugin is the default.
```

**Resolution matrix:**

| Plugin \ Schema | not specified | parallel: true | parallel: false |
|-----------------|---------------|----------------|-----------------|
| parallel_with   | ✅ parallel   | ✅ parallel    | ❌ sequential   |
| not specified   | ❌ sequential | ✅ parallel    | ❌ sequential   |
| (conflicts)     | ❌ sequential | ✅ + warning   | ❌ sequential   |

**Rationale**: Plugins know their own concurrency safety. Schemas know project-level sequencing needs (e.g., structural alignment must finish before semantic). Two layers let plugin authors declare intent while project owners retain control.

**Alternative considered**: Schema-only declaration → rejected because plugin authors know best whether their gate is concurrency-safe, and this knowledge shouldn't need to be duplicated in every schema.

### D3: Extend Existing Zod Schemas

Add `orchestration` field to `GateDefinitionSchema` and `HookDefinitionSchema` in `types.ts`:

```typescript
const OrchestrationDeclSchema = z.object({
  parallel_with: z.array(z.string()).optional(),
  preferred_mode: z.enum(['default', 'subagents', 'teams']).optional(),
}).strict();

// Added to GateDefinitionSchema and HookDefinitionSchema
orchestration: OrchestrationDeclSchema.optional()
```

**Rationale**: Keeps all plugin typing in one place. Zod validation catches invalid declarations at load time.

### D4: Task Group Analysis from Markdown Structure

Tasks in `tasks.md` are grouped by `## N.` section headers. Tasks within the same section are parallelizable. Domain tags `[domain: backend]` enable `--teams` assignment.

```markdown
## 1. Data Layer
- [ ] [domain: backend] Create migration script
- [ ] [domain: backend] Add new model fields

## 2. UI Layer  
- [ ] [domain: frontend] Update form view
- [ ] [domain: frontend] Add OWL component

## 3. Testing
- [ ] [domain: test] Write unit tests
```

**Two levels of parallelism:**
- **Intra-group** (`parallel: true`): Tasks within the same `## N.` section can run in parallel (they share no dependencies within the group).
- **Inter-group** (`depends_on`): By default, group N depends on group N-1 (sequential). To allow inter-group parallelism, add `<!-- parallel-with: N -->` comment in the section header.

Example: Group 1 and 2 run sequentially by default. Add `## 2. UI Layer <!-- parallel-with: 1 -->` to make them parallel. Group 3 depends on group 2 (which transitively depends on 1).

**Rationale**: Reuses existing task file structure. The `## N.` convention is already documented in ORCHESTRATION.md overlays. Default sequential between groups is the safe choice — explicit opt-in for inter-group parallelism via HTML comment keeps the syntax lightweight.

### D5: Parallel Hook Dispatch — Command vs Prompt Split

```
Parallel group detected:
├── command-type handlers → Promise.all() in CLI
└── prompt-type handlers  → returned as "pending" array in HookResult
                            → AI harness decides how to parallelize
```

**Rationale**: Command handlers are deterministic (exit code = pass/fail) and can safely run in parallel within Node.js. Prompt handlers require AI judgment — the CLI can't execute them, only signal that they're parallelizable.

### D6: Gate Results Written to Change Directory

```
openspec/changes/{name}/
└── .gates/
    ├── claude-review.json
    ├── codex-review.json
    └── synthesis.json
```

Each gate result file:
```json
{
  "gate_id": "claude-review",
  "status": "pass",
  "timestamp": "2026-04-03T10:00:00Z",
  "findings": [],
  "metadata": {}
}
```

**Rationale**: Persisted results enable re-checking without re-running, and let the CLI's `gate check` command verify completion status. The `.gates/` prefix keeps them out of the main artifact listing.

### D7: User Flag Priority Chain

```
User flag (--teams)  →  upgrades mode only, does NOT force parallel grouping
         ↓
Schema orchestration →  final decision on parallel groups + synthesis strategy
         ↓
Plugin declaration   →  default capabilities (parallel_with, preferred_mode)
         ↓
Default              →  sequential execution
```

The `--subagents`/`--teams` flag only affects the `mode` field in OrchestrationHints. It cannot force sequential gates into parallel — that requires schema-level override.

## Risks / Trade-offs

**[Risk] Prompt-type gates in parallel may produce conflicting AI judgments** → Mitigation: Synthesis strategy (`require-both-pass`, `any-pass`, `majority`) is declared in schema, not left ambiguous.

**[Risk] Plugin authors may incorrectly declare `parallel_with`** → Mitigation: Schema layer can override to sequential. Gate results are persisted for post-hoc debugging.

**[Risk] Task group inference from `## N.` headers is fragile** → Mitigation: This is a convention, not a parser. If headers don't follow the pattern, all tasks fall into a single sequential group (safe default).

**[Risk] Cross-platform path issues in gate result files** → Mitigation: Use `path.join()` for all `.gates/` paths. Gate result files use JSON (no path-dependent content).

**[Decision] Plugin gate scripts use `.js` not `.ts`** — Plugin gate scripts (e.g., `structural.js`) are standalone executables invoked via `node gates/structural.js`. They do NOT import openspec-fork core modules, so they don't need the TypeScript build pipeline. Using `.js` ensures they run on any Node.js ≥20 without `tsx` or `ts-node` as a dependency. If a gate script needs to import openspec utilities in the future, it should be migrated to `.ts` and built as part of the plugin.

**[Trade-off] Two-layer resolution adds complexity** → Accepted because single-layer alternatives (plugin-only or schema-only) each have gaps: plugin-only can't express project-level sequencing needs; schema-only requires duplicating concurrency knowledge.

## Resolved Questions

### Q1: `depends_on` — RESOLVED
Default sequential (group N depends on group N-1). Explicit opt-in for inter-group parallelism via `<!-- parallel-with: N -->` HTML comment in section header. See D4 above.

### Q2: `.gates/` gitignore — RESOLVED
Gitignored — ephemeral execution state. Add `.gates/` to the project `.gitignore`. Gate results are useful during the apply cycle but have no archival value.
