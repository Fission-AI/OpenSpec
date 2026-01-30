## Why

OpenCode uses hyphen-based command syntax (`/opsx-new`) but our templates contain colon-based references (`/opsx:new`). This creates inconsistency where generated command files and skill files contain references that don't match the actual command invocation syntax, confusing both the AI and users.

## What Changes

- Create a shared transformation utility (`transformToHyphenCommands`) for converting `/opsx:` to `/opsx-`
- Update the OpenCode command adapter to transform body text using this utility
- Add an optional `transformInstructions` callback parameter to `generateSkillContent()`
- Update `init.ts` and `update.ts` to pass the transformer when generating skills for OpenCode

## Capabilities

### New Capabilities

None - this is a bug fix, not a new capability.

### Modified Capabilities

None - no spec-level behavior changes. This is an implementation fix in the OpenCode adapter and skill generation that doesn't change any external requirements or contracts.

## Impact

- **Code**: 
  - `src/utils/command-references.ts` (new file)
  - `src/utils/index.ts` (export)
  - `src/core/shared/skill-generation.ts` (add callback parameter)
  - `src/core/command-generation/adapters/opencode.ts` (use transformer)
  - `src/core/init.ts` (pass transformer for OpenCode)
  - `src/core/update.ts` (pass transformer for OpenCode)
- **Users**: OpenCode users will see correct `/opsx-` command references in both generated command files AND skill files
- **Other tools**: No impact - transformation only applies to OpenCode
