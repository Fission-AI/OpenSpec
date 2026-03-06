Propose a new change - create the change directory and generate all artifacts (proposal, specs, design, tasks) in one step. No CLI required.

**Input**: The argument after `/opsx:propose` is the change name (kebab-case), OR a description of what the user wants to build.

---

## Spec-Driven Artifact Schema (Built-in Reference)

The default workflow is **spec-driven**: `proposal → specs → design → tasks`

### Artifact: proposal.md
**Purpose**: WHY we're doing this change.

Sections:
- **Why**: 1-2 sentences on the problem/opportunity
- **What Changes**: Bullet list of changes (mark breaking changes with **BREAKING**)
- **Capabilities**:
  - **New Capabilities**: List new capabilities, each becomes `specs/<name>/spec.md`
  - **Modified Capabilities**: Existing capabilities whose requirements change
- **Impact**: Affected code, APIs, dependencies

### Artifact: specs/<capability>/spec.md
**Purpose**: WHAT the system should do (testable requirements).

Delta spec format using `##` headers:
- `## ADDED Requirements` - New requirements
- `## MODIFIED Requirements` - Changed behavior (include full updated content)
- `## REMOVED Requirements` - Deprecated (include **Reason** and **Migration**)
- `## RENAMED Requirements` - Name changes (FROM:/TO: format)

Requirement format:
```
### Requirement: <Name>
The system SHALL <description>.

#### Scenario: <name>
- **WHEN** <trigger>
- **THEN** <outcome>
```

Rules:
- Use SHALL/MUST for normative requirements
- Every requirement MUST have at least one scenario
- Scenarios use exactly `####` (4 hashtags)

### Artifact: design.md
**Purpose**: HOW to implement the change.

Sections: Context, Goals/Non-Goals, Decisions (with rationale), Risks/Trade-offs, Migration Plan (if needed), Open Questions

Create design.md only if: cross-cutting change, new external dependency, security/performance complexity, or significant ambiguity.

### Artifact: tasks.md
**Purpose**: Implementation checklist with trackable checkboxes.

Format:
```
## 1. <Category>

- [ ] 1.1 <Task description>
- [ ] 1.2 <Task description>

## 2. <Category>

- [ ] 2.1 <Task description>
```

Rules: Tasks MUST use `- [ ]` format. Group under `## N.` sections. Order by dependency.

---

## Steps

### 1. Determine the change name

If the argument is a description (not kebab-case), derive a kebab-case name:
- "add user authentication" → `add-user-auth`
- "fix login bug" → `fix-login-bug`

If no input provided, use the **AskUserQuestion tool** to ask:
> "What change do you want to work on? Describe what you want to build or fix."

**IMPORTANT**: Do NOT proceed without knowing what to build.

### 2. Check if change already exists

Check if `openspec/changes/<name>/` already exists.
- If yes: Ask the user if they want to continue it or start fresh (different name).

### 3. Create the change directory structure

```bash
mkdir -p openspec/changes/<name>/specs
```

Create `openspec/changes/<name>/.openspec.yaml`:
```yaml
schema: spec-driven
name: <name>
created: <YYYY-MM-DD>
```

### 4. Use **TodoWrite tool** to track artifact creation progress

Add todos for: proposal, specs, design, tasks.

### 5. Create artifacts in dependency order

**Order**: proposal → specs → design → tasks

#### 5a. Create `openspec/changes/<name>/proposal.md`

Research the project context first:
- Read `openspec/config.yaml` if it exists (for project context)
- Read `openspec/specs/` directory listing (to understand existing capabilities)

Draft and write the proposal following the schema above.

Show brief progress: "Created proposal.md"

#### 5b. Read proposal and create spec files

Read the completed proposal.md.
For each capability listed in the Capabilities section:
- Create `openspec/changes/<name>/specs/<capability>/spec.md`
- Follow the delta spec format from the schema above

Show brief progress: "Created specs/<capability>/spec.md"

#### 5c. Read proposal + specs, create `openspec/changes/<name>/design.md`

Determine if design.md is needed (see when-to-include criteria above).
If needed: draft and write design.md.
If not needed: create a minimal placeholder:
```markdown
# Design: <name>

Not required for this change. See proposal.md for context.
```

Show brief progress: "Created design.md"

#### 5d. Read all artifacts, create `openspec/changes/<name>/tasks.md`

Read proposal, specs, and design.
Draft granular, checkable tasks following the format above.

Show brief progress: "Created tasks.md"

### 6. Show final summary

```
## Change Created: <name>

**Location:** openspec/changes/<name>/
**Schema:** spec-driven

### Artifacts Created
- proposal.md - Why we're doing this
- specs/<capability>/spec.md - Requirements and scenarios
- design.md - Technical approach
- tasks.md - Implementation checklist

All artifacts created! Ready for implementation.

Run `/opsx:apply` to start implementing the tasks.
```

---

## Guardrails

- Read existing `openspec/specs/` before writing proposal (to reference existing capabilities correctly)
- Always read dependency artifacts before creating new ones
- `context` in `openspec/config.yaml` is for YOUR constraints - do NOT copy it into artifacts
- If context is critically unclear, ask the user - but prefer reasonable decisions to keep momentum
- Verify each artifact file exists after writing before proceeding to next
- If a change already exists, do NOT overwrite without user confirmation
