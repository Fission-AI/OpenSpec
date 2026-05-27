# Adopt Delta-Based Changes for Specifications

## Why

The current approach of storing complete future states in change proposals creates a poor review experience. When reviewing changes on GitHub, reviewers see entire spec files (often 100+ lines) as "added" in green, making it impossible to identify what actually changed. With the recent structured format adoption, we now have clear section boundaries that enable a better approach: storing only additions and modifications.

## What Changes

Store only the requirements that actually change, not complete future states:

- **ADDED Requirements**: New capabilities being introduced
- **MODIFIED Requirements**: Existing requirements being changed (must match current header)
- **REMOVED Requirements**: Deprecated capabilities
- **RENAMED Requirements**: Explicit header changes (e.g., `FROM: Old Name` → `TO: New Name`)

The archive command will programmatically apply these deltas using normalized header matching (trim leading/trailing whitespace) instead of manually copying entire files.

## Impact

**Affected specs**: pastelsdd-conventions, cli-archive, cli-diff

**Benefits**:
- GitHub diffs show only actual changes (25 lines instead of 150+)
- Reviewers immediately see what's being added, modified, or removed
- Conflicts are more apparent when two changes modify the same requirement
- Archive command can programmatically apply changes

**Format**: Delta format only - all changes must use ADDED/MODIFIED/REMOVED sections.

## Example

Instead of storing a 150-line complete future spec, store only:

```markdown
# User Authentication - Changes

## ADDED Requirements

### Requirement: OAuth Support
Users SHALL authenticate via OAuth providers including Google and GitHub.

#### Scenario: OAuth login flow
- **WHEN** user selects OAuth provider
- **THEN** redirect to provider authorization
- **AND** exchange authorization code for tokens

## MODIFIED Requirements

### Requirement: Session Management
Sessions SHALL expire after 30 minutes of inactivity.

#### Scenario: Inactive session timeout  
- **WHEN** no activity for 30 minutes ← (was 60 minutes)
- **THEN** invalidate session token
- **AND** require re-authentication

## RENAMED Requirements
- FROM: `### Requirement: Basic Authentication`
- TO: `### Requirement: Email Authentication`
```

This makes reviews focused and changes explicit.

## Conflict Resolution

Git naturally detects conflicts when two changes modify the same requirement header. This is actually better than full-state storage where Git might silently merge incompatible changes.

## Decisions and Product Guidelines

To keep the archive flow lean and predictable, the following decisions apply:

- New spec creation: When a target spec does not exist, auto-generate a minimal skeleton and insert ADDED requirements only. Skeleton format:
  - `# [Spec Name] Specification`
  - `## Purpose` with placeholder: "TBD — created by archiving change [change-name]. Update Purpose after archive."
  - `## Requirements`
  - If a non-existent spec includes MODIFIED/REMOVED/RENAMED, abort with guidance to create via ADDED-only first.

- Requirement identification: Match requirements by exact header `### Requirement: [Name]` with trim-only normalization and case-sensitive comparison. Use a requirement-block extractor that preserves the exact header and captures full content (including scenarios) for both main specs and delta files.

- Application order and atomicity: Apply deltas in order RENAMED → REMOVED → MODIFIED → ADDED. Validate all operations first, apply in-memory, and write each spec once. On any validation failure, abort without writing partial results. An aggregated totals line is displayed across all specs: `Totals: + A, ~ M, - R, → N`.

- Validation matrix: Enforce that MODIFIED/REMOVED exist; ADDED do not exist; RENAMED FROM exists and TO does not; no duplicates after all operations; and no cross-section conflicts (e.g., same item in MODIFIED and REMOVED). When a rename and modify apply to the same item, MODIFIED must reference the NEW header.

- Idempotency: Keep v1 simple. Abort on precondition failures (e.g., ADDED already exists) with clear errors. Do not implement no-op detection in v1.

- Output and UX: For each spec, display operation counts using standard symbols `+ ~ - →`. Optionally include a short aggregated totals line at the end. Keep messages concise and actionable.

- Error messaging: Standardize messages as `[spec] [operation] failed for header "### Requirement: X" — reason`. On abort, explicitly state: `Aborted. No files were changed.`
- Subsections: Any subsections under a requirement (e.g., `#### Scenario: ...`) are preserved verbatim during parsing and application.

- Backward compatibility: Reject full future-state spec copies for existing specs with guidance to convert to deltas. Allow brand-new specs to be created via ADDED-only deltas using the skeleton above.

- Dry-run: Deferred for v1 to keep scope minimal.