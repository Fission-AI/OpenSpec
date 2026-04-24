# Phase 00 Manual Test

## Scenarios Run

- Copied the committed `happy-path` fixture into two fresh temp roots by cloning both `workspace/` and `repos/` outside Vitest.
- Confirmed one copied workspace root contains `.openspec/` and `changes/`, and does not contain a repo-local `openspec/` directory.
- Ran `node "$OPENSPEC_REPO/dist/cli/index.js" list --json` from the copied `repos/app` root, with `OPENSPEC_REPO` set to the current OpenSpec checkout, and parsed stdout as JSON.
- Mutated `repos/app/README.md` in the first temp root and confirmed the same file in the second temp root remained unchanged.
- Ran `rg -n -F "$OPENSPEC_REPO" test/fixtures/workspace-poc` to confirm the current checkout path is not committed into the workspace fixtures.

## Results

- All manual smoke scenarios passed.
- The workspace copy preserved the expected Phase 00 layout: `.openspec/` and `changes/` exist at the workspace root, and no nested repo-local `openspec/` directory exists there.
- The direct CLI invocation exited `0`, produced empty `stderr`, and returned parseable JSON from the attached repo fixture. The current payload shape is an object with a `changes` array containing the fixture-backed `app-ui-polish` change.
- Mutating one fresh fixture copy did not affect the second copy, which confirms the Phase 00 isolation property outside the automated test harness.
- The committed fixture seeds do not contain the current checkout path.

## Fixes Applied

- No product-code fixes were needed from this manual pass.
- Corrected the first smoke attempt to use the attached repo as the real process working directory; `openspec list` does not expose a `--cwd` flag.

## Residual Risks

- No residual risks were found within the implemented Phase 00 scope.
- This manual smoke still validates attached-repo execution rather than future workspace command entrypoints, because workspace commands land in later phases.
