## ADDED Requirements

### Requirement: Feedback command

The system SHALL provide an `openspec feedback` command that creates a GitHub Issue in the openspec repository with the user's feedback.

#### Scenario: Simple feedback submission

- **WHEN** user executes `openspec feedback "Great tool!"`
- **THEN** the system creates a GitHub Issue with title "Feedback: Great tool!"
- **AND** the issue has the `feedback` label
- **AND** the system displays the created issue URL

#### Scenario: Rich feedback with body

- **WHEN** user executes `openspec feedback "Title here" --body "Detailed description..."`
- **THEN** the system creates a GitHub Issue with the specified title
- **AND** the issue body contains the detailed description
- **AND** the issue body includes metadata (OpenSpec version, platform)

#### Scenario: Multiline message

- **WHEN** user provides a multiline message (first line as title, rest as body)
- **THEN** the system uses the first line as the issue title
- **AND** the remaining lines become the issue body

### Requirement: GitHub authentication

The system SHALL authenticate users via GitHub Device OAuth flow before submitting feedback.

#### Scenario: First-time authentication

- **WHEN** user runs `openspec feedback` for the first time
- **AND** no GitHub token is stored
- **THEN** the system initiates GitHub Device OAuth flow
- **AND** displays a URL and code for the user to authorize
- **AND** polls for authorization completion
- **AND** stores the token in global config on success

#### Scenario: Cached authentication

- **WHEN** user runs `openspec feedback`
- **AND** a valid GitHub token is stored
- **THEN** the system uses the cached token without re-authentication

#### Scenario: Token refresh

- **WHEN** the stored GitHub token is expired or invalid
- **THEN** the system initiates a new Device OAuth flow
- **AND** updates the stored token on success

#### Scenario: Authentication cancellation

- **WHEN** user cancels the OAuth flow (Ctrl+C)
- **THEN** the system exits gracefully without storing any token
- **AND** displays a message indicating feedback was not submitted

### Requirement: GitHub token storage

The system SHALL securely store GitHub authentication tokens in the global config directory.

#### Scenario: Token persistence

- **WHEN** GitHub authentication completes successfully
- **THEN** the system stores the access token in `~/.config/openspec/config.json`
- **AND** the token persists across CLI sessions

#### Scenario: Token isolation

- **WHEN** storing the GitHub token
- **THEN** the token is stored separately from telemetry configuration
- **AND** does not affect or depend on telemetry settings

### Requirement: Feedback always works

The system SHALL allow feedback submission regardless of telemetry settings.

#### Scenario: Feedback with telemetry disabled

- **WHEN** user has disabled telemetry via `OPENSPEC_TELEMETRY=0`
- **AND** user runs `openspec feedback "message"`
- **THEN** the feedback is still submitted to GitHub
- **AND** telemetry events are not sent

#### Scenario: Feedback in CI environment

- **WHEN** `CI=true` is set in the environment
- **AND** user runs `openspec feedback "message"`
- **THEN** the feedback submission proceeds normally

### Requirement: Issue metadata

The system SHALL include relevant metadata in the GitHub Issue body.

#### Scenario: Standard metadata

- **WHEN** creating a GitHub Issue for feedback
- **THEN** the issue body includes:
  - OpenSpec CLI version
  - Platform (darwin, linux, win32)
  - Submission timestamp
  - Separator line indicating "Submitted via OpenSpec CLI"

#### Scenario: No sensitive metadata

- **WHEN** creating a GitHub Issue for feedback
- **THEN** the issue body does NOT include:
  - File paths from user's system
  - Project names or directory names
  - Environment variables
  - IP addresses

### Requirement: Error handling

The system SHALL handle feedback submission errors gracefully.

#### Scenario: Network failure

- **WHEN** GitHub API is unreachable
- **THEN** the system displays a clear error message
- **AND** suggests checking network connectivity
- **AND** exits with non-zero code

#### Scenario: GitHub API error

- **WHEN** GitHub API returns an error (rate limit, server error)
- **THEN** the system displays the error message from GitHub
- **AND** exits with non-zero code

#### Scenario: Invalid token

- **WHEN** the stored token is revoked or invalid
- **THEN** the system clears the stored token
- **AND** initiates a new OAuth flow

### Requirement: Feedback skill for agents

The system SHALL provide a `/feedback` skill that guides agents through collecting and submitting user feedback.

#### Scenario: Agent-initiated feedback

- **WHEN** user invokes `/feedback <message>` in an agent conversation
- **THEN** the agent gathers context from the conversation
- **AND** drafts a feedback issue with enriched content
- **AND** anonymizes sensitive information
- **AND** presents the draft to the user for approval
- **AND** submits via `openspec feedback` on user confirmation

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
