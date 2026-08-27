## Why

CodeBuddy slash command configurator currently uses inconsistent frontmatter fields compared to other tools. It uses `category` and `tags` fields (like Crush) but should use `argument-hint` field (like Factory, Auggie, and Codex) for better consistency. Additionally, the `proposal` command is missing frontmatter fields entirely. After reviewing CodeBuddy's official documentation, the correct format should use `description` and `argument-hint` fields with square bracket parameter format.

## What Changes

- Replace `category` and `tags` fields with `argument-hint` field in CodeBuddy frontmatter
- Add missing frontmatter fields to the `proposal` command
- Use correct square bracket format for `argument-hint` parameters (e.g., `[change-id]`)
- Ensure consistency with CodeBuddy's official documentation

## Impact

- Affected specs: cli-init, cli-update
- Affected code: `src/core/configurators/slash/codebuddy.ts`
- CodeBuddy users will get proper argument hints in the correct format for slash commands