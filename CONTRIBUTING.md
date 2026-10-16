# Contributing

Thanks for helping improve OpenSpec.

**We are not accepting unsolicited pull requests.** Contributions start with a GitHub issue, and pull requests come from maintainers or from contributors we have invited to build a change with us. See [An Update to OpenSpec's Contribution Policy](https://openspec.dev/blog/openspec-contribution-policy/) for why.

## 1. Open an issue

[Pick a form](https://github.com/Fission-AI/OpenSpec/issues/new/choose): bug, feature, or docs.

- **Bug:** what you were trying to do, what happened, what you expected, and the shortest steps that reproduce it from a fresh project. Error messages, logs, and a minimal example help most. We can't fix what we can't reproduce.
- **Agent behavior:** say which agent and model you used, and attach a session trace if you have one. Which files the agent read, which tools it called, and whether the behavior repeats across sessions is usually what narrows it down.
- **Feature:** describe the problem, who else it affects, what you tried instead, and whether the added complexity is worth maintaining. You don't need a solution; sometimes the behavior you hit is a deliberate trade-off, and that is what we want to talk about.

Write the issue yourself rather than forwarding an agent's diagnosis. We don't expect you to have all the answers, but we do want the issue to show that you have considered the problem.

## 2. We discuss it on the issue

We work out the problem, the possible approaches, and whether it fits OpenSpec's priorities. OpenSpec runs across many agents, models, and workflows, so a change that helps one workflow can break another.

If we agree to pursue it, a maintainer adds the `approved` label and then either implements it or invites you to build it with us. Say on the issue if you would like to write the fix. We can't promise to take on every suggestion.

Opening pull requests is restricted to maintainers, so please don't start one until we have invited you to.

## 3. Open the PR (invited contributors and maintainers)

**Bug or docs:** one PR with the fix. Write `Closes #123` in the description. It shouldn't change `openspec/`, since specs are for features.

**Feature:** two PRs.

1. **Proposal:** only `openspec/changes/<name>/`. Write `Part of #123`, so the issue stays open.
2. **Implementation:** after the proposal merges, the code plus updates to that change, such as checking off its `tasks.md`. Write `Closes #123`.

## Development setup

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
