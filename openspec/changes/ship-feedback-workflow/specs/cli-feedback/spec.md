## MODIFIED Requirements

### Requirement: Feedback command

The system SHALL provide an `openspec feedback` command that creates a GitHub Issue in the openspec repository using the `gh` CLI. The system SHALL use `execFileSync` with argument arrays to prevent shell injection vulnerabilities.

The command SHALL accept a `--type` option with the values `bug`, `feature`, and `feedback`, defaulting to `feedback`. The type SHALL determine the issue title, the body sections, and the label requested:

| Type | Title | Body sections | Labels |
|---|---|---|---|
| `feedback` | `Feedback: <message>` | Summary, Details | `feedback` |
| `bug` | `<message>` | What happened, Expected, Repro, Version, Agent, Environment | `bug`, `needs-triage` |
| `feature` | `<message>` | Problem, Who it affects, What you tried, Proposal | `enhancement`, `needs-triage` |

The `bug` and `feature` body sections SHALL match the fields and order of the repository's issue forms, and the labels requested SHALL be the labels those forms apply, so that a report filed by the command and a report filed through the form read the same and reach the same triage queue. The system SHALL reject an unrecognized `--type` value with a message naming the accepted values, and SHALL NOT submit anything.

#### Scenario: Simple feedback submission

- **WHEN** user executes `openspec feedback "Great tool!"`
- **THEN** the system executes `gh issue create` with title "Feedback: Great tool!"
- **AND** the issue body includes "Great tool!" under a Summary heading
- **AND** the issue is created in the openspec repository
- **AND** the issue has the `feedback` label
- **AND** the system displays the created issue URL

#### Scenario: Bug report submission

- **WHEN** user executes `openspec feedback "archive drops the main spec" --type bug`
- **THEN** the issue title is "archive drops the main spec" with no "Feedback: " prefix
- **AND** the issue body carries the bug form's sections in the form's order
- **AND** the system requests the `bug` and `needs-triage` labels
- **AND** the system displays the created issue URL

#### Scenario: Feature request submission

- **WHEN** user executes `openspec feedback "let me unarchive a change" --type feature`
- **THEN** the issue title is "let me unarchive a change" with no "Feedback: " prefix
- **AND** the issue body carries the feature form's sections in the form's order
- **AND** the system requests the `enhancement` and `needs-triage` labels

#### Scenario: Unrecognized type

- **WHEN** user executes `openspec feedback "message" --type question`
- **THEN** the system reports that `question` is not an accepted type
- **AND** names `bug`, `feature`, and `feedback` as the accepted values
- **AND** exits with a non-zero code without contacting GitHub

#### Scenario: Repository does not define the feedback label

- **WHEN** user executes `openspec feedback "Great tool!"`
- **AND** the repository does not define the `feedback` label, so `gh` refuses to create the issue
- **THEN** the system retries `gh issue create` without the label
- **AND** the issue is created in the openspec repository without the `feedback` label
- **AND** the system displays the created issue URL
- **AND** the system notes that the label was not applied

#### Scenario: Repository does not define a type's label

- **WHEN** user executes `openspec feedback "message" --type bug`
- **AND** the repository does not define one of the labels, so `gh` refuses to create the issue
- **THEN** the system retries `gh issue create` without labels, as it does for the `feedback` label
- **AND** the issue is created in the openspec repository without labels
- **AND** the system notes that the labels were not applied

#### Scenario: Safe command execution

- **WHEN** submitting feedback via `gh` CLI
- **THEN** the system uses `execFileSync` with separate arguments array
- **AND** user input is NOT passed through a shell
- **AND** shell metacharacters (quotes, backticks, $(), etc.) are treated as literal text

#### Scenario: Feedback with body

- **WHEN** user executes `openspec feedback "Title here" --body "Detailed description..."`
- **THEN** the system creates a GitHub Issue with the specified title
- **AND** the issue body contains the message under a Summary heading
- **AND** the issue body contains the detailed description under a Details heading
- **AND** the issue body includes metadata (OpenSpec version, platform, timestamp)

#### Scenario: Long or multiline feedback message

- **WHEN** user executes `openspec feedback` with a long or multiline message
- **THEN** the issue title is a single whitespace-normalized line of at most 72 characters
- **AND** an ellipsis indicates when the title was shortened
- **AND** the complete message is preserved in the issue body

### Requirement: GitHub CLI dependency

The system SHALL use `gh` CLI for automatic feedback submission when available, and provide a manual submission fallback when `gh` is not installed or not authenticated. The system SHALL use platform-appropriate commands to detect `gh` CLI availability.

The pre-filled URL offered by the manual fallback SHALL target the repository's issue form matching the `--type`, prefilling each of the form's fields by its field id, so that a user without `gh` reaches the same form a user on GitHub reaches. The system SHALL fall back to the blank-issue URL, carrying the complete body, when no form matches the type or when the prefilled URL would exceed the length the system accepts. The system SHALL NOT read the issue forms at runtime.

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

#### Scenario: Fallback URL targets the bug form

- **WHEN** the manual fallback is reached for `--type bug`
- **THEN** the pre-filled URL selects the repository's bug report form
- **AND** carries one query parameter per form field id, holding that field's drafted content
- **AND** a field the system cannot fill is omitted rather than sent empty

#### Scenario: Fallback URL too long for the form

- **WHEN** the manual fallback is reached for `--type bug`
- **AND** the prefilled URL would exceed the length the system accepts
- **THEN** the system displays the blank-issue URL instead
- **AND** the complete body is still carried in that URL
- **AND** the complete body is still printed between the feedback delimiters

#### Scenario: Fallback URL for general feedback

- **WHEN** the manual fallback is reached for the default `feedback` type
- **THEN** the system displays the blank-issue URL, because no issue form matches general feedback
- **AND** the URL carries the complete body, as it does today

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

### Requirement: Feedback skill for agents

The system SHALL install a `feedback` workflow — a skill and a slash command — as part of the core profile, so that `openspec init` and `openspec update` deliver it without the user selecting it. The skill SHALL guide an agent through drafting and submitting a report.

The skill SHALL draft rather than interrogate. It SHALL fill in from the conversation and the environment everything it can observe — the task in progress, the failing command and its output, the OpenSpec version, the platform, and the agent and model — and SHALL ask the user only for what it cannot infer. It SHALL present one complete draft rather than a sequence of questions.

The drafted fields SHALL be the fields of the issue form matching the report type, so that a report filed by the skill and a report filed through the form read the same.

#### Scenario: Agent-initiated feedback

- **WHEN** user invokes the feedback skill in an agent conversation
- **THEN** the agent gathers context from the conversation
- **AND** drafts a report with enriched content
- **AND** anonymizes sensitive information
- **AND** presents the draft to the user for approval
- **AND** submits via the `openspec feedback` command on user confirmation

#### Scenario: Installed by default

- **WHEN** a user runs `openspec init` or `openspec update` on the default profile
- **THEN** the feedback skill and its slash command are installed alongside the other core workflows
- **AND** a project on a custom profile is told the workflow is available rather than having it added silently

#### Scenario: Drafting without interrogation

- **WHEN** the agent has the version, the platform, the failing command, and the model available from the conversation or the environment
- **THEN** the agent fills those fields itself
- **AND** asks the user only for what it cannot observe
- **AND** shows a single complete draft rather than asking the fields one at a time

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
- **THEN** the shell suggests available flags (`--body`, `--type`)

#### Scenario: Type value completion

- **WHEN** user types `openspec feedback "msg" --type <TAB>`
- **THEN** the shell suggests `bug`, `feature`, and `feedback`
