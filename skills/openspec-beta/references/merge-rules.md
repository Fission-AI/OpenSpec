# Creating and retiring main specs

The main spec lives at `<planningHome.root>/openspec/specs/<capability-path>/spec.md` and may not exist yet.

## When the main spec does not exist yet

This is a new capability, and `openspec archive` allows only ADDED requirements here:
- Create the spec from the ADDED requirements (see "Main spec format" below).
- MODIFIED or RENAMED: there is no requirement to act on. Stop the sync for that capability, report that its main spec does not exist and only ADDED is allowed for a new spec, and never invent the missing requirement.
- REMOVED: nothing to remove. Skip it and warn.
- A REMOVED-only delta whose change's `.openspec.yaml` declares `retire_capabilities: true` is already retired: report it and do not recreate the spec. Without that marker, report the sync as blocked: `openspec archive` rejects it with `Spec must have at least one requirement`. An empty delta has no operations to sync; report it as blocked too.
- Never write an empty `## Requirements` section: when no ADDED requirement remains for it, create nothing and leave the specs directory untouched.
- For the Purpose, copy the delta's `## Purpose` body verbatim when it has one (this is what `openspec archive` does); only write a brief TBD placeholder when it does not.

## Retiring a capability

When removing requirements leaves none, delete the whole `spec.md` - and the directory once nothing else is left in it - only when ALL of these hold:
1. removing the requirements *this run* left no requirement blocks;
2. the rest of the spec is well-formed (it still has a `## Purpose`);
3. the main spec was not already empty before this sync - if you removed nothing, change nothing;
4. every other nonblank line in the whole file is accounted for as the title, Purpose, Requirements header, or a canonical requirement's statement, scenarios, or fenced examples;
5. the change's `.openspec.yaml` declares `retire_capabilities: true`;
6. the `spec.md` resolves inside the real specs root (do not follow a capability-directory symlink to delete an external file).

If removing the selected requirements would leave no requirement blocks and any condition fails, do not modify the main spec. Stop the sync for that capability, report the blocking condition, and tell the user how to resolve it. Never write or leave an empty `## Requirements` section. When only the marker is missing, say so - it is the one thing the user can add to make the retirement go through. Deleting the file also deletes its `## Purpose`; any other section blocks retirement. Name Purpose when you report the retirement, and include a pasteable `git checkout` only when the spec lived in the caller's checkout; otherwise give checkout-scoped recovery guidance.

## Delta spec format

```markdown
# Spec Delta

## Purpose
Only on a delta that introduces a brand-new capability. Seeds the new main spec.

## ADDED Requirements
### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements
### Requirement: Existing Feature
The system SHALL keep doing the existing thing, now also handling A.

#### Scenario: Scenario the main spec already has
- **WHEN** user does X
- **THEN** system does Y

## REMOVED Requirements
### Requirement: Deprecated Feature

## RENAMED Requirements
- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

## Main spec format

Main specs never contain delta operation headers (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`). After a sync every requirement lives under one `## Requirements` section:

```markdown
# <capability> Specification

## Purpose
Short description of what this capability does and why it exists.

## Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y
```

A new main spec starts with a `# <capability> Specification` title; an existing one keeps its title. Requirement blocks use `### Requirement:` headings and their scenarios `#### Scenario:` headings. Keep anything the delta does not mention exactly as it is, in the main spec's existing order.
