## Why
The project root currently receives a full copy of the Pastelsdd agent instructions, duplicating the content that also lives in `pastelsdd/AGENTS.md`. When teams edit one copy but not the other, the files drift and onboarding assistants see conflicting guidance.

## What Changes
- Keep generating the complete template in `pastelsdd/AGENTS.md` during `pastelsdd init` and follow-up updates.
- Replace the root-level file (`AGENTS.md` or `CLAUDE.md`, depending on tool selection) with a short hand-off that explains the project uses Pastelsdd and points directly to `pastelsdd/AGENTS.md`.
- Add a dedicated stub template so both the init and update flows reuse the same minimal copy instructions.
- Update CLI tests and documentation to reflect the new root-level messaging and ensure the Pastelsdd marker block still protects future updates.

## Impact
- Affected specs: `cli-init`, `cli-update`
- Affected code: `src/core/init.ts`, `src/core/update.ts`, `src/core/templates/agents-template.ts`
- Update assets/readmes that mention the root `AGENTS.md` contents to reference the new stub message.
