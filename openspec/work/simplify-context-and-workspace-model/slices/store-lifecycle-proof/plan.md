# Standalone Store Lifecycle Proof Plan

## Status

Spec locked 2026-06-11 (including same-day review findings: tracked
placeholders, Git identity preflight, interactive location prompt, and the
enumerated second-checkout journey). Plan drafted 2026-06-11. Implementation
not started.

This plan implements `spec.md` for slice 1.3. The main product move:

```text
Setup leaves a real, clonable Git repo, and the proof is a two-checkout
journey against the built CLI.
```

## Source Of Truth

Start from `spec.md`.

Also keep nearby:

- `../../goal.md`
- `../../roadmap.md`
- `../store-root-parity/spec.md` (root shape, doctor, setup/register safety)
- `../store-root-selection/spec.md` (selector semantics, root reporting)

Sequencing: this slice changes setup behavior from slice 1.1 and hint/banner
behavior from slice 1.2, so it must stack on that work. The whole roadmap
is being built on the single `codex/store-root-parity` branch (PR #1190),
whose tip already contains both prerequisite implementations — implement
this slice directly on that branch. Merge to `main` is deferred until the
work lands as a whole; the old `codex/store-root-selection` branch is a
stale ancestor of the tip.

## User-Facing Frame

What the human wants:

- "Set up our planning repo at a path I chose, and have it actually be a
  repo — clonable, shareable, no hidden half-made state."
- "When my teammate clones it, register should just work."
- "When something is off, tell me what and how to fix it; don't loop me
  between errors."
- "Never strand me: every hint you print should work if I paste it."

What the agent needs to know:

- Whether the store repo has commits, uncommitted changes, and a remote
  (doctor facts, read-only).
- That following any printed hint preserves the selected store.
- That setup fails before creating anything when Git identity is missing,
  with the exact fix.

How the user knows it worked:

- A clone of a freshly set-up store registers without ceremony.
- The journey test passes against the built binary with isolated global
  state, ending in nothing but normal OpenSpec files.

## Goals

- Flip `context-store setup` Git defaults: init on by default, initial
  commit of exactly the files setup created, tracked placeholders in
  otherwise-empty store directories.
- Require an explicit location: `--path` in non-interactive/JSON mode; an
  interactive prompt whose editable suggestion is a user-visible path.
- Preflight Git commit identity before creating anything.
- Add read-only Git facts to doctor (commits, dirty, remote) with a
  commitless-repo warning.
- Make register errors terminal and explanatory (one-checkout-per-id rule,
  `unregister` escape, named missing root pieces, empty-clone hint).
- Hint and banner continuity: hints carry `--store <id>`, banner prints on
  post-resolution failures, `new change` names a next command, `status`
  drops the `Planning home` line.
- One chained two-checkout journey test in `test/cli-e2e/`.

## Non-Goals

- No clone, pull, push, sync, branch, worktree, or orchestration behavior.
  `git init` plus one initial commit at setup is the entire Git write
  surface; doctor reporting is read-only.
- No doctor repairs or `--fix`.
- No multi-checkout registration support for one store id per machine.
- No `view` changes (Phase 4), no agent guidance or help one-liners
  (slice 1.4), no terminology renames (L7), no archive browsing (L11).
- No retrofit of placeholders into stores created before this slice, and no
  change to `openspec init` baseline roots (their clone fragility is an L9
  baseline quirk, out of scope here).
- No public docs rewrites.

## Current Code Map

Setup, register, doctor internals:

- `src/core/context-store/operations.ts` (916 lines) owns setup/register/
  doctor operations. `initGitRepository` (line ~277) runs `git init`;
  `input.initGit ?? false` (line ~472) is the default to flip. Today
  `.openspec-store/store.yaml` is written inside
  `commitContextStoreRegistration` (`writeMetadataIfMissing: true`,
  line ~483) — *after* Git init — so the metadata write must be decoupled
  and moved before the new commit step, or the initial commit will not
  contain `store.yaml` and clones will hit the register conversion prompt.
  Register errors live here: `requires an existing healthy OpenSpec root`
  (line ~555), metadata id mismatch (line ~569), and `already registered at
  this path` (line ~190). Git inspection currently reports only
  `isRepository`.
- `src/core/context-store/registry.ts` raises `already registered at
  <path>` (line ~99) with the circular "choose a different context store
  id" fix text, and `path is already registered as '<id>'` (line ~110).
- `src/core/context-store/foundation.ts` provides
  `getDefaultContextStoreRoot` (XDG data dir + `context-stores/`), used as
  the silent default path and the interactive prompt suggestion.
- `src/commands/context-store.ts` (738 lines) is the command surface:
  `resolveSetupInput` (line ~287) only errors non-interactively when the
  *id* is missing — the path silently defaults; `promptContextStorePath`
  (line ~276) already prompts interactively but suggests the XDG data path;
  doctor human/JSON mapping (`is_repository`, line ~67/146/474); next-steps
  output (line ~424).

Hint, banner, and status surfaces:

- `src/core/root-selection.ts` has `emitStoreRootBanner` (line ~300) and
  the shared resolver from slice 1.2. Banner emission currently happens on
  command success paths; the spec requires it after successful resolution
  even when the command then fails.
- `src/commands/workflow/status.ts` prints `Planning home: <label>`
  (line ~131) and the storeless hint `No active changes. Create one with:
  openspec new change <name>` (line ~75).
- `src/commands/workflow/shared.ts` throws storeless hints at lines ~148
  and ~169 (`No changes found. Create one with: openspec new change
  <name>`).
- `src/commands/workflow/new-change.ts` prints the created-change output;
  it already knows the schema, so it can name the first artifact's
  instructions command as the next step.

Test harness:

- `test/helpers/run-cli.ts` spawns the built `dist/cli/index.js` with cwd
  and env injection.
- `test/cli-e2e/basic.test.ts` shows the e2e pattern (mkdtemp fixtures,
  `runCLI`, afterAll cleanup).
- `test/commands/context-store.test.ts` covers setup/register/doctor and
  asserts current defaults (silent XDG path, git off) — these assertions
  change.
- `test/commands/store-root-selection.test.ts` (32 tests) covers selector
  semantics; hint/banner changes touch a few of its expectations.

## Setup Implementation Plan

Order of operations inside setup (replaces the current create-then-init
sequence):

1. Resolve input. Non-interactive or JSON without `--path` fails with new
   diagnostic `context_store_setup_path_required`, naming example `--path`
   usage. Interactive without `--path` prompts (existing prompt), with the
   editable suggestion changed from `getDefaultContextStoreRoot(id)` to a
   user-visible path such as `~/openspec/<id>`. Setup never silently picks
   the XDG data directory.
2. Existing safety checks (unsafe folder, nested Git) unchanged.
3. Git preflight, only when Git will be used (`initGit` defaulted to true
   and not opted out, or the target is already a Git repo and a commit will
   be attempted): verify `git` is available (existing error) and that a
   commit identity resolves via `git var GIT_COMMITTER_IDENT` and
   `git var GIT_AUTHOR_IDENT` — these honor config, `GIT_*_NAME`/`EMAIL`
   environment variables, and fail exactly when `git commit` would fail.
   Do not use `git config user.*`, which is blind to env-var identity.
   Probe cwd: the target directory when it exists, otherwise its existing
   parent (safe because nested-Git targets are already rejected, so
   repo-local config can only matter when the target itself is a repo). On
   failure: new diagnostic `context_store_git_identity_missing` naming the
   exact `git config --global user.name/user.email` commands. Nothing is
   created before this point.
4. Create all in-store files: the root shape, a tracked placeholder file
   (`.gitkeep`) inside `openspec/specs/` and `openspec/changes/archive/`
   when they end up empty (whether setup created the directories or first
   accepted an existing healthy root with empty ones), and
   `.openspec-store/store.yaml` when missing. This requires restructuring:
   today the metadata file is written inside
   `commitContextStoreRegistration` (`writeMetadataIfMissing: true`,
   operations.ts line ~483), i.e. *after* Git init — write it explicitly
   in this step instead, so the commit in step 5 can include it. A clone
   without committed `store.yaml` would hit the register conversion
   prompt instead of registering without ceremony. All created files,
   including placeholders and metadata, join `created_files`.
5. `git init` when needed, then an index-preserving pathspec commit
   (`git add -- <pathspecs>` followed by `git commit -m "Initialize
   OpenSpec context store <id>" -- <pathspecs>`). The commit set depends
   on who owns the repository: when setup initialized it, the pathspecs
   are the full store shape (`openspec/` plus `.openspec-store/`) so a
   clone of a converted root is healthy; when the repository pre-existed,
   the pathspecs are exactly the files setup created, and the pathspec on
   commit is what keeps the user's pre-staged files out of setup's commit
   and still staged afterward. Old beta files outside the store shape are
   never swept in.
6. Machine-local registry write only, last (with the metadata write now
   decoupled from it). The existing failure-cleanup contract from slice
   1.1 (remove only what this operation created) covers the new files; a
   `.git/` directory created by this operation is removed on failure too.

`--no-init-git` skips steps 3 and 5 entirely (no identity requirement, no
commit). JSON output gains nothing new beyond `created_files` accuracy and
the existing `git` block reporting `initialized` plus a new `committed`
boolean.

Placeholder boundaries: placeholders are created by setup when it creates
the directories or first accepts an existing unregistered root — never by
reruns on an already-registered store (those stay strict no-ops, so
pre-slice stores are not retrofitted) and never by register, which stays
thin and commit-free. Clone-fragile converted or pre-slice stores are
doctor's job to flag (below), not setup's job to repair.

Next-steps output (setup and register success): keep the `--store` usage
example and add one line: sharing the store is committing and pushing it
like any Git repo.

## Doctor Implementation Plan

- Extend Git inspection in `operations.ts` with read-only probes:
  `git rev-parse --verify HEAD` (has commits), `git status --porcelain`
  (uncommitted changes), `git remote` (remote configured). All three are
  nullable when the root is not a repo or Git is unavailable.
- JSON: extend each store's `git` section with `has_commits`,
  `has_uncommitted_changes`, `has_remote`.
- Human: surface the same facts on the existing Git line(s).
- Warning status (not error) when `has_commits === false`: clones of this
  repo will be empty until an initial commit exists.
- Warning when `openspec/specs/` or `openspec/changes/archive/` exists but
  contains no tracked files (`git ls-files` per directory): clones will
  lose those directories until they contain a tracked file. This is the
  visibility net for converted and pre-slice stores that setup
  deliberately does not retrofit.
- Doctor continues to mutate nothing.

## Register Error Plan

- `registry.ts` already-registered error: replace "choose a different
  context store id" with the one-checkout rule and the escape hatch —
  names the registered path and `openspec context-store unregister <id>`
  as the way to switch checkouts.
- `operations.ts` id-mismatch error: before suggesting `--id <metadata-id>`,
  check whether that metadata id is already registered to another path; if
  so, emit the one-checkout guidance instead. Following any register
  error's fix text must not land on another register error for the same
  situation.
- Unhealthy-root refusal: reuse the root inspection that doctor already
  computes to name the missing pieces (config, specs, changes, archive).
  When the target is a Git repo with no commits, append the empty-clone
  explanation (origin needs an initial commit).
- Register still never commits and never initializes planning files.

## Hint, Banner, And Status Plan

- Add a small helper (likely in `root-selection.ts`) that formats a
  follow-up `openspec ...` suggestion and appends `--store <id>` when the
  resolved root came from a store. Thread the resolved root into the hint
  sites: `status.ts` (line ~75), `shared.ts` (lines ~148, ~169), and any
  other supported-command hint found by grepping for `openspec new change`
  / `openspec ` literals in supported command paths.
- Move `emitStoreRootBanner` calls to immediately after successful
  resolution in each supported command entry point, so post-resolution
  failures still print it.
- `new change`: after the created-change lines, print a next-step line
  naming the first artifact's instructions command
  (`openspec instructions <artifact> --change <id> --store <id>` when
  selected); fall back to `openspec status --change <id>` if the first
  artifact is not cheaply known.
- `status`: delete the `Planning home:` human line; audit status JSON for
  workspace vocabulary while keeping the slice 1.2 `root` block as the
  machine-readable source of truth.

## Journey Test Plan

New file `test/cli-e2e/store-lifecycle.test.ts`, using `runCLI` with two
simulated machines (separate `XDG_CONFIG_HOME`/`XDG_DATA_HOME`/etc. env
sets) and real `git` via `execFile`:

Machine A (project repo without its own root):

1. `context-store setup team-context --path <tmp>/store --json` (no Git
   flags) — `created_files` exists only in JSON output, so this step runs
   `--json` and asserts it there (placeholders and `store.yaml` listed);
   repo existence, exactly-one-commit, and committed content (including
   `store.yaml` and placeholders, via `git show --name-only`) are asserted
   on the filesystem. Human-mode next-steps and sharing-line text is
   covered in `test/commands/context-store.test.ts`, not here.
2. `context-store list`, `context-store doctor --json` — healthy, git
   facts present, no-remote reported as fact not error.
3. From the project repo: `new change`, `status`, `instructions` (write
   artifacts via the test as the simulated agent), `validate`, `list`,
   `show`, `archive` — all with `--store team-context`.
4. Assert: change in `changes/archive/`, spec promoted into
   `openspec/specs/`, project repo byte-identical (hash the tree before and
   after), banners on stderr, stdout payloads clean.
5. Commit machine A's work (the test acts as the user; OpenSpec must not
   commit here).

Machine B (separate global state):

6. `git clone` machine A's store; `context-store register <clone>` —
   succeeds without ceremony; doctor healthy.
7. `list --specs` / `show` see the spec promoted by machine A's archived
   change (no archive browsing).
8. Second change through the same lifecycle to archive in the clone.

End-state assertions:

9. Both checkouts contain only normal `openspec/` artifacts,
   `.openspec-store/store.yaml`, placeholders, and Git state. No
   initiative or workspace planning files anywhere, including both
   machines' global state; global state holds only registry/config
   metadata.

Test hygiene: set `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM` to isolated
files (or env identity vars) so user gitconfig (signing, hooks, templates)
cannot leak in; configure identity explicitly for the journey, and add one
focused test that *unsets* identity to cover the preflight failure.

## Other Test Updates

- `test/commands/context-store.test.ts`: setup now errors without `--path`
  non-interactively (was: silent XDG default — my 2026-06-11 probe confirmed
  current behavior); git on by default with commit and placeholders;
  the initial commit contains `store.yaml`; a pre-staged unrelated file in
  the existing-repo case stays staged and out of setup's commit;
  placeholders added when first accepting an existing root with empty
  dirs; `--no-init-git` opt-out; identity preflight failure creates
  nothing, and env-var identity (`GIT_AUTHOR_*`/`GIT_COMMITTER_*`) passes
  the preflight; rerun no-op includes no new commit and no placeholder
  retrofit; doctor git facts, commitless warning, and clone-fragile
  empty-directory warning; reworked register error texts (assert
  non-circular fix text).
- `test/commands/store-root-selection.test.ts`: hint expectations gain
  `--store`; banner-on-failure coverage (e.g. `instructions apply` with no
  changes); status output no longer contains `Planning home`.
- `test/commands/artifact-workflow.test.ts` (or wherever status human
  output is asserted): drop `Planning home` expectations; `new change`
  next-step line.
- Unit-level coverage in `test/core/context-store/` for placeholder
  creation, staged-paths commit, and identity preflight if the logic is
  factored into testable functions.

Run order during implementation:

```bash
pnpm test -- test/commands/context-store.test.ts
pnpm test -- test/commands/store-root-selection.test.ts
pnpm test -- test/commands/artifact-workflow.test.ts
pnpm run build
pnpm test -- test/cli-e2e/store-lifecycle.test.ts
pnpm test
```

## Implementation Checklist

- [ ] Flip setup Git default to on; add an index-preserving,
  pathspec-limited initial commit with a store-naming message and a
  `committed` JSON field.
- [ ] Decouple the `store.yaml` metadata write from registration so it
  happens before the commit; move the machine-local registry write to
  last.
- [ ] Add `.gitkeep` placeholders to empty directories setup creates or
  first accepts; include them in `created_files` and the commit; never on
  reruns or via register.
- [ ] Add Git identity preflight via `git var
  GIT_COMMITTER_IDENT`/`GIT_AUTHOR_IDENT` with
  `context_store_git_identity_missing` before any file creation; exempt
  `--no-init-git`.
- [ ] Require `--path` non-interactively
  (`context_store_setup_path_required`); change the interactive prompt
  suggestion to a user-visible path.
- [ ] Add sharing line to setup/register next-steps output.
- [ ] Extend doctor Git inspection and output with `has_commits`,
  `has_uncommitted_changes`, `has_remote`, plus the commitless warning and
  the clone-fragile empty-directory warning.
- [ ] Rework register errors: one-checkout rule + unregister escape,
  registration-aware id-mismatch fix text, missing-pieces unhealthy-root
  refusal with empty-clone hint.
- [ ] Add the store-aware hint helper and thread it through `status.ts`,
  `shared.ts`, and other supported-command hint sites.
- [ ] Emit the root banner immediately after resolution in supported
  commands so post-resolution failures keep it.
- [ ] Add the `new change` next-step line.
- [ ] Remove the `Planning home` line from status; audit status output for
  workspace vocabulary.
- [ ] Write `test/cli-e2e/store-lifecycle.test.ts` (two-checkout journey).
- [ ] Update existing context-store, store-root-selection, and workflow
  tests for the new defaults and outputs.
- [ ] Run targeted tests, build, full suite.

## Risks And Guardrails

- **User gitconfig leakage** is the most likely flaky-test source: signing
  requirements, hooks, `init.defaultBranch` prompts. Isolate Git config in
  every test that touches Git, and keep setup's own Git invocations free of
  assumptions about branch names.
- **Index preservation**: `git add <paths>` followed by a bare
  `git commit` would sweep the user's pre-staged unrelated files into
  setup's commit. The commit itself must be pathspec-limited
  (`git commit -- <created paths>`) or built on a temporary index; test
  with a pre-staged file in the repo.
- **Metadata-commit ordering**: `store.yaml` is currently written during
  registration, after Git init. If it is not written before the commit
  step, the initial commit silently omits it and clones lose the
  no-ceremony register path — the journey's `git show --name-only`
  assertion is the regression net.
- **Preflight-before-create ordering**: the identity check must run before
  directory creation, or the atomicity promise breaks. Keep the 1.1
  failure-cleanup path working for unexpected commit failures (e.g.
  gpgsign), including removing an operation-created `.git/`. If the
  commit fails after the registry write is reordered to last, no registry
  entry exists to clean up.
- **Rerun no-ops**: placeholder creation is tied to setup creating or
  first accepting a root, never to reruns on already-registered stores —
  otherwise reruns stop being no-ops and doctor's no-repair stance gets
  blurry. Doctor's clone-fragility warning, not setup, covers stores that
  predate this slice.
- **Hint helper scope**: only supported commands' hints gain `--store`;
  deprecated noun-form commands stay untouched (slice 1.2 boundary).
- **Banner ordering**: emitting at resolution time must not double-print
  on success paths that already emit it; move, don't add.
- **created_files contract**: slice 1.1 tests may assert exact file lists;
  update them deliberately rather than loosening the contract.

## Done Definition

- Fresh setup leaves a Git repo with one commit, placeholders, and a clone
  that registers as healthy immediately — proven by the journey test.
- Setup without a location fails non-interactively and prompts
  interactively with a visible-path suggestion; it never silently uses the
  XDG data directory.
- Missing Git identity fails setup before any files exist, with the exact
  fix; `--no-init-git` needs no identity.
- Doctor reports commits/dirty/remote facts read-only and warns on
  commitless repos.
- No register error's fix text leads to another register error for the
  same situation.
- With a store selected, every printed hint works verbatim and failures
  still name the resolved root.
- `status` prints no workspace-era vocabulary.
- The two-checkout journey passes against the built CLI with isolated
  global state, ending in normal OpenSpec files only, and the full suite is
  green.
