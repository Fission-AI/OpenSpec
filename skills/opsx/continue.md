Continue working on an existing OpenSpec change - create the next pending artifact. No CLI required.

**Input**: Optionally specify a change name after `/opsx:continue` (e.g., `/opsx:continue add-auth`). If omitted, prompt for selection.

---

## Spec-Driven Artifact Instructions (Built-in)

### proposal.md
Create the proposal document establishing WHY this change is needed.

Sections:
- **Why**: 1-2 sentences on the problem/opportunity
- **What Changes**: Bullet list of specific changes (mark breaking changes with **BREAKING**)
- **Capabilities**:
  - **New Capabilities**: List new capabilities, each will become `specs/<name>/spec.md`
  - **Modified Capabilities**: Existing capabilities whose requirements change (check `openspec/specs/`)
- **Impact**: Affected code, APIs, dependencies

Constraints: Research `openspec/specs/` to reference existing capability names correctly. Keep concise (1-2 pages). Focus on "why", not "how".

### specs/<capability>/spec.md
Create specification files defining WHAT the system should do (testable requirements).

Delta format with `##` headers:
- `## ADDED Requirements` - New capabilities
- `## MODIFIED Requirements` - Changed behavior (include full updated content)
- `## REMOVED Requirements` - Deprecated features (include **Reason** + **Migration**)
- `## RENAMED Requirements` - Name changes only (FROM:/TO: format)

Requirement format:
```
### Requirement: <Name>
The system SHALL <description>.

#### Scenario: <name>
- **WHEN** <trigger>
- **THEN** <outcome>
```

Rules: Use SHALL/MUST. Every requirement needs at least one scenario. Scenarios use exactly `####` (4 hashtags). Create one file per capability listed in proposal's Capabilities section.

### design.md
Create the design document explaining HOW to implement the change.

Include only if: cross-cutting change, new external dependency, security/performance complexity, or significant ambiguity.

Sections: Context, Goals/Non-Goals, Decisions (with rationale + alternatives), Risks/Trade-offs, Migration Plan, Open Questions.

If not needed, create minimal: "# Design: <name>\n\nNot required for this change."

### tasks.md
Create the implementation checklist.

Format:
```
## 1. <Category>

- [ ] 1.1 <Task description>
- [ ] 1.2 <Task description>

## 2. <Category>

- [ ] 2.1 <Task description>
```

Rules: MUST use `- [ ]` format. Group under `## N.` sections. Order by dependency. Reference specs for what, design for how.

---

## Steps

### 1. Select the change

If no name provided:
- List `openspec/changes/` (exclude `archive/` subdirectory)
- Use **AskUserQuestion tool** to let user select

### 2. Determine which artifacts exist

Check `openspec/changes/<name>/`:
- `proposal.md` exists? → done
- `specs/` has files? → done
- `design.md` exists? → done
- `tasks.md` exists? → done

### 3. Determine the next artifact to create

Using spec-driven dependency order:
1. `proposal` - if missing → create it
2. `specs` - if proposal done but specs missing → create spec files
3. `design` - if proposal done but design missing → create it
4. `tasks` - if specs AND design done but tasks missing → create it

If ALL artifacts exist:
```
## All Artifacts Complete: <name>

All artifacts are already created for this change.

### Status
| Artifact   | Status |
|------------|--------|
| proposal   | ✓ done |
| specs      | ✓ done |
| design     | ✓ done |
| tasks      | ✓ done |

Ready for implementation. Run `/opsx:apply <name>`.
```
Stop here.

### 4. Show what's about to be created

Display:
```
## Continuing: <name>

**Next artifact:** <artifact-name>
**Purpose:** <brief purpose>
**Output:** openspec/changes/<name>/<path>

[Show the artifact-specific instructions from the reference above]

Ready to draft? Describe any additional context, or ask me to proceed.
```

Wait for user confirmation or context before drafting.

### 5. Read dependencies and draft the artifact

Read completed dependency files for context.
Draft the artifact following its specific instructions.

Show a preview and ask: "Does this look right? I'll save it when you confirm."

### 6. Save the artifact

Write the file to the correct path.

Show:
```
✓ Created openspec/changes/<name>/<artifact>

### Updated Status
| Artifact   | Status   |
|------------|----------|
| proposal   | ✓ done   |
| specs      | ✓ done   |
| design     | ○ ready  |  ← next
| tasks      | · waiting|

Run `/opsx:continue <name>` to create the next artifact.
```

---

## Guardrails

- Always read dependency artifacts before creating a new one
- Show the artifact instructions clearly before drafting
- Ask for user confirmation before saving
- If the change doesn't exist, suggest `/opsx:new <name>` to create it
- If user provided extra context at the start, incorporate it into the artifact
- Do NOT skip artifact steps - follow the dependency order
