## 1. Configuration

- [ ] 1.1 Add pi to AI_TOOLS array in `src/core/config.ts` with name "Pi", value "pi", available true, successLabel "Pi"

## 2. Slash Command Configurator

- [ ] 2.1 Create `src/core/configurators/slash/pi.ts` implementing `PiSlashCommandConfigurator`
- [ ] 2.2 Define FILE_PATHS mapping for `.pi/prompts/openspec-{proposal,apply,archive}.md`
- [ ] 2.3 Define FRONTMATTER with `description` field for each command
- [ ] 2.4 Implement `getRelativePath()` and `getFrontmatter()` methods

## 3. Registry

- [ ] 3.1 Import `PiSlashCommandConfigurator` in `src/core/configurators/slash/registry.ts`
- [ ] 3.2 Instantiate and register pi configurator in the static block

## 4. Verification

- [ ] 4.1 Run `bun run build` to verify TypeScript compiles
- [ ] 4.2 Run `bun run test` to verify existing tests pass
- [ ] 4.3 Test `openspec init --tools pi` generates expected files in `.pi/prompts/`
