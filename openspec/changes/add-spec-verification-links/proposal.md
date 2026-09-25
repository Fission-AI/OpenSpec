## Why

Specs are the only artifact that stays live after a change archives. Design and tasks go into the archive with the change, and nothing links them back to the requirements they support. So when a detail matters later, the spec is the only place it can survive. That is why test procedures and framework settings end up inside requirements (#1967).

The same gap hides verification. After archive, nothing records how a requirement is verified, or whether it is. `/opsx:verify` guesses scenario coverage by searching for tests that look related, and the answer is gone once the session ends.

Tests already live as long as specs do. If a test can say which scenario it verifies, the test becomes the lasting home for "how is this proven." The spec can then stay a behavior contract.

## What Changes

- A test, or any other tracked text file, can link to a scenario with a one-line reference in a comment:
  `@spec <capability-path> > <Requirement name> > <Scenario name>`. Dropping the scenario part links the whole requirement.
- A new read-only command, `openspec spec coverage [spec-id]`, lists every scenario in the main specs with the files and lines that link to it. It also lists scenarios nothing links to, and references that no longer match any scenario (dangling).
- The report is advisory. It never changes the exit code and never blocks validate or archive.
- Specs do not change format. No IDs, no new sections, no new metadata.

This is phase 1 of #1967: links from evidence to specs. Where implementation context should live, and a verification plan at proposal time, are separate follow-ups listed in `design.md`.

## Capabilities

### New Capabilities

- `spec-traceability`: scenario references in project files, and a coverage report built from them.

### Modified Capabilities

_None._

## Impact

- **Public CLI:** one new subcommand, `openspec spec coverage`, with `--json`. No change to existing commands, flags, or exit codes.
- **Spec authors:** nothing new to write. Specs look the same.
- **Test authors:** optional one-line comments. A project that adds none sees every scenario reported as unlinked, and nothing fails.
- **Implementation:** a read-only scanner under `src/core/`, a subcommand in `src/commands/spec.ts`, docs in `docs-lab/reference/cli.md`, tests, and a minor changeset. No new dependency.
