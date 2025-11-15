## Why
A recent feature request highlighted that users struggle to scope proposals when all clarifications have to be typed manually. They want a guided interview that surfaces missing assumptions, recommends best-practice defaults, and produces a sharper brief before handing off to `/openspec/proposal`. Delivering an interactive Q&A flow keeps OpenSpec competitive with other planning assistants and shortens the loop between idea and actionable change specification.

## What Changes
- Add a dedicated `/openspec/proposal-qa` slash command that runs a structured discovery interview before drafting a change proposal.
- Teach the agent to analyse the initial request, label what is already explicit versus ambiguous, and derive a small set of high-impact clarifying questions.
- Require every question to include rationale, 2–4 recommended options with a default, and clear guidance on when to pick each option.
- Capture the conversation outcome in a structured summary (problem, clarified decisions, open risks) that the user can accept or tweak before invoking `/openspec/proposal`.
- Update onboarding (`init`/`update`) and slash command templates so the new command ships everywhere OpenSpec currently provisions proposal/apply/archive helpers.

## Impact
- Affected specs: assistant-proposal-qa (new), cli-init, cli-update, slash-commands-template (if modelled separately)
- Affected code: `src/core/templates/slash-command-templates.ts`, `src/core/configurators/slash/*`, command scaffolding that writes `.claude/.cursor/.opencode` files, and associated tests.
