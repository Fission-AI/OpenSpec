## Why

EnpalSpec's default workflow (`core` profile) currently goes propose → apply → archive, with no quality gate before archiving. Verify exists in the system but is excluded from the core profile, meaning it never gets installed for end users. Additionally, all workflow templates still carry OpenSpec/OPSX branding (command names, CLI binary calls, author metadata), which is inconsistent with the EnpalSpec fork identity.

## What Changes

- Add `verify` to `CORE_WORKFLOWS` in `src/core/profiles.ts`, positioned between `apply` and `archive`
- Update all workflow skill/command templates to replace `openspec` CLI binary calls with `enpalspec`
- Update all command display names from `OPSX: <Name>` to `EnpalSpec: <Name>`
- Update skill metadata: `author`, `compatibility` fields from openspec to enpalspec
- Update prose references to "OpenSpec system" / "OpenSpec artifacts" to "EnpalSpec"
- Update `apply-change` template completion message to direct users to `/enpalspec:verify` instead of archive
- Create `.claude/commands/enpalspec/verify.md` in the dev environment (dogfooding)

## Capabilities

### New Capabilities

- `enpalspec-verify-workflow`: The verify skill is included in the default core workflow, installed by `enpalspec init`, and surfaced as a mandatory step between apply and archive

### Modified Capabilities

- `cli-init`: The `core` profile now includes `verify`, so `enpalspec init` generates the verify skill and command by default
- `propose-skill-workflow`: Workflow templates are rebranded — CLI binary calls, command display names, author metadata, and prose all use EnpalSpec identity instead of OpenSpec/OPSX
- `opsx-verify-skill`: Verify command template updated with EnpalSpec branding and wired into the default apply → verify → archive flow

## Impact

- `src/core/profiles.ts`: one-line change to `CORE_WORKFLOWS`
- `src/core/templates/workflows/*.ts`: all 11 workflow template files — branding updates only, no logic changes
- `.claude/commands/enpalspec/verify.md`: new file for dev environment dogfooding
- Users who run `enpalspec init` will now get the verify skill and command installed by default
- The apply → verify → archive flow is communicated through template completion messages
