## Why

OpenSpec changes can contain several authoritative artifacts: `proposal.md`, delta specs, `design.md`, and `tasks.md`. After `/opsx:propose`, users may need to review the resulting intent before implementation, but reading every artifact in full is slow and easy to lose.

The workflow needs an optional agent-generated review surface that summarizes the change accurately without becoming the source of truth.

## What Changes

- Add an optional `/opsx:brief` workflow that produces a one-page HTML brief for an existing change.
- The workflow reads the change status and apply context from the OpenSpec CLI, then reads the artifact files listed in `contextFiles`.
- The agent synthesizes a concise human-readable brief with source attribution, risks, questions, implementation order, and verification plan.
- The workflow writes `brief.html` inside the change directory and best-effort opens it with the host OS.
- The workflow is selectable through the custom profile but is not included in the default `core` profile.

## Capabilities

### New Capabilities

- `opsx-brief-skill`: Optional OPSX workflow for generating a human-readable one-page HTML brief from change artifacts

### Modified Capabilities

- `command-generation`: Includes the brief workflow in generated skills and slash commands when selected

## Impact

- `src/core/templates/workflows/brief-change.ts` - new skill and command templates
- `src/core/shared/skill-generation.ts` - include brief templates in the shared generation pipeline
- `src/core/profiles.ts` and related drift/init/update helpers - include `brief` in all workflows, not core workflows
- `docs/commands.md`, `docs/workflows.md`, `docs/opsx.md` - document the optional workflow
- Tests for profile lists, template generation, and install/update behavior
