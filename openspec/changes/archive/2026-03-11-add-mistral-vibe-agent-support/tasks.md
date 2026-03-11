## 1. Tool Registry and Generation Wiring

- [x] 1.1 Add `mistral-vibe` to the supported AI tools registry with `.vibe` skills directory metadata.
- [x] 1.2 Update command adapter registration and generation flow to handle Vibe deterministically when no adapter exists.
- [x] 1.3 Ensure init selection, configured-state detection, and summaries include Mistral Vibe.

## 2. Update and Detection Behavior

- [x] 2.1 Extend update detection so existing `.vibe/skills/openspec-*` files are discovered and refreshed.
- [x] 2.2 Keep update non-destructive by skipping creation of missing Vibe-managed files and commands.
- [x] 2.3 Add or update tests for init/update detection, refresh behavior, and summary output for `mistral-vibe`.

## 3. Validation and Documentation

- [x] 3.1 Update supported tools documentation to include Mistral Vibe paths and command-support expectations.
- [x] 3.2 Run lint and test suites covering init/update plus targeted cross-platform path assertions.
- [x] 3.3 Add Windows-oriented verification for path handling in updated tests or CI coverage notes.
