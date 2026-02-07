---
name: lightspec-apply
description: Get instructions for implementing a change
disable-model-invocation: true
---

Generate enriched instructions for implementing the tasks in a change.

## Usage

Use this skill when ready to implement the tasks for a change.

## What This Does

1. Shows which artifacts are complete and which are pending
2. Displays task progress with checkboxes
3. Provides context files to read
4. Gives implementation instructions
5. Shows what's blocking progress (if anything)

## Implementation

Use the CLI command:
```bash
lightspec instructions apply [options]
```

### Options

- `--change <id>`: Change name (auto-detected if only one change)
- `--schema <name>`: Schema override (auto-detected from change metadata)
- `--json`: Output as JSON (for agents/automation)

### Example

```bash
# Get apply instructions for the current change
lightspec instructions apply

# Get apply instructions for a specific change
lightspec instructions apply --change add-user-authentication

# Get JSON output for automation
lightspec instructions apply --json
```

## Output Interpretation

The command shows:
- **Progress**: X/Y tasks complete
- **State**: ready (all artifacts complete), blocked (missing artifacts), or all_done (all tasks complete)
- **Context Files**: List of artifacts to read for context
- **Tasks**: Checklist with [x] for done, [ ] for pending
- **Instruction**: Implementation guidance

## When Blocked

If the state is "blocked", create missing artifacts first using the lightspec-new skill for each artifact, or run `lightspec new change <name>` to continue.
