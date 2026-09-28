# Tasks

## 1. Model version and install information

- [x] 1.1 Add typed, pure install classification that reports location, package manager, and scope without guessing ownership for source or unknown layouts.
- [x] 1.2 Add POSIX and Windows unit cases for global, project, temporary, source, and unknown installs.

## 2. Expose structured update-check outcomes

- [x] 2.1 Refactor the existing update check to return `available`, `current`, `disabled`, or `offline` with structured latest-version and update-guidance fields.
- [x] 2.2 Keep `getAvailableCliUpdate()` as a compatibility wrapper so `openspec update` behavior does not change.
- [x] 2.3 Cover privacy opt-outs, rejected registries, timeouts, invalid responses, current versions, and available updates without weakening existing network safeguards.

## 3. Add the version command

- [x] 3.1 Add `openspec version` with `--json` and `--check` options and no project-root prerequisite.
- [x] 3.2 Emit one schema-versioned JSON document with explicit nulls for unknown values and no incidental stdout.
- [x] 3.3 Add human-readable output for local information and each update-check status.
- [x] 3.4 Reject `--upgrade` and other unsupported options without running an installer.

## 4. Verify compatibility and behavior

- [x] 4.1 Add CLI end-to-end coverage for text output, JSON output, `--check`, and execution outside an OpenSpec project.
- [x] 4.2 Prove `openspec --version` still emits only the bare version string.
- [x] 4.3 Prove JSON runs emit no telemetry notice, completion tip, color sequence, or extra stdout text.

## 5. Document and release

- [x] 5.1 Document `openspec version`, `--json`, and `--check` in `docs-lab/reference/cli.md` using the current docs-lab format; do not update the legacy `docs/` tree.
- [x] 5.2 Add a minor changeset for `@fission-ai/openspec`.

## 6. Final verification

- [ ] 6.1 Run `pnpm build`, the focused version-check and CLI tests, `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm lint`.
- [ ] 6.2 Run `openspec validate add-version-command --strict` and confirm every planning artifact is complete.
