## 1. Scope And Specs

- [x] 1.1 Confirm no new capabilities and only `cli-update` spec is modified
- [x] 1.2 Review `openspec/specs/cli-update/spec.md` to locate the existing OpenCode slash command scenario
- [x] 1.3 Update the delta spec to replace `.opencode/command/` with `.opencode/commands/` and remove the Windows path variant if not required

## 2. OpenSpec Initialization Script Update

- [x] 2.1 Find the OpenSpec initialization script that generates OpenCode command markdown files
- [x] 2.2 Change the OpenCode command output directory to `.opencode/commands/`
- [x] 2.3 If `.opencode/command/` exists, migrate known OpenCode command files into `.opencode/commands/`
- [x] 2.4 If `.opencode/command/` is empty after migration, prompt the user to delete it and remove it on confirmation
- [x] 2.5 Ensure the cleanup prompt is visible (pause spinner before asking)

## 3. Tests And Verification

- [x] 3.1 Update any tests or fixtures that assert the OpenCode command directory path
- [x] 3.2 Run existing tests related to OpenSpec init/update and ensure they pass
