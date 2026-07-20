## 1. Change Artifacts

- [x] 1.1 Write proposal, design, and spec deltas for Kimi CLI skills-only support

## 2. Tool Metadata

- [x] 2.1 Add `Kimi CLI` to `src/core/config.ts` with `value: 'kimi'` and `skillsDir: '.kimi'`

## 3. Documentation

- [x] 3.1 Update `docs/supported-tools.md` with a Kimi CLI row that clearly states there is no command adapter
- [x] 3.2 Update `docs/commands.md` to document Kimi CLI usage via `/skill:openspec-*`
- [x] 3.3 Update `docs/cli.md` so the supported `--tools` list includes `kimi`

## 4. Tests

- [x] 4.1 Add a targeted init regression test for `--tools kimi` under adapterless command generation

## 5. Validation

- [x] 5.1 Validate the change artifacts with `openspec validate`
- [x] 5.2 Run targeted tests and fix any regressions
