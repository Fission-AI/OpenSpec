# OpenSpec - Task Completion Checklist

When completing a task in OpenSpec:

1. **Lint**: `pnpm run lint` — no ESLint errors
2. **Build**: `pnpm run build` — must succeed without error
3. **Test**: `pnpm run test` — all Vitest tests pass
4. **Type check**: included in build step (tsc)
5. **Changeset**: if releasing, run `pnpm run changeset` to document the change
