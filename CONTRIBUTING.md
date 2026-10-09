# Contributing

Thanks for helping improve OpenSpec.

Every change follows the same three steps, and CI checks each one.

## 1. Open an issue

[Pick a form](https://github.com/Fission-AI/OpenSpec/issues/new/choose): bug, feature, or docs.

- **Bug:** give steps that reproduce it from a fresh project. We can't fix what we can't reproduce.
- **Feature:** describe the problem. You don't need a solution; we design the fix with you.

## 2. Wait for the `approved` label

A maintainer adds it once we agree the work should happen. Don't open a PR before then. CI will fail it.

Why: a PR built without the bigger picture can fix one case and break another. Agreeing first saves your time and ours.

## 3. Open the PR

You or a maintainer can open it.

**Bug or docs:** one PR with the fix. Write `Closes #123` in the description. It can't change `openspec/`, since specs are for features.

**Feature:** two PRs.

1. **Proposal:** only `openspec/changes/<name>/`. Write `Part of #123`, so the issue stays open.
2. **Implementation:** after the proposal merges, the code plus updates to that change, such as checking off its `tasks.md`. Write `Closes #123`.

If CI fails, its comment on your PR says what's missing.

## Make your change

You need Node 20.19+ and pnpm.

```bash
pnpm install
pnpm build              # tests run against the build output
pnpm test
pnpm exec tsc --noEmit
pnpm lint
```

Those four commands are what CI runs, so a green local run means a green CI run.

Run `pnpm changeset` if your change affects users, and commit the file it generates.

### Keep the CLI's startup fast

Editors, agents and OpenSpec Desktop run the CLI many times, and each call pays for every module it loads before the command runs. Before this rule, `openspec --version` loaded 485 modules: about 0.5 s per call on a Windows machine. So a command loads only the command definitions and its own code:

- **Definitions** (name, options, help text) go in `src/cli/index.ts` or `src/cli/commands/<name>.ts`. Import nothing heavy there: no zod, yaml, fast-glob, ora, and no other command's code.
- **The command's code** goes in `src/commands/<name>.ts` or `src/core/`, loaded inside the action with `await import()`.

`test/cli-e2e/startup-modules.test.ts` checks which modules each command loads, and fails if a definition starts pulling in an implementation. When you add a command, add it to that test's list.

## PR checklist

- Branch off `main` in your fork.
- Title it as a conventional commit: `type(scope): subject`, for example `fix(archive): keep authored Purpose`.
- If a coding agent wrote the code, say which agent and model, and confirm you tested it. AI-generated code is welcome when it has been verified.

Maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md).
