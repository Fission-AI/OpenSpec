## 1. Configuration

- [x] 1.1 Add pi to AI_TOOLS array in `src/core/config.ts` with name "Pi", value "pi", available true, successLabel "Pi"

## 2. Slash Command Configurator

- [x] 2.1 Create `src/core/configurators/slash/pi.ts` implementing `PiSlashCommandConfigurator`
- [x] 2.2 Define FILE_PATHS mapping for `.pi/prompts/openspec-{proposal,apply,archive}.md`
- [x] 2.3 Define FRONTMATTER with `description` field for each command
- [x] 2.4 Implement `getRelativePath()` and `getFrontmatter()` methods

## 3. Registry

- [x] 3.1 Import `PiSlashCommandConfigurator` in `src/core/configurators/slash/registry.ts`
- [x] 3.2 Instantiate and register pi configurator in the static block

## 4. Verification

- [x] 4.1 Run `bun run build` to verify TypeScript compiles
- [x] 4.2 Run `bun run test` to verify existing tests pass
- [x] 4.3 Test `openspec init --tools pi` generates expected files in `.pi/prompts/`
