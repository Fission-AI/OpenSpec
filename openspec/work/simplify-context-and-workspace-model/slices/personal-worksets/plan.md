# Personal Worksets Plan (7.1)

## Status

- Research checkpoint committed (`research.md`, 980b056).
- Spec written and dual-reviewed (subagent approve-with-fixes, codex
  reject → all findings folded; 6f4ca4a). The spec's 14 numbered
  decisions are the contract this plan implements.
- This plan: two implementation checkpoints, each ending with a full
  green `pnpm test` and a commit.

## Source Of Truth

- `slices/personal-worksets/spec.md` — decisions 1–14 + acceptance
  criteria.
- Roadmap 7.1 FR1/FR2 and locked decisions (owner-directed).
- `slices/personal-worksets/research.md` — mechanics evidence
  (`f858c19^` citations).

## Current Code Map (anchors verified 2026-06-12)

Storage idiom to copy / extract from:

- `src/core/global-config.ts:78-102` — `getGlobalDataDir` with
  injectable `{env, platform, homedir}`; `:35-56` `getGlobalConfigDir`;
  `:116-170` `getGlobalConfig`/`saveGlobalConfig` (spread-parsed, so an
  `openers` key survives round-trips); `:147-153` malformed-JSON →
  stderr warning + defaults.
- `src/core/config-schema.ts:7-25` — `GlobalConfigSchema` is
  `.passthrough()`; `:38-67` `KNOWN_TOP_LEVEL_KEYS` (config set rejects
  unknown keys; worksets add nothing here — hand-edit-only at v1).
- `src/core/store/foundation.ts:188-194` — strict zod state schema with
  `version: z.literal(1)`; `:259-292` parse; `:314-336` serialize
  (re-validates); `:211-237` `invalidStoreStateError` ("Repair or
  remove <path>."); `:391-406` **private** `writeFileAtomically`;
  `:414-460` **private** `acquireStoreRegistryLock` (wx-open, 30s
  stale-steal, 5s deadline, 25ms sleeps); `:462-480`
  `updateStoreRegistryState` (lock → read → updater → write → unlock).
  The extraction target: both privates move to `src/core/file-state.ts`
  with the busy-error factory parameterized; foundation delegates.
- `src/core/store/registry.ts:210-229, 288-306` — pure
  `withRegisteredStore`/`withoutRegisteredStore` rebuild pattern;
  `:544-555` no-op pre-read before locking.
- `src/core/id.ts:5-13` — `isKebabId`, `KEBAB_ID_DESCRIPTION`.

Command/output idiom:

- `src/commands/repo.ts:149-181` — the minimal group registration
  model (group description pulled from the completions registry).
- `src/commands/store.ts:222-227` — `isPromptCancellationError`
  (duplicated at `src/commands/config.ts:91`; a third copy justifies
  extraction — put the helper in `src/commands/shared-output.ts`);
  `:243-381` prompt idioms (dynamic `@inquirer` imports, validate
  wrappers, `prefill: 'editable'`, plan-then-confirm, `--yes`);
  `:675-679` `Cancelled.` + exit 130; `:761-825` the `command:*`
  unknown-subcommand handler emitting one JSON document.
- `src/commands/shared-output.ts:9-48` — `printJson`, `asStatus`,
  `emitFailure`.
- `src/commands/context.ts:140-178` — write-guard + stderr
  confirmation idiom; `:30` null-shape failure payload pattern.
- `src/utils/interactive.ts:17-28` — `resolveNoInteractive`,
  `isInteractive`.
- `src/cli/index.ts:22-25, 348-351` — import + registration block;
  `:49-54` hidden rejected `Option` pattern (for `open --json`);
  `:60-61` the one-JSON-document failure comment; `:118-129` telemetry
  preAction (generic; no per-command work).
- `src/core/completions/command-registry.ts:251-347` (store group with
  subcommands), `:349-364` (context), `:374-405` (repo) — the
  `workset` entry follows the store shape (group + four subcommands).
- `src/core/working-set.ts:93-107` — `buildCodeWorkspaceJson`
  conventions to mirror (NOT generalized; recorded in spec d14).
- `package.json:77` — `"cross-spawn": "7.0.6"`, currently zero
  importers.

Old mechanics to port (all at `f858c19^`):

- `src/core/workspace/openers.ts:48-108` — PATH scan (PATH/Path/path
  keys, win32 PATHEXT default `.COM;.EXE;.BAT;.CMD`, posix X_OK,
  separator-bearing commands stat directly, injectable
  `{env, platform}`); `:144-172` available-first stable sort +
  `(<exe> not found on PATH)` notes + first-available default. Spec
  d14 sharpens: platform-keyed delimiter/join (`path.win32`/
  `path.posix`), extension-bearing commands match as-is.
- `src/commands/workspace/open.ts:21-22` — cross-spawn via
  `createRequire`; `:175-218` launch promise (error event vs close);
  spec d6/d7 replace the close handling (honest code/signal
  propagation).
- `src/commands/workspace/prompt-theme.ts:3-26` — chalk prompt theme
  (recoverable; reuse as `workset` prompt theme only if trivial —
  optional polish, not a contract).
- `src/commands/workspace/setup-prompts.ts:29-160` — the member-loop
  prompt shape.
- `test/helpers/path-env.ts` — `pathEnvKey`, `withPrependedPathEnv`
  (resurrect verbatim).
- `test/commands/workspace-initiative-open.test.ts:~93-121` —
  `createFakeExecutable` recorder pattern (posix shim + `.cmd` twin +
  `OPENSPEC_FAKE_OPEN_LOG`); resurrect as a shared helper
  `test/helpers/fake-tool.ts`.

Test harness:

- `test/helpers/run-cli.ts:56-91` — built-CLI runner, merges
  `OPEN_SPEC_INTERACTIVE: '0'`.
- `test/commands/context.test.ts:20-27` — the XDG isolation block
  (mkdtemp + realpath, `XDG_DATA_HOME`/`XDG_CONFIG_HOME`,
  `OPENSPEC_TELEMETRY: '0'`, `getGlobalDataDir({env})`).
- `test/core/store/foundation.test.ts` / `registry.test.ts` — unit
  homes; they pin the store behavior the file-state extraction must
  not change.

## Implementation Plan

### Checkpoint 1 — core: file-state extraction, worksets storage, openers (commit)

1. `src/core/file-state.ts` (new): move `writeFileAtomically` and the
   lock-acquire loop out of store foundation verbatim, parameterizing
   the two REAL error sites (plan-review correction — stale-steal is
   silent rm-and-continue, `foundation.ts:441-448`; the sites are
   lock-create failure at `:428-435` and deadline timeout at
   `:451-454`): `errorFor: (kind: 'create-failed' | 'timeout',
   info: { lockPath, cause? }) => Error`. Store foundation delegates;
   its emitted errors stay byte-identical. **The existing suite does
   NOT pin this** (plan-review correction: nothing in `test/` covers
   the lock, stale steal, busy errors, or atomic-write failure) — so
   CP1 adds the pins itself: the two store busy-error byte shapes
   asserted *through the foundation path* (message
   `Cannot create the registry lock file <path> (<code>).` + its fix;
   `Store registry is busy.` + the stale-lock fix), alongside the
   direct file-state units.
2. `src/core/worksets.ts` (new): spec d2/d3/d4/d12.
   - Paths: `getWorksetsDir`, `getWorksetsFilePath`,
     `getWorksetCodeWorkspacePath(name)` — all threading
     `{ globalDataDir? }` like `StorePathOptions`.
   - Schema (zod, strict): `{ version: 1, worksets: Record<name,
     { tool?: string, members: [{ name, path }, ...nonempty] }> }`;
     parse enforces kebab names via `isKebabId`, absolute member
     paths, non-empty/separator-free/non-dot labels, intra-workset
     label uniqueness; `tool` is a plain string.
   - `parseWorksetsState` / `serializeWorksetsState` (re-validates);
     `invalid_workset_file` / `workset_file_busy` via the shared
     file-state helpers; absent file ⇒ empty state (the registry
     precedent).
   - Pure `withWorkset` (throws `workset_exists`) / `withoutWorkset`
     (throws `workset_not_found` with saved names / create-command
     fix); `updateWorksetsState(updater)`; **`withWorksetsLock(fn)`**
     (lock → read → `fn(state)` → release, no yaml write-back —
     plan-review fix: `open` needs a lock-scoped read plus
     derived-file write without rewriting `worksets.yaml`, which the
     store-pattern updater cannot express); read-only `listWorksets`,
     `getWorkset`.
   - Pure `buildWorksetCodeWorkspaceJson(members)` mirroring the
     working-set builder's conventions (folders in member order,
     saved names, absolute paths, 2-space JSON + newline).
   - Errors: `WorksetError extends Error` with `.diagnostic` — reuse
     `StoreError` directly instead if nothing workset-specific is
     needed (`asStatus` duck-types `.diagnostic`, so either works;
     prefer reusing `StoreError` to avoid a parallel class — decide
     in code, record in the spec if it matters).
3. `src/core/openers.ts` (new): spec d5/d6.
   - `BUILTIN_OPENERS` table (`code`, `cursor`, `claude`, `codex` rows
     per the locked table); `OpenerDefinition { id, label, style,
     command, args, attachFlag }`.
   - `mergeOpenerConfig(builtins, raw)` — per-field override for known
     ids, full rows for new ids (`style` required, `command` defaults
     to id), typed `invalid_opener_config` on unknown style/malformed
     row (strict per-row zod).
   - `readOpenerConfig()` — reads the global config file's `openers`
     key (via `getGlobalConfig`; malformed file already degrades with
     the existing stderr warning).
   - `isExecutableAvailable(command, {env, platform})` +
     `listOpenerChoices(table, opts)` — the `f858c19^` scan with the
     d14 sharpenings.
   - `buildLaunchCommand(opener, { members, codeWorkspacePath })` —
     pure (plan-review fix: the workspace-file style needs the
     generated file's path as an input); workspace-file ⇒
     `{ executable, args: [codeWorkspacePath], cwd: primary }`;
     attach-dirs ⇒ `{ executable, args: [...pre, ...members.flatMap(
     m => [attachFlag, m.path])], cwd: primary }`; returns
     `{ executable, args, cwd, label, style }`; never a positional.
4. Unit tests: `test/core/file-state.test.ts` (atomic write, lock
   contention, stale steal, the two error kinds),
   `test/core/worksets.test.ts` (parse/serialize round-trip,
   hand-edit contract matrix, with/without, `withWorksetsLock`, lock
   no-op reads, builder output), `test/core/openers.test.ts` (merge
   matrix, availability incl. the win32 PATHEXT/`Path`/`tool.cmd`
   matrix — fixture strategy recorded per plan review: the scan takes
   an injectable `isExecutableFile` stat seam, since
   `path.win32.join` output on a posix host produces
   backslash-bearing filenames a naive fixture never matches; argv
   builder incl. single-member, attach-pair-per-member, codex
   pre-args, no-positional pin). Plus the store busy-error byte-shape
   pins from item 1.
5. Full `pnpm test` green; commit.

### Checkpoint 2 — command, registration, docs, e2e (commit)

1. `src/commands/workset.ts` (+ `workset-prompts.ts` if the ~600-line
   bar nears): the four subcommands per spec d1/d8/d9/d10/d11/d13.
   - `create [name]`: interactive 3-step wizard / non-interactive
     `--member` (+`name=path`) and `--tool` (validated against the
     merged table); validation order: name → members → tool; write
     under lock; offer-to-open (skipped when no tool saved;
     suppressed non-interactive); JSON envelope `{ workset, status }`.
     `--member` is repeatable via an explicit Commander collector
     (`(value, prev) => [...prev, value]` with default `[]` — no repo
     precedent exists and Commander keeps only the last value
     otherwise; a parser test pins flag order).
   - `list`: human at-a-glance + `{ worksets, status }` sorted by
     name.
   - `open <name> [--tool <id>]`: **order fixed per the converged
     plan-review P1** — resolve workset, then under the lock via
     `withWorksetsLock`: re-read + regenerate `.code-workspace`
     unconditionally (existing-and-directory members only; skip
     notes; `workset_no_members_available` if none survive) →
     release lock → resolve tool (`--tool` override → saved →
     interactive select / typed `workset_tool_required`) →
     availability check → pre-launch kind line → spawn (cross-spawn
     via `createRequire(import.meta.url)` + `typeof nodeSpawn` cast,
     the `f858c19^:open.ts:21-22` shape — no `@types/cross-spawn`
     exists; `shell:false`, `stdio:'inherit'`, cwd = surviving
     primary) → propagate exit code / `128+signal`. The
     `workset_tool_unknown` / `workset_tool_unavailable` /
     `workset_launch_failed` failures all fire AFTER regeneration, so
     their "Open manually:" block always names an existing, current
     file (the fallback test asserts the file's existence and
     currency). `--json` registered as a hidden option
     (`.hideHelp()`, the `cli/index.ts:49-54` precedent — parsed so
     Commander never owns the error, kept out of help so a broken
     mode is not advertised) and rejected in the action with the
     one-document `workset_open_json_unsupported` payload.
   - `remove <name>`: plan-then-confirm / `--yes`; under the lock
     delete entry + ENOENT-tolerant derived-file cleanup;
     `{ removed, status }`.
   - Group: description from the completions registry; `command:*`
     handler (`unknown_workset_subcommand`); failure plumbing through
     `emitFailure` with per-command null shapes; cancellation helper
     extracted to shared-output (third copy).
2. Registration: `src/cli/index.ts` import + `registerWorksetCommand`;
   `command-registry.ts` `workset` entry (group + 4 subcommands,
   flags: `--member`, `--tool`, `--json`, `--yes`,
   `--no-interactive`).
3. Docs: `docs/cli.md` — a "Personal worksets" section (concept
   paragraph + command table rows + the opener-config example).
4. Tests:
   - Resurrect `test/helpers/path-env.ts`; add
     `test/helpers/fake-tool.ts` (recorder + posix/cmd shims).
   - `test/commands/workset.test.ts`: non-interactive create
     (+failure matrix: exists/members-required/member-invalid/name/
     unknown `--tool`), list (incl. the empty shape), remove
     (+confirmation-required, not-found, never-opened), open per
     fake tool (argv/cwd exact, exit code 7, missing-member skip,
     primary fallback, no-members failure, open of an unknown name,
     unknown/unavailable tool fallback block asserting the named
     `.code-workspace` exists with current content AND the fix names
     another installed tool, `--tool` override byte-unchanged yaml,
     opener-config zed + attach_flag override + invalid style,
     `open --json` rejection, unknown subcommand, command-level
     corrupt `worksets.yaml` → `invalid_workset_file`).
   - Launch mechanics that fake executables cannot exercise run as
     in-process units through the d14 injectable-spawn seam
     (plan-review fix): a fake ChildProcess emitting
     `close(null, 'SIGINT')` pins the 130 path; an `error` event pins
     `workset_launch_failed` (shell shims translate signals and a
     PATH-absent tool can never reach the spawn-error branch).
   - Interactive coverage (plan-review fix; `runCLI` forces
     `OPEN_SPEC_INTERACTIVE=0`, so no CLI-spawned test can prompt):
     in-process units with a stubbed TTY/env gate and
     `vi.mock('@inquirer/prompts')` throwing `ExitPromptError` at
     each compose boundary (name / member / tool / open-now confirm)
     assert `Cancelled.`, exit 130, nothing saved. Typed cancellation
     exists only on remove (`workset_remove_cancelled`, the declined
     confirm — the spec's d12 was amended this round: create has no
     abort-confirm, so `workset_create_cancelled` was dropped as a
     dead code). If the gate stubbing proves brittle in
     implementation, the fallback is recorded: cover the helper +
     declined-confirm paths in-process and assign the Ctrl-C walk to
     the capstone transcript explicitly.
   - `test/cli-e2e/workset-journey.test.ts`: compose→list→open(both
     styles)→remove with isolated XDG + fake tools; the two-data-dirs
     teammate scenario; member-folder byte-untouched sweep
     (fs-snapshot); `openspec context`/`doctor` byte-identical
     before/after.
5. Full `pnpm test` green; commit.

## Test Plan Summary

Unit: file-state (3 areas), worksets storage (~10 cases), openers
(~12 cases). Command: ~20 cases over fake tools. E2e: 1 journey + the
teammate isolation + independence asserts. All hermetic (no real
editors/agents; PATH points at fakes; XDG isolated). Windows-specific
launch semantics are covered at the unit layer (injected
platform/env); the fake-tool `.cmd` twins keep command tests
OS-portable per the 1.3 precedent.

## Risks And Guardrails

- **Store-foundation extraction regression** — mitigated: mechanical
  move, behavior-identical contract, foundation tests untouched and
  green before/after; the new file-state tests cover the shared
  mechanics directly.
- **Spawn behavior in tests** — recorder fakes exit 0 quickly; the
  exit-7/SIGINT cases use dedicated fake scripts; no test inherits
  the parent's stdio interactively (`stdio: 'inherit'` is fine under
  vitest — the child writes nothing).
- **Interactive flows**: cancellation and declined confirms are
  covered in-process (CP2 test item above); the remaining
  interactive-only acceptance lines are enumerated to the capstone
  transcript — the full wizard walk, the open-time tool select, the
  offer-to-open decline next-step line, and the `create <name>`
  step-echo.
- **`open --json` flag shape**: hidden `Option` (`.hideHelp()`) per
  the `cli/index.ts:49-54` precedent — parsed so Commander never owns
  the error, rejected in the action with the typed one-document
  payload (plan review settled hidden over visible: help should not
  advertise a mode that only rejects).
- **Lock-release → spawn TOCTOU, recorded**: a concurrent `remove`
  can delete the regenerated `.code-workspace` between open's lock
  release and the editor reading it. Spec d2 mandates
  release-before-spawn; single-user machine-local state makes this
  acceptable — recorded here so it is a decision, not a discovery.
- **Config plumbing**: `getGlobalConfig` reads `process.env` (not
  injectable) — `readOpenerConfig` unit tests therefore test the pure
  merge directly and route file-reading coverage through the CLI
  layer's XDG env; the `GlobalConfig` interface gains an `openers?`
  member (the schema is already `.passthrough()`). Diagnostic fields
  follow spec d12's `workset.<facet>` convention.
- **Vocabulary**: all new strings say "workset"; the only
  `workspace`-bearing token is the `.code-workspace` filename/flag
  (the 4.1 precedent says hyphenated file references are sweep-safe);
  diagnostic codes are all `workset_*`/`invalid_opener_config` —
  no `workspace_*` tokens.
- **Module sizes**: worksets.ts and openers.ts each well under the
  bar; workset.ts has the recorded split seam.

## Done Definition

- Both checkpoints committed; full suite green at each.
- Every spec acceptance scenario has an implementing test (or is the
  capstone's recorded responsibility: the interactive wizard walk).
- No changes to `openspec context`, doctor, project config parsing, or
  committed formats (e2e independence asserts prove it).
- Roadmap "Plan written" box ticked with changelog entries; spec kept
  consistent with anything the plan round amended.
