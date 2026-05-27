# Change: Improve Deterministic Tests (Isolate From Repo State)

## Problem

Some unit tests (e.g., ChangeCommand.show/validate) read the live repository
state via `process.cwd()` and `pastelsdd/changes`. This makes outcomes depend on
whatever directories happen to exist and the order returned by `fs.readdir`,
causing flaky success/failure across environments.

Symptoms observed:
- Tests sometimes select a partial or unrelated change folder.
- Failures like missing `proposal.md` when a stray change directory is picked.
- Environment/sandbox differences alter `readdir` ordering and worker behavior.

## Goals

- Make tests deterministic and hermetic.
- Remove dependence on real repo contents and directory ordering.
- Keep runtime behavior unchanged for end users.

## Non‑Goals

- Introduce heavy frameworks or test harness complexity.
- Redesign CLI behavior or change default paths for users.

## Approach

1) Test-local fixture root
- Each suite that touches filesystem discovery creates a temporary directory:
  - `pastelsdd/changes/sample-change/proposal.md`
  - `pastelsdd/changes/sample-change/specs/sample/spec.md`
- `beforeAll`: `process.chdir(tmpRoot)`; `afterAll`: restore original cwd.
- Use a constant `changeName = 'sample-change'`; remove reliance on
  `readdir` order.

2) Optional thin DI for commands (minimal, if needed)
- Allow `ChangeCommand` (and similar) to accept an optional `root` path
  (default `process.cwd()`), used for path resolution.
- Tests pass the temp root explicitly; production code remains unchanged.

3) Harden discovery helpers (safe enhancement)
- Update `getActiveChangeIds()`/`getActiveChanges()` to include only
  directories containing `proposal.md` (and optionally at least one
  `specs/*/spec.md`).
- Prevents incomplete/stray change folders from being treated as active.

## Rationale

- Small, focused changes eliminate flakiness without altering user workflows.
- Temporary fixtures are a well-understood testing pattern and keep tests fast.
- Optional constructor root param is a minimal DI surface that avoids global
  stubbing and keeps code simple.

## Risks & Mitigations

- Risk: Tests forget to restore `process.cwd()`.
  - Mitigation: Add `afterAll` guard restoring cwd; reset `process.exitCode` in
    `afterEach` where modified.
- Risk: Behavior divergence if DI root is misused.
  - Mitigation: Default to `process.cwd()`; only tests pass custom roots.

## Acceptance Criteria

- Tests that previously depended on repo state now:
  - Create and use a temp fixture root.
  - Do not read real `pastelsdd/changes` during execution.
  - Pass consistently regardless of directory order or stray folders.
- No change to CLI behavior for end users (paths still default to cwd).

## Rollout

- Phase 1: Convert the suites that hit `ChangeCommand.show/validate` to
  isolated fixtures; verify stability locally and in CI.
- Phase 2: Apply the same pattern to any remaining suites that touch file
  discovery (`list`, `show`, `validate`, `diff`).
- Phase 3 (optional): Introduce the constructor `root` param and discovery
  hardening, if Phase 1 alone isn’t sufficient.

