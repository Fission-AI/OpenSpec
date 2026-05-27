## Why
The current `pastelsdd init` flow assumes a single assistant selection and stops once an Pastelsdd structure already exists. That makes onboarding feel rigid: teams cannot configure multiple tools in one pass, they do not learn which files were refreshed, and the success copy always references Claude even when other assistants are involved.

## What Changes
- Allow selecting multiple assistants during `pastelsdd init`, including refreshing existing configurations in a single run.
- Provide richer onboarding copy that summarizes which tool files were created or refreshed and guides users on next steps for each assistant.
- Align generated AI-instruction content and specs so CLAUDE.md and AGENTS.md share the same Pastelsdd guidance.
- Update specs and tests to cover the multi-select prompt, improved summaries, and extend-mode coordination.

## Impact
- Specs: `cli-init`
- Code: `src/core/init.ts`, `src/core/config.ts`, `src/core/templates/*`, `src/core/configurators/*`
- Tests: `test/core/init.test.ts`, `test/core/update.test.ts`
