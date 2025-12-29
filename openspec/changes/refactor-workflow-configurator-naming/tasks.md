## 1. Core renaming

- [ ] 1.1 Rename `SlashCommandConfigurator` → `WorkflowConfigurator` in `src/core/configurators/slash/base.ts`
- [ ] 1.2 Rename `SlashCommandTarget` → `WorkflowTarget` interface in `base.ts`
- [ ] 1.3 Rename `SlashCommandRegistry` → `WorkflowRegistry` in `registry.ts`
- [ ] 1.4 Rename `SlashCommandId` → `WorkflowId` in `src/core/templates/slash-command-templates.ts`
- [ ] 1.5 Rename directory `src/core/configurators/slash/` → `src/core/configurators/workflow/`

## 2. Compatibility aliases

- [ ] 2.1 Export `SlashCommandConfigurator` as alias for `WorkflowConfigurator`
- [ ] 2.2 Export `SlashCommandTarget` as alias for `WorkflowTarget`
- [ ] 2.3 Export `SlashCommandRegistry` as alias for `WorkflowRegistry`
- [ ] 2.4 Export `SlashCommandId` as alias for `WorkflowId`
- [ ] 2.5 Add deprecation JSDoc comments to all aliases

## 3. Update consumers

- [ ] 3.1 Update all configurator subclasses to extend `WorkflowConfigurator`
- [ ] 3.2 Update init command to use `WorkflowRegistry`
- [ ] 3.3 Update update command to use `WorkflowRegistry`
- [ ] 3.4 Update template exports in `src/core/templates/index.ts`
- [ ] 3.5 Remove workaround documentation from `amp.ts` explaining the naming mismatch

## 4. Tests and validation

- [ ] 4.1 Update existing unit tests to use new names
- [ ] 4.2 Verify backward compatibility by testing alias imports
- [ ] 4.3 Run full test suite to ensure no regressions
- [ ] 4.4 Run typecheck and lint
