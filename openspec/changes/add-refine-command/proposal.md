## Why
Teams often need to adjust an approved change after an apply pass produces unexpected results. Today that forces either a brand-new proposal or ad-hoc instructions outside the OpenSpec workflow. A dedicated refine command keeps adjustments inside the workflow while enforcing re-approval and leaving code changes to apply.

## What Changes
**Slash command templates**
- From: Only `proposal`, `apply`, and `archive` shared templates exist.
- To: Add a `refine` shared template that updates proposal/design/tasks/spec deltas only, runs strict validation, and stops for re-approval.
- Reason: Provide a first-class refinement loop without mixing in code changes.
- Impact: New `openspec-refine` command body and template entry.

**Init scaffolding**
- From: `openspec init` scaffolds proposal/apply/archive command files.
- To: Scaffold refine command files alongside the existing three for every supported tool.
- Reason: Make refine available wherever slash commands are generated.
- Impact: One additional command file per tool.

**Update behavior**
- From: `openspec update` refreshes only proposal/apply/archive command files.
- To: Refresh refine files when they already exist, without creating missing ones.
- Reason: Keep refine guidance current while preserving update semantics.
- Impact: Update covers refine templates too.

**Agent instructions**
- From: The workflow guidance focuses on proposal → apply → archive only.
- To: Add refine guidance for post-apply adjustments, including no code changes, re-approval gating, and out-of-scope handling.
- Reason: Keep the documented workflow aligned with the new command.
- Impact: Updated `openspec/AGENTS.md` content.

## Impact
- Affected specs: cli-init, cli-update, docs-agent-instructions
- Affected code: src/core/templates/slash-command-templates.ts, src/core/configurators/slash/*, src/core/templates/agents-template.ts
