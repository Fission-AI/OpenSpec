# Update Agent Instruction File Name - Tasks

## 1. Rename Instruction File
- [ ] Rename `openspec/README.md` to `openspec/AGENTS.md`
- [ ] Update root references to new path

## 2. Update Templates
- [ ] Rename `src/core/templates/readme-template.ts` to `agents-template.ts`
- [ ] Update exported constant from `readmeTemplate` to `agentsTemplate`

## 3. Adjust CLI Commands
- [ ] Modify `openspec init` to generate `AGENTS.md`
- [ ] Update `openspec update` to refresh `AGENTS.md`
- [ ] Ensure CLAUDE.md markers link to `@openspec/AGENTS.md`

## 4. Update Specifications
- [ ] Modify `cli-init` spec to reference `AGENTS.md`
- [ ] Modify `cli-update` spec to reference `AGENTS.md`
- [ ] Modify `openspec-conventions` spec to include `AGENTS.md` in project structure

## 5. Validation
- [ ] `pnpm test`
