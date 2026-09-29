## 1. Schema: add `priority` and `author` fields

- [x] 1.1 Add cases to `test/utils/change-metadata.test.ts` (the existing home for `ChangeMetadataSchema` tests): `priority` accepts `low`/`medium`/`high`, rejects any other string, and `author` accepts a non-empty string but rejects an empty one; both remain optional.
- [x] 1.2 In `src/core/change-metadata/schema.ts`, add `priority: z.enum(['low', 'medium', 'high']).optional()` and `author: z.string().min(1).optional()` to `ChangeMetadataSchema`.
- [x] 1.3 Run `pnpm exec vitest run test/utils/change-metadata.test.ts` and confirm the new cases pass.

## 2. `createChange`: auto-populate `author` from git config

- [x] 2.1 Add test cases in `test/utils/change-utils.test.ts` covering: `git config user.name` resolves and is written to `.openspec.yaml` when `author` isn't passed; an explicit `author` in `CreateChangeOptions.metadata` wins over git config; missing/empty git config (or git unavailable) leaves `author` unset with no thrown error. Isolated via `vi.stubEnv('GIT_CONFIG_GLOBAL'/'GIT_CONFIG_SYSTEM', ...)` pointing at temp config files, same pattern as `test/helpers/store-git.ts`.
- [x] 2.2 In `src/utils/change-utils.ts`, extend `CreateChangeOptions['metadata']` to include `author`, and in `createChange` resolve `author` by running `git config user.name` (via `child_process`, `execFileSync('git', ['config', 'user.name'], { cwd: projectRoot })`) when `options.metadata?.author` is not set; swallow any failure (non-git repo, no git binary, no config) and omit the field.
- [x] 2.3 In `src/commands/workflow/new-change.ts` and `src/cli/index.ts`, thread an optional `--author <name>` CLI flag through `NewChangeOptions` into `createChange`'s `metadata`, so an explicit flag still takes precedence over the git-config default from 2.2.
- [x] 2.4 Run `pnpm exec vitest run test/utils/change-utils.test.ts` and confirm all new cases pass.

## 3. `openspec list`: render priority/author

- [x] 3.1 Add test cases in `test/core/list.test.ts` covering: table output shows priority/author values when at least one change sets them; a change with neither field renders its row unchanged from current output; `--json` includes `priority`/`author` keys only when set (omitted otherwise, not `null`).
- [x] 3.2 In `src/core/list.ts`, extend `ChangeInfo` with optional `priority?: 'low' | 'medium' | 'high'` and `author?: string`, populate them via `readChangeMetadata(changePath, targetPath)` (wrapped in try/catch so one change's malformed `.openspec.yaml` can't break the whole listing) alongside the existing per-change loop, and:
  - extend the JSON `changes` mapping to spread `priority`/`author` only when defined,
  - extend the human-readable table to prepend a `Priority` column and append an `Author` column (padded, matching the existing name/status/modified layout), only including them at all when at least one change sets the field, so existing output is byte-for-byte unchanged when nothing sets them,
  - add a header row (`Priority Name Status Modified Author`, with optional columns following the same presence rule) above the change rows, and `.trimEnd()` every line so unset trailing columns don't leave trailing whitespace.
- [x] 3.3 Run `pnpm exec vitest run test/core/list.test.ts` and confirm all new cases pass.

## 4. Regression and verification

- [x] 4.1 Run `pnpm run build`, `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm lint`. Build/tsc/lint clean. Test suite: fixed the one regression this change caused (`new change` flag list in `src/core/completions/command-registry.ts` + its test needed `author` added). Remaining 34 failures (store setup/e2e tests, `version-check.test.ts`) are pre-existing and environment-specific on this machine (`/tmp` is nested inside a git repo here, breaking git-based store setup tests; npm global root assumptions don't match) — reproduced identically on the base branch via `git stash`, unrelated to this change.
- [x] 4.2 Manually smoke-tested against the built CLI (`dist/cli/index.js`) in scratch repos: `new change` picks up `author` from local git config, omits it entirely with no git config anywhere (global/system/local), and `--author "Override Name"` wins over git config. Hand-edited `priority: high` into one change's `.openspec.yaml`, then confirmed both `list` (table, columns only appear when at least one change sets them) and `list --json` (keys present only when set) render correctly.
- [x] 4.3 Ran `openspec validate add-priority-author-metadata --strict` (valid) and `git diff --check` (clean, no whitespace errors).
- [x] 4.4 Added `.changeset/add-priority-author-metadata.md` (minor bump) by hand following `.changeset/README.md`'s template, since `pnpm changeset`'s prompts aren't scriptable here.
