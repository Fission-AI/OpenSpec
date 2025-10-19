# Implementation Tasks

## 1. Update OpenCode Configurator
- [x] 1.1 Add `$ARGUMENTS` placeholder to OpenCode archive frontmatter (matching the proposal pattern)
- [x] 1.2 Format it as `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` or similar structure for clarity
- [x] 1.3 Ensure `updateExisting` rewrites the archive frontmatter/body so `$ARGUMENTS` persists after `openspec update`

## 2. Update Slash Command Templates
- [x] 2.1 Modify archive steps to validate change ID argument when provided via `$ARGUMENTS`
- [x] 2.2 Keep backward compatibility - allow inferring from context if no argument provided
- [x] 2.3 Add step to validate the change ID exists using `openspec list` before archiving

## 3. Update Documentation
- [x] 3.1 Update AGENTS.md archive examples to show argument usage
- [x] 3.2 Document that OpenCode now supports `/openspec:archive <change-id>`

## 4. Validation and Testing
- [ ] 4.1 Run `openspec update` to regenerate OpenCode slash commands
- [ ] 4.2 Manually test with OpenCode using `/openspec:archive <change-id>`
- [ ] 4.3 Test backward compatibility (archive command without arguments)
- [ ] 4.4 Run `openspec validate --strict` to ensure no issues
