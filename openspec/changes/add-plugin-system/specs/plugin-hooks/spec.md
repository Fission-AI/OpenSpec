## ADDED Requirements

### Requirement: Lifecycle hook points

The system SHALL support hooks at defined points in the change lifecycle.

#### Scenario: Available hook points
- **WHEN** a plugin registers hooks
- **THEN** the following hook points SHALL be available:
  - `propose.pre` — before proposal creation
  - `propose.post` — after proposal creation
  - `apply.pre` — before apply phase begins
  - `apply.post` — after all tasks complete
  - `archive.pre` — before archive operation
  - `archive.post` — after archive completes (directory moved)

#### Scenario: Hook point not recognized
- **WHEN** a plugin registers a hook at an unknown point like `build.pre`
- **THEN** the system reports a validation error identifying the invalid hook point

### Requirement: Command handler execution

The system SHALL execute `command` type handlers by running shell commands and capturing exit codes.

#### Scenario: Command succeeds
- **WHEN** a hook has `handler.type: "command"` and `handler.run: "echo ok"`
- **THEN** the system executes the command in a shell
- **AND** captures stdout and stderr
- **AND** reports status "success" with the output

#### Scenario: Command fails
- **WHEN** a hook has `handler.type: "command"` and the command exits with non-zero code
- **AND** `ignore_failure` is not set or is false
- **THEN** the system reports status "failed" with the error output
- **AND** halts further hook execution for this hook point

#### Scenario: Command fails with ignore_failure
- **WHEN** a hook has `handler.type: "command"` with `ignore_failure: true`
- **AND** the command exits with non-zero code
- **THEN** the system reports status "failed" with the error output
- **AND** continues executing subsequent hooks

#### Scenario: Cross-platform command execution
- **WHEN** executing a command on Windows
- **THEN** the system uses the platform-appropriate shell (cmd.exe or PowerShell)

### Requirement: Prompt handler output

The system SHALL output prompt handler content for the calling AI agent to execute.

#### Scenario: Prompt handler
- **WHEN** a hook has `handler.type: "prompt"` and `handler.file: "hooks/sync.md"`
- **THEN** the system reads the file relative to the plugin directory
- **AND** performs template variable substitution
- **AND** includes the rendered content in the `pending` array of the hook result

#### Scenario: Prompt file not found
- **WHEN** a hook references `handler.file: "hooks/missing.md"` and the file does not exist
- **THEN** the system reports an error identifying the missing file

### Requirement: Both handler execution

The system SHALL execute `both` type handlers by running the command first, then including the prompt with command output.

#### Scenario: Both handler succeeds
- **WHEN** a hook has `handler.type: "both"`
- **THEN** the system first executes `handler.run` as a command
- **AND** then reads `handler.file` as a prompt template
- **AND** injects command stdout into the prompt context as `{{command_output}}`
- **AND** includes the rendered prompt in the `pending` array

#### Scenario: Command part fails in both handler
- **WHEN** a `both` handler's command fails and `ignore_failure` is false
- **THEN** the system halts and does NOT output the prompt part

### Requirement: Environment variable injection

The system SHALL inject context variables into command handlers as environment variables.

#### Scenario: Standard variables available
- **WHEN** a command handler executes during `archive.post`
- **THEN** the following environment variables SHALL be set:
  - `OPENSPEC_CHANGE_NAME` — the change name
  - `OPENSPEC_CHANGE_DIR` — absolute path to the change directory
  - `OPENSPEC_SCHEMA` — the schema name
  - `OPENSPEC_PROJECT_ROOT` — absolute path to the project root
  - `OPENSPEC_PHASE` — current phase (propose, apply, archive)
  - `OPENSPEC_HOOK_POINT` — the hook point being executed (e.g., archive.post)

#### Scenario: Archive-specific variables
- **WHEN** a command handler executes during `archive.post`
- **THEN** `OPENSPEC_ARCHIVE_DIR` SHALL be set to the archive destination path

### Requirement: Template variable substitution in prompts

The system SHALL replace `{{variable}}` placeholders in prompt files with context values.

#### Scenario: Standard variables substituted
- **WHEN** a prompt file contains `{{change_name}}`
- **THEN** the system replaces it with the actual change name

#### Scenario: Plugin config variables substituted
- **WHEN** a prompt file contains `{{plugin.config.obsidian.vault}}`
- **THEN** the system replaces it with the plugin's config value from `config.yaml`

#### Scenario: Unknown variable
- **WHEN** a prompt file contains `{{unknown_var}}`
- **THEN** the system leaves it as-is and logs a warning

### Requirement: Hook result structure

The system SHALL return a structured result from hook execution.

#### Scenario: Result contains executed and pending arrays
- **WHEN** hooks complete execution
- **THEN** the result SHALL contain:
  - `executed` array — command handlers that ran, with id, type, status, output
  - `pending` array — prompt handlers to be executed by the AI agent, with id, type, prompt content
