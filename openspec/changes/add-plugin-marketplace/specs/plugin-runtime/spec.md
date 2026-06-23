## Purpose

Define how an active plugin is surfaced as a command and how OpenSpec executes it: a single reserved namespace per plugin, invoked by delegating to the plugin's own executable as a child process.

## ADDED Requirements

### Requirement: Namespaced plugin command surface
Each active, compatible plugin SHALL be surfaced as exactly one reserved top-level command namespace.

#### Scenario: Namespace registered
- **WHEN** a compatible plugin declares namespace `lore`
- **THEN** `openspec lore` SHALL be available as a top-level command
- **AND** all the plugin's subcommands SHALL be addressed as `openspec lore <subcommand>`

#### Scenario: No bare top-level verbs
- **WHEN** a plugin is registered
- **THEN** OpenSpec SHALL NOT expose any plugin subcommand as a bare top-level verb outside its namespace

### Requirement: Command delegation to the plugin executable
Invoking a plugin namespace SHALL delegate execution to the plugin's declared executable as a child process.

#### Scenario: Arguments passed through
- **WHEN** a user runs `openspec lore generate --domains api`
- **THEN** OpenSpec SHALL invoke the plugin executable with `generate --domains api`
- **AND** SHALL pass all arguments after the namespace verbatim

#### Scenario: Streams inherited
- **WHEN** a delegated plugin command runs
- **THEN** the child process SHALL inherit standard input, output, and error streams

#### Scenario: Exit code propagated
- **WHEN** the delegated plugin process exits
- **THEN** OpenSpec SHALL exit with the child process's exit code

#### Scenario: Help forwarded
- **WHEN** a user runs `openspec lore --help`
- **THEN** OpenSpec SHALL forward the help request to the plugin executable

### Requirement: Delegation isolates the OpenSpec process
Plugin execution SHALL NOT load plugin code into the OpenSpec process or alter OpenSpec's dependency requirements.

#### Scenario: Heavy plugin dependencies stay isolated
- **WHEN** a plugin with heavy dependencies is invoked
- **THEN** those dependencies SHALL load only in the child process
- **AND** SHALL NOT be required for any core OpenSpec command

### Requirement: Robust spawn failure handling
Failures to locate or launch the plugin executable SHALL produce a clear error and a non-zero exit code.

#### Scenario: Executable not found
- **WHEN** the plugin's declared executable cannot be located
- **THEN** OpenSpec SHALL report that the plugin executable is missing and how to install it
- **AND** SHALL exit with a non-zero code

#### Scenario: Unknown or incompatible namespace
- **WHEN** a user invokes a namespace that is not registered (unknown or incompatible plugin)
- **THEN** OpenSpec SHALL report the unknown command with guidance
- **AND** SHALL NOT emit a stack trace

### Requirement: Cross-platform executable launching
Plugin executables SHALL launch correctly across platforms without invoking a shell.

#### Scenario: Launching on Windows
- **WHEN** OpenSpec launches a plugin executable on Windows
- **THEN** it SHALL resolve platform executable shims and handle spaces in paths
- **AND** SHALL spawn without shell interpolation of arguments
