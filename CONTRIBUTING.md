# Contributing

Thanks for helping improve OpenSpec.

## 1. Open a discussion or an issue first

Every change starts here, including small ones.

- [Start a discussion](https://github.com/Fission-AI/OpenSpec/discussions) if it affects OpenSpec's core design.
- [Open an issue](https://github.com/Fission-AI/OpenSpec/issues) for bugs and everything else.

This is so we can agree on the approach before you spend time building. PRs without a linked issue or a prior discussion may be closed.

## 2. Decide whether it needs a change proposal

A bug fix, a typo, or a small improvement goes straight to a PR.

A new feature, a significant refactor, or anything that changes OpenSpec's architecture needs an OpenSpec change proposal first, so we can align on intent and goals before implementation begins. Open it as a PR containing only `openspec/changes/<name>/` and wait for it to be approved before you write the code.

When writing a proposal, keep the OpenSpec philosophy in mind: we serve a wide variety of users across different coding agents, models, and use cases. Changes should work well for everyone.

If you are not sure which side of the line your change falls on, ask in the discussion or issue from step 1.

## 3. Make your change

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

### Keep human views about current work

Some commands are written for a person reading a terminal, not for an agent or a script. `openspec view` is the clearest case: a one-screen dashboard of what is in flight. Agents and scripts get their own output through `--json`.

A human view has to fit on a screen after years of use, not just on the day it ships. [#399](https://github.com/Fission-AI/OpenSpec/pull/399) added every archived change to `openspec view`. In projects with hundreds of archived changes, the active work the dashboard exists to show scrolled off the screen ([#2030](https://github.com/Fission-AI/OpenSpec/issues/2030)).

So before adding anything to a human view, ask how big it gets as the project ages:

- **Bounded by current work** (open changes, specs): fine to show.
- **Grows with history** (archived changes, past runs, logs): keep it out of the default output. Offer it behind an opt-in flag on a listing command, like `openspec list --archived`.

Apply the same check when reviewing an issue or PR that asks a human view to "show everything". Read the command's spec Purpose to see who the command serves. When you add a human-facing command, say so in its spec Purpose, so the next reviewer can check against it.

## 4. Open the PR

- Branch off `main` in your fork.
- Title it as a conventional commit: `type(scope): subject`, for example `fix(archive): keep authored Purpose`.
- Link what you opened in step 1: `Closes #123` for an issue, or a link to the discussion when there is no issue.
- If a coding agent wrote the code, say which agent and model, and confirm you tested it. AI-generated code is welcome when it has been verified.

Maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md).
