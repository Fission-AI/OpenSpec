/**
 * Sync: merge a change's delta specs into the main specs without archiving.
 *
 * There is no CLI command for a sync on its own, so the agent merges, by the
 * same rules `openspec archive` applies. The everyday operations sit in
 * SKILL.md; creating a new main spec and retiring one are rarer and stricter,
 * so they live in `references/merge-rules.md`.
 */
import type { SkillTemplate, CommandTemplate, SkillReference } from '../types.js';
import { BEFORE_YOU_START, withReferences } from './references.js';

const MERGE_RULES_REFERENCE: SkillReference = {
  path: 'references/merge-rules.md',
  content: `# Creating and retiring main specs

The main spec lives at \`<planningHome.root>/openspec/specs/<capability-path>/spec.md\` and may not exist yet.

## When the main spec does not exist yet

This is a new capability, and \`openspec archive\` allows only ADDED requirements here:
- Create the spec from the ADDED requirements (see "Main spec format" below).
- MODIFIED or RENAMED: there is no requirement to act on. Stop the sync for that capability, report that its main spec does not exist and only ADDED is allowed for a new spec, and never invent the missing requirement.
- REMOVED: nothing to remove. Skip it and warn.
- A REMOVED-only delta whose change's \`.openspec.yaml\` declares \`retire_capabilities: true\` is already retired: report it and do not recreate the spec. Without that marker, report the sync as blocked: \`openspec archive\` rejects it with \`Spec must have at least one requirement\`. An empty delta has no operations to sync; report it as blocked too.
- Never write an empty \`## Requirements\` section: when no ADDED requirement remains for it, create nothing and leave the specs directory untouched.
- For the Purpose, copy the delta's \`## Purpose\` body verbatim when it has one (this is what \`openspec archive\` does); only write a brief TBD placeholder when it does not.

## Retiring a capability

When removing requirements leaves none, delete the whole \`spec.md\` - and the directory once nothing else is left in it - only when ALL of these hold:
1. removing the requirements *this run* left no requirement blocks;
2. the rest of the spec is well-formed (it still has a \`## Purpose\`);
3. the main spec was not already empty before this sync - if you removed nothing, change nothing;
4. every other nonblank line in the whole file is accounted for as the title, Purpose, Requirements header, or a canonical requirement's statement, scenarios, or fenced examples;
5. the change's \`.openspec.yaml\` declares \`retire_capabilities: true\`;
6. the \`spec.md\` resolves inside the real specs root (do not follow a capability-directory symlink to delete an external file).

If removing the selected requirements would leave no requirement blocks and any condition fails, do not modify the main spec. Stop the sync for that capability, report the blocking condition, and tell the user how to resolve it. Never write or leave an empty \`## Requirements\` section. When only the marker is missing, say so - it is the one thing the user can add to make the retirement go through. Deleting the file also deletes its \`## Purpose\`; any other section blocks retirement. Name Purpose when you report the retirement, and include a pasteable \`git checkout\` only when the spec lived in the caller's checkout; otherwise give checkout-scoped recovery guidance.

## Delta spec format

\`\`\`markdown
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
- FROM: \`### Requirement: Old Name\`
- TO: \`### Requirement: New Name\`
\`\`\`

## Main spec format

Main specs never contain delta operation headers (\`## ADDED/MODIFIED/REMOVED/RENAMED Requirements\`). After a sync every requirement lives under one \`## Requirements\` section:

\`\`\`markdown
# <capability> Specification

## Purpose
Short description of what this capability does and why it exists.

## Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y
\`\`\`

A new main spec starts with a \`# <capability> Specification\` title; an existing one keeps its title. Requirement blocks use \`### Requirement:\` headings and their scenarios \`#### Scenario:\` headings. Keep anything the delta does not mention exactly as it is, in the main spec's existing order.
`,
};

const REFERENCES = [MERGE_RULES_REFERENCE];

function getSyncInstructions(input: string): string {
  return `Merge a change's delta specs into the main specs, without archiving the change. You merge by hand, so anything the delta does not mention stays exactly as it is.

${BEFORE_YOU_START}

**Input**: ${input}

**Steps**

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run \`openspec list --json\` and ask, listing changes that have delta specs. Say "Using change: <name>" and how to pick another (\`/opsx:sync <other>\`).

2. **Find the delta specs.** Run \`openspec status --change "<name>" --json\`. Main specs live under \`<planningHome.root>/openspec/specs/\` (the store, when one is selected). \`artifactPaths.specs.existingOutputPaths\` is the only source of delta spec paths. If it is missing or empty, report that there are no delta specs to sync and stop, without inferring them from other artifacts.

   Sync every listed path unless the caller narrowed the set by naming complete entries from \`existingOutputPaths\` (copy those absolute values verbatim; for example, the entry ending in \`/specs/billing/invoices/spec.md\`). Then sync only those and leave the rest untouched. Never widen a narrowed set back to the full list. If a named path is not in \`existingOutputPaths\`, report it and stop. If the named list is empty, report that there is nothing to sync and stop.

3. **Get the specs rules once.** Before the first main-spec write, run \`openspec instructions specs --change "<name>" --json\`, or reuse the snapshot a calling workflow already fetched. If the lookup exits non-zero or returns invalid JSON, report the error and stop before writing any main spec; a failure is not the same as having no rules. A valid response with no \`rules\` means none are configured. Apply returned \`rules\` only to the main specs this merge produces, never copying their text into a spec or summary.

4. **Merge each delta.** For each selected path, read the delta and its main spec at \`<planningHome.root>/openspec/specs/<capability-path>/spec.md\` (\`<capability-path>\` is the spec directory relative to \`specs/\`; keep the delta's full path). If the main spec does not exist yet, or removing requirements would leave it with none, follow \`references/merge-rules.md\`. Otherwise apply each operation in place:

   - **ADDED**: add the requirement. If it already exists, update it to match (an implicit MODIFIED).
   - **MODIFIED**: replace the requirement with the delta's version, in place. When its heading starts with an ID (\`AUTH-3\`), find the requirement with that ID even if the name was reworded; otherwise find it by name. A MODIFIED block carries the whole requirement - body plus every scenario that survives the change. \`openspec validate\` and \`openspec archive\` both reject one that drops a scenario the main spec still has.
   - **REMOVED**: delete the whole requirement block.
   - **RENAMED**: find the FROM requirement and rename it to TO.
   - **\`## Purpose\` in the delta**: leave the main spec's Purpose alone (this is what \`openspec archive\` does).

   Never copy a delta file into a main spec as-is: requirements live under one \`## Requirements\` section, with \`### Requirement:\` headings and \`#### Scenario:\` scenarios, and no \`## ADDED/MODIFIED/REMOVED/RENAMED Requirements\` headers.

5. **Validate.** Run \`openspec validate --specs\` with the same selected-root flags used earlier. If validation fails, report the problems and do not claim the sync succeeded.

6. **Show summary**: per capability, the requirements added, modified, removed, and renamed; any spec created or retired; and any new spec left with a TBD Purpose, so it gets written now. End with: "Main specs are updated. The change remains active - archive it when implementation is complete."

**Guardrails**
- The operation is idempotent: running it twice gives the same result
- If something is unclear, ask for clarification`;
}

export function getSyncSpecsSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-sync-specs',
    description: 'Sync delta specs from an OpenSpec change to main specs. Use when the user wants to update main specs with changes from a delta spec, without archiving the change. Also use when the user says "openspec sync" or "opsx sync".',
    instructions: getSyncInstructions(
      'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.'
    ),
    references: REFERENCES,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxSyncCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Sync',
    description: 'Sync delta specs from a change to main specs',
    category: 'Workflow',
    tags: ['workflow', 'specs', 'experimental'],
    content: withReferences(
      getSyncInstructions(
        'Optionally specify a change name after `/opsx:sync` (e.g., `/opsx:sync add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.'
      ),
      REFERENCES
    ),
  };
}
