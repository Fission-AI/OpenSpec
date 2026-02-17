## ADDED Requirements

### Requirement: Feedback command

The system SHALL provide an `openspec feedback` command that creates a GitHub Issue in the openspec repository using the `gh` CLI. The system SHALL use `execFileSync` with argument arrays to prevent shell injection vulnerabilities.

#### Scenario: Simple feedback submission

- **WHEN** user executes `openspec feedback "Great tool!"`
- **THEN** the system executes `gh issue create` with title "Feedback: Great tool!"
- **AND** the issue is created in the openspec repository
- **AND** the issue has the `feedback` label
- **AND** the system displays the created issue URL

#### Scenario: Safe command execution

- **WHEN** submitting feedback via `gh` CLI
- **THEN** the system uses `execFileSync` with separate arguments array
- **AND** user input is NOT passed through a shell
- **AND** shell metacharacters (quotes, backticks, $(), etc.) are treated as literal text

#### Scenario: Feedback with body

- **WHEN** user executes `openspec feedback "Title here" --body "Detailed description..."`
- **THEN** the system creates a GitHub Issue with the specified title
- **AND** the issue body contains the detailed description
- **AND** the issue body includes metadata (OpenSpec version, platform, timestamp)

### Requirement: GitHub CLI dependency

The system SHALL use `gh` CLI for automatic feedback submission when available, and provide a manual submission fallback when `gh` is not installed or not authenticated. The system SHALL use platform-appropriate commands to detect `gh` CLI availability.

#### Scenario: Missing gh CLI with fallback

- **WHEN** user runs `openspec feedback "message"`
- **AND** `gh` CLI is not installed (not found in PATH)
- **THEN** the system displays warning: "GitHub CLI not found. Manual submission required."
- **AND** outputs structured feedback content with delimiters:
  - "--- FORMATTED FEEDBACK ---"
  - Title line
  - Labels line
  - Body content with metadata
  - "--- END FEEDBACK ---"
- **AND** displays pre-filled GitHub issue URL for manual submission
- **AND** exits with zero code (successful fallback)

#### Scenario: Cross-platform gh CLI detection on Unix

- **WHEN** system is running on macOS or Linux (platform is 'darwin' or 'linux')
- **AND** checking if `gh` CLI is installed
- **THEN** the system executes `which gh` command

#### Scenario: Cross-platform gh CLI detection on Windows

- **WHEN** system is running on Windows (platform is 'win32')
- **AND** checking if `gh` CLI is installed
- **THEN** the system executes `where gh` command

#### Scenario: Unauthenticated gh CLI with fallback

- **WHEN** user runs `openspec feedback "message"`
- **AND** `gh` CLI is installed but not authenticated
- **THEN** the system displays warning: "GitHub authentication required. Manual submission required."
- **AND** outputs structured feedback content (same format as missing gh CLI scenario)
- **AND** displays pre-filled GitHub issue URL for manual submission
- **AND** displays authentication instructions: "To auto-submit in the future: gh auth login"
- **AND** exits with zero code (successful fallback)

#### Scenario: Authenticated gh CLI

- **WHEN** user runs `openspec feedback "message"`
- **AND** `gh auth status` returns success (authenticated)
- **THEN** the system proceeds with feedback submission

### Requirement: Issue metadata

The system SHALL include relevant metadata in the GitHub Issue body.

#### Scenario: Standard metadata

- **WHEN** creating a GitHub Issue for feedback
- **THEN** the issue body includes:
  - OpenSpec CLI version
  - Platform (darwin, linux, win32)
  - Submission timestamp
  - Separator line: "---\nSubmitted via OpenSpec CLI"

#### Scenario: Windows platform metadata

- **WHEN** creating a GitHub Issue for feedback on Windows
- **THEN** the issue body includes "Platform: win32"
- **AND** all platform detection uses Node.js `os.platform()` API

#### Scenario: No sensitive metadata

- **WHEN** creating a GitHub Issue for feedback
- **THEN** the issue body does NOT include:
  - File paths from user's system
  - Project names or directory names
  - Environment variables
  - IP addresses

### Requirement: Feedback always works

The system SHALL allow feedback submission regardless of telemetry settings.

#### Scenario: Feedback with telemetry disabled

- **WHEN** user has disabled telemetry via `OPENSPEC_TELEMETRY=0`
- **AND** user runs `openspec feedback "message"`
- **THEN** the feedback is still submitted via `gh` CLI
- **AND** telemetry events are not sent

#### Scenario: Feedback in CI environment

- **WHEN** `CI=true` is set in the environment
- **AND** user runs `openspec feedback "message"`
- **THEN** the feedback submission proceeds normally (if `gh` is available and authenticated)

### Requirement: Error handling

The system SHALL handle feedback submission errors gracefully.

#### Scenario: gh CLI execution failure

- **WHEN** `gh issue create` command fails
- **THEN** the system displays the error output from `gh` CLI
- **AND** exits with the same exit code as `gh`

#### Scenario: Network failure

- **WHEN** `gh` CLI reports network connectivity issues
- **THEN** the system displays the error message from `gh`
- **AND** suggests checking network connectivity
- **AND** exits with non-zero code

### Requirement: Feedback skill for agents

The system SHALL provide a `/feedback` skill that guides agents through collecting and submitting user feedback.

#### Scenario: Agent-initiated feedback

- **WHEN** user invokes `/feedback` in an agent conversation
- **THEN** the agent gathers context from the conversation
- **AND** drafts a feedback issue with enriched content
- **AND** anonymizes sensitive information
- **AND** presents the draft to the user for approval
- **AND** submits via `openspec feedback` command on user confirmation

#### Scenario: Context enrichment

- **WHEN** agent drafts feedback
- **THEN** the agent includes relevant context such as:
  - What task was being performed
  - What worked well or poorly
  - Specific friction points or praise

#### Scenario: Anonymization

- **WHEN** agent drafts feedback
- **THEN** the agent removes or replaces:
  - File paths with `<path>` or generic descriptions
  - API keys, tokens, secrets with `<redacted>`
  - Company/organization names with `<company>`
  - Personal names with `<user>`
  - Specific URLs with `<url>` unless public/relevant

#### Scenario: User confirmation required

- **WHEN** agent has drafted feedback
- **THEN** the agent MUST show the complete draft to the user
- **AND** ask for explicit approval before submitting
- **AND** allow the user to request modifications
- **AND** only submit after user confirms

### Requirement: Shell completions

The system SHALL provide shell completions for the feedback command.

#### Scenario: Command completion

- **WHEN** user types `openspec fee<TAB>`
- **THEN** the shell completes to `openspec feedback`

#### Scenario: Flag completion

- **WHEN** user types `openspec feedback "msg" --<TAB>`
- **THEN** the shell suggests available flags (`--body`)
