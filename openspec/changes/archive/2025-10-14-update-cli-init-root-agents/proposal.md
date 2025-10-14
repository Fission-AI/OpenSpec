## Why
OpenSpec currently creates the root-level `AGENTS.md` stub only when teams explicitly select the "AGENTS.md standard" tool during `openspec init`. Projects that skip that checkbox never get a managed stub, so non-native assistants (Copilot, Codeium, etc.) have no entry point and later `openspec update` runs silently create the file without any context. We need to bake the stub into initialization, clarify the tool selection experience, and keep the update workflow aligned so every teammate lands on the right instructions from day one.

## What Changes
- Update `openspec init` so the root `AGENTS.md` stub is always generated (first run and extend mode) and refreshed from a shared utility instead of being tied to a tool selection.
- Redesign the AI tool selection wizard to split options into "Natively supported" (Claude, Cursor, OpenCode, …) and an informational "Other tools" section that explains the always-on `AGENTS.md` hand-off.
- Adjust CLI specs, prompts, and success messaging to reflect the new categories while keeping extend-mode behaviour consistent.
- Update automated tests and fixtures to cover the unconditional stub creation and the reworked prompt flow.
- Refresh documentation and onboarding snippets so they no longer describe the stub as opt-in and instead call out the new grouping.
- Ensure `openspec update` continues to reconcile both `openspec/AGENTS.md` and the root stub, documenting the expected behaviour so mismatched setups self-heal.

## Impact
- Affected specs: `cli-init`, `cli-update`
- Affected code: `src/core/init.ts`, `src/core/config.ts`, `src/core/configurators/agents.ts`, `src/core/templates/agents-root-stub.ts`, `src/core/update.ts`, related tests under `test/core/`
- Docs & assets: README, CHANGELOG, any setup guides that reference choosing the "AGENTS.md standard" option
