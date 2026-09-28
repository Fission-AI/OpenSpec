## 1. Adapter

- [x] 1.1 Create `src/core/command-generation/adapters/oh-my-pi.ts` with `ohMyPiAdapter` (toolId `'oh-my-pi'`, path `.omp/commands/opsx-<id>.md`, description-only frontmatter, `transformToHyphenCommands` on body)
- [x] 1.2 Use `escapeYamlValue` for the `description` frontmatter field (consistent with Pi adapter)
- [x] 1.3 Export `ohMyPiAdapter` from `src/core/command-generation/adapters/index.ts`
- [x] 1.4 Import and register `ohMyPiAdapter` in `src/core/command-generation/registry.ts`
- [x] 1.5 In `formatFile`, inject `**Provided arguments**: $@` on the line after the `**Input**:` heading (skip if `$@` or `$ARGUMENTS` already present) — matching Pi adapter's `injectPiArgs` logic

## 2. Tool Registration

- [x] 2.1 Add `{ name: 'Oh My Pi', value: 'oh-my-pi', available: true, successLabel: 'Oh My Pi', skillsDir: '.omp' }` to `AI_TOOLS` in `src/core/config.ts` (alphabetical by name, between Mistral Vibe and OpenCode)

## 3. Skill Transformer Wiring

- [x] 3.1 In `src/core/init.ts`, extend the skill transformer conditional to include `tool.value === 'oh-my-pi'` alongside `'opencode'` and `'pi'` (one occurrence, in `generateSkillsAndCommands`)
- [x] 3.2 In `src/core/update.ts`, extend the skill transformer conditional to include `tool.value === 'oh-my-pi'` alongside `'opencode'` and `'pi'` (two occurrences: primary update loop and `upgradeLegacyTools`)

## 4. Tests

- [x] 4.1 In `test/core/command-generation/adapters.test.ts`, add unit tests for `ohMyPiAdapter`: verify `toolId`, `getFilePath` output uses `path.join('.omp', 'commands', 'opsx-<id>.md')`, and `formatFile` produces correct description frontmatter and transformed body
- [x] 4.2 Verify all path assertions in the new tests use `path.join()` (not hardcoded slashes) for cross-platform correctness

## 5. Documentation

- [x] 5.1 Add Oh My Pi row to the tool directory reference table in `docs/supported-tools.md`: `| Oh My Pi (\`oh-my-pi\`) | \`.omp/skills/openspec-*/SKILL.md\` | \`.omp/commands/opsx-<id>.md\` |`

## 6. Verification

- [x] 6.1 Run `pnpm test` and confirm all tests pass, including the new adapter tests
- [x] 6.2 Run `pnpm build` to confirm TypeScript compilation succeeds with the new adapter
