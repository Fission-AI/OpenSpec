# Contributing

Thanks for helping improve OpenSpec.

## Before you open a PR

Start with a discussion or an issue:

- [Discussion](https://github.com/Fission-AI/OpenSpec/discussions) for changes to OpenSpec's core design.
- [Issue](https://github.com/Fission-AI/OpenSpec/issues) for bugs and everything else.

Every PR must link its issue (`Closes #123`).

PRs without a linked issue or a prior discussion may be closed.

## Making a change

Requires Node 20.19+ and pnpm.

```bash
pnpm install
pnpm build   # tests run against the build output
pnpm test
pnpm lint
```

Then:

1. Branch off `main` in your fork.
2. Run `pnpm changeset` if your change affects users, and commit the generated file.
3. Open a PR against `main` with `Closes #123` in the description.

Maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md).
