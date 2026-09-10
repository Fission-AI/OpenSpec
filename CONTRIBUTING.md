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

## 4. Open the PR

- Branch off `main` in your fork.
- Title it as a conventional commit: `type(scope): subject`, for example `fix(archive): keep authored Purpose`.
- Link what you opened in step 1: `Closes #123` for an issue, or a link to the discussion when there is no issue.
- If a coding agent wrote the code, say which agent and model, and confirm you tested it. AI-generated code is welcome when it has been verified.

Maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md).
