## 1. Tests

- [x] 1.1 Cover `agents` init, update, detection, and the deprecated `experimental --tool` alias
- [x] 1.2 Assert a bare `.agents/` directory does not select the target

## 2. Registry

- [x] 2.1 Enable `agents` in `src/core/config.ts` with `skillsDir: '.agents'`
- [x] 2.2 Scope detection with `detectionPaths: ['.agents/skills']`
- [x] 2.3 Rename the entry to `Shared .agents skills` so it names the directory instead of a file OpenSpec never writes

## 3. Docs

- [x] 3.1 Add `agents` to the tool ID lists in `docs/cli.md` and `docs/supported-tools.md`
- [x] 3.2 Add the Tool Directory row and the skills-only invocation rows across `docs/supported-tools.md`, `docs/commands.md`, `docs/how-commands-work.md`, and `docs/troubleshooting.md`
- [x] 3.3 Document when to choose the shared target over a tool-specific integration

## 4. Verification

- [x] 4.1 Run `pnpm run build` and the full Vitest suite
- [x] 4.2 Validate with `openspec validate --strict`, and confirm `openspec archive` applies cleanly against a scratch copy of `openspec/`
