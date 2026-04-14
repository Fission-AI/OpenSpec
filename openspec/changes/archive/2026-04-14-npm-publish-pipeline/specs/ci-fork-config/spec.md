## ADDED Requirements

### Requirement: pack-version-check uses enpalspec bin path
`scripts/pack-version-check.mjs` SHALL reference `@enpal/enpalspec` as the bin path, not `@fission-ai/openspec`.

#### Scenario: pack-version-check passes with correct bin path
- **WHEN** `pnpm run check:pack-version` is executed
- **THEN** it SHALL NOT fail due to a mismatched bin path referencing `@fission-ai/openspec`

### Requirement: Changeset config references enpalspec repository
`.changeset/config.json` SHALL reference `enpal/enpalspec` as the GitHub repository for changelog link generation.

#### Scenario: changeset config has correct repo
- **WHEN** `.changeset/config.json` is read
- **THEN** the `changelog` repo value SHALL be `enpal/enpalspec`, not `Fission-AI/OpenSpec`

### Requirement: Inherited openspec changesets are deleted
The files `.changeset/graceful-status-no-changes.md` and `.changeset/fix-opencode-commands-directory.md` SHALL NOT exist in the repository.

#### Scenario: stale changesets are absent
- **WHEN** the `.changeset/` directory is listed
- **THEN** `graceful-status-no-changes.md` and `fix-opencode-commands-directory.md` MUST NOT be present

### Requirement: Postinstall script uses ENPALSPEC_NO_COMPLETIONS env var
`scripts/postinstall.js` SHALL check the `ENPALSPEC_NO_COMPLETIONS` environment variable (not `OPENSPEC_NO_COMPLETIONS`) to suppress shell completion setup. The completion tip text SHALL reference `enpalspec completion install`.

#### Scenario: postinstall skips completions when ENPALSPEC_NO_COMPLETIONS is set
- **WHEN** the `ENPALSPEC_NO_COMPLETIONS` environment variable is set to any truthy value
- **THEN** `postinstall.js` SHALL skip shell completion setup

#### Scenario: postinstall tip text is enpalspec-branded
- **WHEN** the postinstall completion tip is printed
- **THEN** it SHALL display `enpalspec completion install`, not `openspec completion install`

### Requirement: Test postinstall script uses ENPALSPEC_NO_COMPLETIONS env var
`scripts/test-postinstall.sh` SHALL use `ENPALSPEC_NO_COMPLETIONS` when suppressing completions in the test environment.

#### Scenario: test-postinstall uses correct env var
- **WHEN** `scripts/test-postinstall.sh` is read
- **THEN** it SHALL reference `ENPALSPEC_NO_COMPLETIONS`, not `OPENSPEC_NO_COMPLETIONS`

### Requirement: Feedback command references enpalspec repository
`src/commands/feedback.ts` SHALL submit feedback to `enpal/enpalspec` on GitHub, not `Fission-AI/OpenSpec`.

#### Scenario: feedback command opens correct GitHub repo
- **WHEN** a user runs the `feedback` command
- **THEN** the generated GitHub issue URL SHALL reference `enpal/enpalspec`

### Requirement: Feedback command tests reference enpalspec repository
`test/commands/feedback.test.ts` SHALL mock the repository as `enpal/enpalspec` to match the updated `feedback.ts`.

#### Scenario: feedback tests pass with updated repo
- **WHEN** the feedback command tests are executed
- **THEN** all assertions that previously expected `Fission-AI/OpenSpec` SHALL expect `enpal/enpalspec`

### Requirement: Update command learn-more link references enpalspec
`src/core/update.ts` SHALL link users to the enpalspec GitHub repository (or a designated enpalspec URL) rather than a Fission-AI URL when displaying update information.

#### Scenario: update learn-more URL is enpalspec
- **WHEN** `src/core/update.ts` displays a learn-more or update link
- **THEN** the URL SHALL reference `github.com/enpal/enpalspec` (or equivalent enpalspec destination), not a Fission-AI URL

### Requirement: Init command footer link references enpalspec
`src/core/init.ts` SHALL display an enpalspec URL in its footer or completion message, not a Fission-AI URL.

#### Scenario: init footer URL is enpalspec
- **WHEN** `src/core/init.ts` prints its completion footer
- **THEN** the URL SHALL reference `github.com/enpal/enpalspec` (or equivalent enpalspec destination), not a Fission-AI URL
