## Why

Users and agents need a simple way to submit feedback about OpenSpec directly from the CLI. Currently there's no mechanism to collect user feedback, feature requests, or bug reports in a way that enables follow-up conversation. Using GitHub Issues allows us to track feedback, prevent spam via GitHub auth, and enables outreach to users.

## What Changes

- Add `openspec feedback <message>` CLI command
- Leverage `gh` CLI for GitHub authentication and issue creation
- Add `/feedback` skill for agent-assisted feedback with context enrichment
- Ensure cross-platform compatibility (macOS, Linux, Windows)

## Impact

- Affected specs: New `cli-feedback` capability
- Affected code:
  - `src/cli/index.ts` - Register feedback command
  - `src/commands/feedback.ts` - Command implementation using `gh` CLI
  - `src/core/templates/skill-templates.ts` - Feedback skill template
  - `src/core/completions/command-registry.ts` - Shell completions
- External dependency: Requires `gh` CLI installed and authenticated
