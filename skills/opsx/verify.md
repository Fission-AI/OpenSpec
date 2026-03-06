Verify that an implementation matches the change artifacts (specs, tasks, design). No CLI required.

**Input**: Optionally specify a change name after `/opsx:verify` (e.g., `/opsx:verify add-auth`). If omitted, prompt for selection.

---

## Steps

### 1. Select the change

If no name provided:
- List `openspec/changes/` (exclude `archive/` subdirectory)
- Find changes that have a `tasks.md` file
- Use **AskUserQuestion tool** to let the user select
- Mark changes with incomplete tasks as "(In Progress)"

**IMPORTANT**: Do NOT guess or auto-select. Always let the user choose.

### 2. Load artifacts

Read all available artifacts from `openspec/changes/<name>/`:
- `proposal.md` (if exists)
- `specs/*/spec.md` (all delta spec files, if any)
- `design.md` (if exists)
- `tasks.md` (if exists)

Note which artifacts were found vs missing.

### 3. Initialize verification report structure

Create a mental report with three dimensions:
- **Completeness**: Task checkboxes + spec coverage
- **Correctness**: Requirement implementation + scenario coverage
- **Coherence**: Design adherence + code pattern consistency

Each issue gets a severity: **CRITICAL** | **WARNING** | **SUGGESTION**

### 4. Verify Completeness

#### Task Completion

If `tasks.md` exists:
- Count `- [ ]` (incomplete) vs `- [x]` (complete) lines
- For each incomplete task:
  - Add **CRITICAL**: "Incomplete task: <task description>"
  - Recommendation: "Complete the task or mark `- [x]` if already done"

#### Spec Coverage

If delta specs exist in `openspec/changes/<name>/specs/`:
- Extract all `### Requirement:` headers
- For each requirement, search the codebase for keywords related to it
- If implementation evidence is not found:
  - Add **CRITICAL**: "Requirement not found in codebase: <requirement name>"
  - Recommendation: "Implement requirement: <description>"

### 5. Verify Correctness

#### Requirement Implementation Mapping

For each requirement from delta specs:
- Search codebase for implementation evidence (file paths, function names)
- Note file locations if found
- If implementation appears to diverge from spec intent:
  - Add **WARNING**: "Implementation may diverge from spec: <details>"
  - Recommendation: "Review `<file>:<line>` against requirement: <name>"

#### Scenario Coverage

For each scenario in delta specs (`#### Scenario:` headers):
- Check if the WHEN/THEN conditions appear to be handled in code
- Check if tests exist covering this scenario
- If scenario appears uncovered:
  - Add **WARNING**: "Scenario not covered: <scenario name>"
  - Recommendation: "Add test or implementation for scenario: <WHEN/THEN description>"

### 6. Verify Coherence

#### Design Adherence

If `design.md` exists:
- Extract key decisions (sections with "Decision:", "Approach:", "Architecture:", or `###` headers under "Decisions")
- Check if implementation follows those decisions
- If contradiction found:
  - Add **WARNING**: "Design decision not followed: <decision>"
  - Recommendation: "Update implementation OR revise design.md to match reality"

If no `design.md`: note "No design.md - design adherence check skipped"

#### Code Pattern Consistency

Review new/changed code for consistency with project patterns:
- File naming conventions
- Directory structure
- Coding style (consistent with surrounding code)
- If significant deviation found:
  - Add **SUGGESTION**: "Code pattern deviation: <details>"
  - Recommendation: "Consider following project pattern: <example>"

### 7. Generate Verification Report

```
## Verification Report: <change-name>

### Summary
| Dimension    | Status                        |
|--------------|-------------------------------|
| Completeness | X/Y tasks, N requirements     |
| Correctness  | M/N requirements have evidence|
| Coherence    | <Followed / N issues found>   |

---

### CRITICAL Issues (must fix before archive)

1. **Incomplete task:** 2.3 Add input validation
   → Complete the task or mark `- [x]` if already implemented

2. **Requirement not found:** User can export data
   → Implement export endpoint at `src/api/export.ts`

---

### WARNING Issues (should fix)

1. **Implementation diverges from spec:** Auth token format
   → Review `src/auth/token.ts:45` against Requirement: Token Validation

---

### SUGGESTION Issues (nice to fix)

1. **Code pattern deviation:** Direct SQL in controller
   → Consider using repository pattern like `src/db/userRepo.ts`

---

### Final Assessment

<One of:>
- "X critical issue(s) found. Fix before archiving."
- "No critical issues. Y warning(s) to consider. Ready to archive."
- "All checks passed. Ready to archive."
```

---

## Verification Heuristics

- **Completeness**: Objective checklist items (checkboxes, requirements list)
- **Correctness**: Use keyword search + file path analysis + reasonable inference - don't require certainty
- **Coherence**: Look for glaring inconsistencies, don't nitpick minor style
- **False Positives**: When uncertain → prefer SUGGESTION over WARNING, WARNING over CRITICAL
- **Actionability**: Every issue MUST have a specific, actionable recommendation

## Graceful Degradation

- Only `tasks.md` exists → verify task completion only, skip spec/design checks
- Tasks + specs exist → verify completeness and correctness, skip design
- Full artifacts → verify all three dimensions
- Always note which checks were skipped and why
