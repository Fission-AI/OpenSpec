# Contributing

Thanks for helping improve OpenSpec.

## 1. Open a discussion or an issue first

Every change starts here, including small ones.

- [Start a discussion](https://github.com/Fission-AI/OpenSpec/discussions) if it affects OpenSpec's core design.
- [Open an issue](https://github.com/Fission-AI/OpenSpec/issues) for bugs and everything else.

This is so we can agree on the approach before you spend time building. PRs without a linked issue or a prior discussion may be closed.

## 2. Make your change

You need Node 20.19+ and pnpm.

```bash
pnpm install
pnpm build   # tests run against the build output
pnpm test
pnpm lint
```

Run `pnpm changeset` if your change affects users, and commit the file it generates.

## 3. Open the PR

- Branch off `main` in your fork.
- Title it as a conventional commit: `type(scope): subject`, for example `fix(archive): keep authored Purpose`.
- Link the issue in the description: `Closes #123`.
- If a coding agent wrote the code, say which agent and model, and confirm you tested it. AI-generated code is welcome when it has been verified.

Maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md).
