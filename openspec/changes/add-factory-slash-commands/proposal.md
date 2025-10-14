## Why
Factory's Droid CLI recently shipped custom slash commands that mirror other native assistant integrations. Teams using OpenSpec want the same managed workflows they already get for Cursor, Windsurf, and others so init/update can provision and refresh Factory commands without manual setup.

## What Changes
- Extend the native tool registry so Factory/Droid appears alongside other slash-command integrations during `openspec init`.
- Add shared templates that generate the three Factory custom commands (proposal, apply, archive) and wrap them in OpenSpec markers for safe refreshes.
- Update the init and update command flows so they create or refresh Factory command files when the tool is selected or already present.
- Refresh CLI specs to document the Factory support and align validation expectations.

## Impact
- Affected specs: `specs/cli-init`, `specs/cli-update`
- Affected code (expected): tool registry, slash-command template manager, init/update command helpers, documentation snippets
