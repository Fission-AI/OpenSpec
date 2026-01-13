## Why

Users and agents need a simple way to submit feedback about OpenSpec directly from the CLI. Currently there's no mechanism to collect user feedback, feature requests, or bug reports in a way that enables follow-up conversation.

## What Changes

- Add `openspec feedback <message>` CLI command
- Add GitHub Device OAuth flow for user authentication
- Create GitHub Issues in the openspec repository for each feedback submission
- Add `/feedback` skill for agent-assisted feedback with context enrichment and anonymization

## Impact

- Affected specs: New `cli-feedback` capability
- Affected code:
  - `src/cli/index.ts` - Register feedback command
  - `src/commands/feedback.ts` - Command implementation
  - `src/auth/github.ts` - GitHub OAuth device flow
  - `src/core/templates/skill-templates.ts` - Feedback skill template
  - `src/core/completions/command-registry.ts` - Shell completions
