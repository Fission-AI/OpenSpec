## Why
Agents fumble proposal formatting because the essential Markdown templates and formatting rules are buried mid-document. Reorganizing `openspec/AGENTS.md` with a prominent quick-reference and embedded examples will help assistants follow the process without guesswork.

## What Changes
- Restructure `openspec/AGENTS.md` so file formats and scaffold templates appear in a top-level quick-reference section before workflow prose.
- Embed copy/paste templates for `proposal.md`, `tasks.md`, `design.md`, and spec deltas alongside inline examples within the workflow steps.
- Add a pre-validation checklist that highlights the most common formatting pitfalls before running `openspec validate`.
- Split content into beginner vs. advanced sections to progressively disclose complexity while keeping advanced guidance accessible.

## Impact
- Affected specs: `specs/docs-agent-instructions`
- Affected code: `openspec/AGENTS.md`, `docs/`
