## 1. Directory support

- [x] 1.1 Share active-change discovery and resolution across CLI consumers; verify proposed, approved, flat, duplicate, and linked-path cases.
- [x] 1.2 Create proposed changes and preserve old directories on update; verify creation and mixed-layout command behavior.

## 2. Agent workflow

- [x] 2.1 Add concise instructions for agent-driven approval moves and refreshed paths; regenerate skills and verify rendered workflow coverage.

## 3. Verification and documentation

- [x] 3.1 Document the directory convention and add a changeset; verify examples against the built CLI.
- [x] 3.2 Run build, lint, focused tests, and end-to-end move/archive checks; include cross-platform path coverage and report Windows CI as pending if unavailable locally.

Verification: build, lint, and strict change validation pass. Full-suite run: 4,426 passed; four outdated creation-path fixtures corrected, then all 375 tests in the affected suites passed. After enforcing approved-only archive, all 259 tests in the archive, store journey, and template suites passed. Windows CI has not run locally. Agent instructions were checked through generated-template parity and code review; conversational behavior was not evaluated across LLM providers.
