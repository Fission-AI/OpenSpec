## Dependency Matrix

| Task ID | Depends On | Type | Reason |
|---------|-----------|------|--------|
| 1.1 | — | — | No dependencies, new file |
| 1.2 | 1.1 | FS | Needs the file created in 1.1 |
| 1.3 | 1.1 | FS | Needs the file created in 1.1 |
| 2.1 | 1.1 | FS | Needs the export functions to exist |
| 2.2 | 1.1 | FS | Needs the template functions to register |
| 2.3 | 1.1 | FS | Needs the template functions to register |
| 2.4 | — | — | Independent constant update |
| 3.1 | — | — | Independent file edit |
| 3.2 | — | — | Independent file edit |
| 3.3 | — | — | Independent file edit |
| 4.1 | — | — | Independent template file edit |
| 5.1 | — | — | Independent schema file edit |
| 5.2 | — | — | Independent schema file edit, same file as 5.1 |
| 6.1 | — | — | Independent constant update |
| 6.2 | — | — | Independent constant update |
| 7.1 | 1.1, 1.2, 1.3 | FS | Tests the new skill template |
| 7.2 | 1.1, 1.2, 1.3 | FS | Tests the new command template |
| 7.3 | 2.1, 2.2, 2.3 | FS | Tests parity including new entry |
| 7.4 | 2.4 | FS | Tests ALL_WORKFLOWS includes new entry |
| 7.5 | 2.2, 2.3 | FS | Tests template count with new entry |
| 7.6 | — | — | Regression check, no dependencies |
| 7.7 | 3.1, 3.2 | FS | Verifies TodoWrite removal |

## Critical Path

```
1.1 → 1.2 → 7.1
          → 7.2
1.1 → 2.1 → 7.3
     2.2 →
     2.3 →
```

The longest chain is: **1.1 → 1.2/1.3 → 7.1/7.2** (3 steps).

Overall critical path duration is short since most tasks are independent edits.

## Parallel Execution Waves

### Wave 1 (no dependencies)
- 1.1 Create multiagent-apply.ts file
- 2.4 Add to ALL_WORKFLOWS
- 3.1 Fix TodoWrite in skill template
- 3.2 Fix TodoWrite in command template
- 3.3 Update output section reference
- 4.1 Update distribution.md template
- 5.1 Update distribution artifact instruction
- 5.2 Update apply.instruction
- 6.1 Add to tool-detection
- 6.2 Add to init
- 7.6 Regression check on dispec-driven tests

### Wave 2 (depends on Wave 1)
- 1.2 Write skill instructions prompt (depends on 1.1)
- 1.3 Write command template content (depends on 1.1)
- 2.1 Export from skill-templates.ts (depends on 1.1)
- 2.2 Register in getSkillTemplates (depends on 1.1)
- 2.3 Register in getCommandTemplates (depends on 1.1)
- 7.4 Test ALL_WORKFLOWS (depends on 2.4)
- 7.7 Verify TodoWrite removed (depends on 3.1, 3.2)

### Wave 3 (depends on Wave 2)
- 7.1 Test skill template (depends on 1.2, 1.3)
- 7.2 Test command template (depends on 1.2, 1.3)
- 7.3 Test parity (depends on 2.1, 2.2, 2.3)
- 7.5 Test template count (depends on 2.2, 2.3)

## Float / Slack

| Task ID | Float | Notes |
|---------|-------|-------|
| 2.4 | High | Independent of critical path, can be done anytime in Wave 1 |
| 3.1–3.3 | High | Independent edits, no downstream blockers except 7.7 |
| 4.1 | High | Independent template edit, no downstream blockers |
| 5.1–5.2 | High | Independent schema edits, no downstream blockers |
| 6.1–6.2 | High | Independent constant updates, no downstream blockers |
| 7.6 | High | Regression check, can run anytime |

## Text DAG

```
Wave 1                    Wave 2                    Wave 3
──────                    ──────                    ──────

[1.1] ──────────────────→ [1.2] ──────────────────→ [7.1]
         │                [1.3] ──────────────────→ [7.2]
         │
         ├──────────────→ [2.1] ──┐
         ├──────────────→ [2.2] ──┼──────────────→ [7.3]
         └──────────────→ [2.3] ──┘               [7.5]

[2.4] ──────────────────→ [7.4]

[3.1] ──┐
[3.2] ──┼──────────────→ [7.7]
[3.3]   │

[4.1]
[5.1]
[5.2]
[6.1]
[6.2]
[7.6]
```
