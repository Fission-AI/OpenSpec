Sync delta specs from a change into the main specs. This is an agent-driven intelligent merge - no CLI required.

**Input**: Optionally specify a change name after `/opsx:sync` (e.g., `/opsx:sync add-auth`). If omitted, prompt for selection.

---

## Steps

### 1. Select the change

If no name provided:
- List `openspec/changes/` (exclude `archive/` subdirectory)
- Find changes that have a `specs/` subdirectory with content
- Use **AskUserQuestion tool** to let the user select from those that have delta specs

**IMPORTANT**: Do NOT guess or auto-select. Always let the user choose.

### 2. Find delta specs

Look for files matching `openspec/changes/<name>/specs/*/spec.md`.

If no delta spec files found:
```
No delta specs found in openspec/changes/<name>/specs/

There is nothing to sync. Delta specs would be at:
  openspec/changes/<name>/specs/<capability>/spec.md
```
Stop here.

### 3. For each delta spec, apply changes to main specs

Use **TodoWrite tool** to track progress across capabilities.

For each capability with a delta spec at `openspec/changes/<name>/specs/<capability>/spec.md`:

#### a. Read the delta spec

Parse the delta spec sections:
- `## ADDED Requirements` - New requirements to add
- `## MODIFIED Requirements` - Changes to existing requirements
- `## REMOVED Requirements` - Requirements to remove
- `## RENAMED Requirements` - Requirements to rename (FROM:/TO: format)

#### b. Read the main spec (if it exists)

Read `openspec/specs/<capability>/spec.md`.
If it does NOT exist, you'll create it from scratch.

#### c. Apply changes intelligently

**ADDED Requirements:**
- If the requirement doesn't exist in main spec → add it
- If it already exists → update it to match (treat as implicit MODIFIED)

**MODIFIED Requirements:**
- Find the matching requirement in main spec (by `### Requirement: <Name>` header)
- Apply the specific changes:
  - Adding new scenarios: add them without removing existing ones
  - Modifying scenarios: update the specific scenario text
  - Changing requirement description: update the description
- **Preserve** scenarios and content NOT mentioned in the delta

**REMOVED Requirements:**
- Find the requirement block (`### Requirement: <Name>` through all its scenarios)
- Remove the entire block from main spec

**RENAMED Requirements:**
- Format is: `FROM: \`### Requirement: Old Name\`` / `TO: \`### Requirement: New Name\``
- Find the FROM requirement, rename the header to the TO name

#### d. Create new main spec if capability doesn't exist yet

Create `openspec/specs/<capability>/spec.md`:
```markdown
# <Capability Name> Spec

## Purpose

<Brief purpose - can note "TBD" if unclear>

## Requirements

<Add the ADDED requirements here>
```

Also create the directory: `mkdir -p openspec/specs/<capability>`

### 4. Show summary

```
## Specs Synced: <change-name>

Updated main specs:

**<capability-1>**:
- Added requirement: "New Feature"
- Modified requirement: "Existing Feature" (added 1 scenario)

**<capability-2>**:
- Created new spec file
- Added requirement: "Another Feature"

Main specs are now updated. The change remains active - archive when implementation is complete.
```

---

## Delta Spec Format Reference

```markdown
## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

---

## Key Principle: Intelligent Merging

This is NOT a programmatic merge - you can apply **partial updates**:
- To add a scenario, just include that scenario under MODIFIED - don't copy existing scenarios
- The delta represents *intent*, not a wholesale replacement
- Use your judgment to merge changes sensibly

---

## Guardrails

- Read both delta AND main specs before making any changes
- Preserve existing content not mentioned in the delta
- If something is unclear, ask for clarification before editing
- Show what you're changing as you go
- The operation should be idempotent - running sync twice gives the same result
- After syncing, the change directory is NOT moved - archive separately when done
