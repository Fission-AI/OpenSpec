## Why

The current explore skill is a free-form thinking partner with no persistent output and no connection to the propose workflow. Design decisions made in exploration evaporate after the conversation ends, and there is no mechanism to ensure non-trivial changes have been properly explored before a proposal is written.

## What Changes

- **New schema `enpal-spec-driven`**: A project-local fork of `spec-driven` with the exploration convention documented in the proposal artifact instruction
- **Enhanced explore skill**: Hybrid flow — open-ended exploration first, then structured round-based Q&A to capture decisions; outputs `openspec/explorations/<yyyy-mm>/exploration-<date>-<topic>.md` incrementally during the session
- **Enhanced propose skill**: Scans `openspec/explorations/<yyyy-mm>/` for a matching exploration doc before creating a proposal; prompts user if none found (with bypass for trivial changes); seeds proposal from exploration insights when found

## Capabilities

### New Capabilities

- `enpal-spec-driven-schema`: The `enpal-spec-driven` schema — a fork of `spec-driven` with updated proposal instruction referencing the exploration convention
- `exploration-docs`: Convention and format for exploration documents written by the explore skill to `openspec/explorations/<yyyy-mm>/exploration-<date>-<topic>.md`
- `explore-skill-workflow`: The enhanced explore skill — hybrid free-form + round-based Q&A flow, Q&A log tracking in the exploration doc, multi-round until ambiguity is resolved
- `propose-skill-workflow`: The enhanced propose skill — exploration scan, explicit context handoff, trivial change detection, user confirmation gate

### Modified Capabilities

- `opsx-archive-skill`: Skill name prefix changes from `opsx` to `enpalspec` for all workflow skills (**note**: this is scoped to the skill command names only — internal folders and docs remain unchanged)

## Impact

- New directory: `schemas/enpal-spec-driven/` (schema YAML + templates copied from `spec-driven`)
- Modified skill templates in `src/core/templates/workflows/`: `explore.ts`, `new-change.ts` (or equivalent propose template)
- New exploration doc convention: `openspec/explorations/<yyyy-mm>/` (project-level, outside change directories)
- No changes to CLI commands, artifact graph, or schema resolution code
- No breaking changes to existing `spec-driven` schema or installed skills
