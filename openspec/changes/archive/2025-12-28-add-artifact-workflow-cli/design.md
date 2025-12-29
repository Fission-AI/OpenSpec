## Context

Slice 4 of the artifact workflow POC. The core functionality (ArtifactGraph, InstructionLoader, change-utils) is complete. This slice adds CLI commands to expose the artifact workflow to users.

**Key constraint**: This is experimental. Commands must be isolated for easy removal if the feature doesn't work out.

## Goals / Non-Goals

- **Goals:**
  - Expose artifact workflow status and instructions via CLI
  - Provide fluid UX with top-level verb commands
  - Support both human-readable and JSON output
  - Enable agents to programmatically query workflow state
  - Keep implementation isolated for easy removal

- **Non-Goals:**
  - Interactive artifact creation wizards (future work)
  - Schema management commands (deferred)
  - Auto-detection of active change (CLI is deterministic, agents infer)

## Decisions

### Command Structure: Top-Level Verbs

Commands are top-level for maximum fluidity:

```
openspec status --change <id>
openspec next --change <id>
openspec instructions <artifact> --change <id>
openspec templates [--schema <name>]
openspec new change <name>
```

**Rationale:**
- Most fluid UX - fewest keystrokes
- Commands are unique enough to avoid conflicts
- Simple mental model for users

**Trade-off accepted:** Slight namespace pollution, but commands are distinct and can be removed cleanly.

### Experimental Isolation

All artifact workflow commands are implemented in a single file:

```
src/commands/artifact-workflow.ts
```

**To remove the feature:**
1. Delete `src/commands/artifact-workflow.ts`
2. Remove ~5 lines from `src/cli/index.ts`

No other files touched, no risk to stable functionality.

### Deterministic CLI with Explicit `--change`

All change-specific commands require `--change <id>`:

```bash
openspec status --change add-auth   # explicit, works
openspec status                      # error: missing --change
```

**Rationale:**
- CLI is pure, testable, no hidden state
- Agents infer change from conversation and pass explicitly
- No config file tracking "active change"
- Consistent with POC design philosophy

### New Change Command Structure

Creating changes uses explicit subcommand:

```bash
openspec new change add-feature
```

**Rationale:**
- `openspec new <name>` is ambiguous (new what?)
- `openspec new change <name>` is clear and extensible
- Can add `openspec new spec <name>` later if needed

### Output Formats

- **Default**: Human-readable text with visual indicators
  - Status: `[x]` done, `[ ]` ready, `[-]` blocked
  - Colors: green (done), yellow (ready), red (blocked)
- **JSON** (`--json`): Machine-readable for scripts and agents

### Error Handling

- Missing `--change`: Error listing available changes
- Unknown change: Error with suggestion
- Unknown artifact: Error listing valid artifacts
- Missing schema: Error with schema resolution details

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Top-level commands pollute namespace | Commands are distinct; isolated for easy removal |
| `status` confused with git | Context (`--change`) makes it clear |
| Feature doesn't work out | Single file deletion removes everything |

## Implementation Notes

- All commands in `src/commands/artifact-workflow.ts`
- Imports from `src/core/artifact-graph/` for all operations
- Uses `getActiveChangeIds()` from `item-discovery.ts` for change listing
- Follows existing CLI patterns (ora spinners, commander.js options)
- Help text marks commands as "Experimental"
