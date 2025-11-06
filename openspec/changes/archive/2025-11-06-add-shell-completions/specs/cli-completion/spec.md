# CLI Completion Specification

## Purpose

The `openspec completion` command SHALL provide shell completion functionality for all OpenSpec CLI commands, flags, and dynamic values (change IDs, spec IDs), with support for Zsh (including Oh My Zsh) and a scalable architecture ready for future shells (bash, fish, PowerShell). The completion system SHALL integrate with Zsh's native completion behavior rather than attempting to customize the user experience.

## ADDED Requirements

### Requirement: Native Shell Behavior Integration

The completion system SHALL respect and integrate with Zsh's native completion patterns and user interaction model.

#### Scenario: Zsh native completion

- **WHEN** generating Zsh completion scripts
- **THEN** use Zsh completion system with `_arguments`, `_describe`, and `compadd`
- **AND** completions SHALL trigger on single TAB (standard Zsh behavior)
- **AND** display as an interactive menu that users navigate with TAB/arrow keys
- **AND** support Oh My Zsh's enhanced menu styling automatically

#### Scenario: No custom UX patterns

- **WHEN** implementing Zsh completion
- **THEN** do NOT attempt to customize completion trigger behavior
- **AND** do NOT override Zsh-specific navigation patterns
- **AND** ensure completions feel native to experienced Zsh users

### Requirement: Command Structure

The completion command SHALL follow a subcommand pattern for generating and managing completion scripts.

#### Scenario: Available subcommands

- **WHEN** user executes `openspec completion --help`
- **THEN** display available subcommands:
  - `zsh` - Generate Zsh completion script
  - `install [shell]` - Install completion for Zsh (auto-detects or requires explicit shell)
  - `uninstall [shell]` - Remove completion for Zsh (auto-detects or requires explicit shell)

### Requirement: Shell Detection

The completion system SHALL automatically detect the user's current shell environment.

#### Scenario: Detecting Zsh from environment

- **WHEN** no shell is explicitly specified
- **THEN** read the `$SHELL` environment variable
- **AND** extract the shell name from the path (e.g., `/bin/zsh` → `zsh`)
- **AND** validate the shell is `zsh`
- **AND** throw an error if the shell is not `zsh`, with message indicating only Zsh is currently supported

#### Scenario: Non-Zsh shell detection

- **WHEN** shell path indicates bash, fish, powershell, or other non-Zsh shell
- **THEN** throw error: "Shell '<name>' is not supported yet. Currently supported: zsh"

### Requirement: Completion Generation

The completion command SHALL generate Zsh completion scripts on demand.

#### Scenario: Generating Zsh completion

- **WHEN** user executes `openspec completion zsh`
- **THEN** output a complete Zsh completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, completion
- **AND** include all command-specific flags and options
- **AND** use Zsh's `_arguments` and `_describe` built-in functions
- **AND** support dynamic completion for change and spec IDs

### Requirement: Dynamic Completions

The completion system SHALL provide context-aware dynamic completions for project-specific values.

#### Scenario: Completing change IDs

- **WHEN** completing arguments for commands that accept change names (show, validate, archive)
- **THEN** discover active changes from `openspec/changes/` directory
- **AND** exclude archived changes in `openspec/changes/archive/`
- **AND** return change IDs as completion suggestions
- **AND** only provide suggestions when inside an OpenSpec-enabled project

#### Scenario: Completing spec IDs

- **WHEN** completing arguments for commands that accept spec names (show, validate)
- **THEN** discover specs from `openspec/specs/` directory
- **AND** return spec IDs as completion suggestions
- **AND** only provide suggestions when inside an OpenSpec-enabled project

#### Scenario: Completion caching

- **WHEN** dynamic completions are requested
- **THEN** cache discovered change and spec IDs for 2 seconds
- **AND** reuse cached values for subsequent requests within cache window
- **AND** automatically refresh cache after expiration

#### Scenario: Project detection

- **WHEN** user requests completions outside an OpenSpec project
- **THEN** skip dynamic change/spec ID completions
- **AND** only suggest static commands and flags

### Requirement: Installation Automation

The completion command SHALL automatically install completion scripts into shell configuration files.

#### Scenario: Installing for Oh My Zsh

- **WHEN** user executes `openspec completion install zsh`
- **THEN** detect if Oh My Zsh is installed by checking for `$ZSH` environment variable or `~/.oh-my-zsh/` directory
- **AND** create custom completions directory at `~/.oh-my-zsh/custom/completions/` if it doesn't exist
- **AND** write completion script to `~/.oh-my-zsh/custom/completions/_openspec`
- **AND** ensure `~/.oh-my-zsh/custom/completions` is in `$fpath` by updating `~/.zshrc` if needed
- **AND** display success message with instruction to run `exec zsh` or restart terminal

#### Scenario: Installing for standard Zsh

- **WHEN** user executes `openspec completion install zsh` and Oh My Zsh is not detected
- **THEN** create completions directory at `~/.zsh/completions/` if it doesn't exist
- **AND** write completion script to `~/.zsh/completions/_openspec`
- **AND** add `fpath=(~/.zsh/completions $fpath)` to `~/.zshrc` if not already present
- **AND** add `autoload -Uz compinit && compinit` to `~/.zshrc` if not already present
- **AND** display success message with instruction to run `exec zsh` or restart terminal

#### Scenario: Auto-detecting Zsh for installation

- **WHEN** user executes `openspec completion install` without specifying a shell
- **THEN** detect current shell using shell detection logic
- **AND** install completion if detected shell is Zsh
- **AND** throw error if detected shell is not Zsh
- **AND** display which shell was detected

#### Scenario: Already installed

- **WHEN** completion is already installed for the target shell
- **THEN** display message indicating completion is already installed
- **AND** offer to reinstall/update by overwriting existing files
- **AND** exit with code 0

### Requirement: Uninstallation

The completion command SHALL remove installed completion scripts and configuration.

#### Scenario: Uninstalling Oh My Zsh completion

- **WHEN** user executes `openspec completion uninstall zsh`
- **THEN** remove `~/.oh-my-zsh/custom/completions/_openspec` if Oh My Zsh is detected
- **AND** remove `~/.zsh/completions/_openspec` if standard Zsh setup is detected
- **AND** optionally remove fpath modifications from `~/.zshrc` (with confirmation)
- **AND** display success message

#### Scenario: Auto-detecting Zsh for uninstallation

- **WHEN** user executes `openspec completion uninstall` without specifying a shell
- **THEN** detect current shell and uninstall completion if shell is Zsh
- **AND** throw error if detected shell is not Zsh

#### Scenario: Not installed

- **WHEN** attempting to uninstall completion that isn't installed
- **THEN** display message indicating completion is not installed
- **AND** exit with code 0

### Requirement: Architecture Patterns

The completion implementation SHALL follow clean architecture principles with TypeScript best practices.

#### Scenario: Shell-specific generators

- **WHEN** implementing completion generators
- **THEN** create `ZshCompletionGenerator` class for Zsh
- **AND** implement a common `CompletionGenerator` interface with methods:
  - `generate(): string` - Returns complete shell script
  - `getInstallPath(): string` - Returns target installation path
  - `getConfigFile(): string` - Returns shell configuration file path
- **AND** design interface to be extensible for future shells (bash, fish, powershell)

#### Scenario: Dynamic completion providers

- **WHEN** implementing dynamic completions
- **THEN** create a `CompletionProvider` class that encapsulates project discovery logic
- **AND** implement methods:
  - `getChangeIds(): Promise<string[]>` - Discovers active change IDs
  - `getSpecIds(): Promise<string[]>` - Discovers spec IDs
  - `isOpenSpecProject(): boolean` - Checks if current directory is OpenSpec-enabled
- **AND** implement caching with 2-second TTL using class properties

#### Scenario: Command registry

- **WHEN** defining completable commands
- **THEN** create a centralized `CommandDefinition` type with properties:
  - `name: string` - Command name
  - `description: string` - Help text
  - `flags: FlagDefinition[]` - Available flags
  - `acceptsChangeId: boolean` - Whether command takes change ID argument
  - `acceptsSpecId: boolean` - Whether command takes spec ID argument
  - `subcommands?: CommandDefinition[]` - Nested subcommands
- **AND** export a `COMMAND_REGISTRY` constant with all command definitions
- **AND** generators consume this registry to ensure consistency

#### Scenario: Type-safe shell detection

- **WHEN** implementing shell detection
- **THEN** define a `SupportedShell` type as literal type: `'zsh'`
- **AND** implement `detectShell()` function that returns 'zsh' or throws error
- **AND** design type to be extensible (e.g., future: `'bash' | 'zsh' | 'fish' | 'powershell'`)

### Requirement: Error Handling

The completion command SHALL provide clear error messages for common failure scenarios.

#### Scenario: Unsupported shell

- **WHEN** user requests completion for unsupported shell (bash, fish, powershell, etc.)
- **THEN** display error message: "Shell '<name>' is not supported yet. Currently supported: zsh"
- **AND** exit with code 1

#### Scenario: Permission errors during installation

- **WHEN** installation fails due to file permission issues
- **THEN** display clear error message indicating permission problem
- **AND** suggest using appropriate permissions or alternative installation method
- **AND** exit with code 1

#### Scenario: Missing shell configuration directory

- **WHEN** expected shell configuration directory doesn't exist
- **THEN** create the directory automatically (with user notification)
- **AND** proceed with installation

#### Scenario: Shell not detected

- **WHEN** `openspec completion install` cannot detect current shell or detects non-Zsh shell
- **THEN** display error: "Could not detect Zsh. Please specify explicitly: openspec completion install zsh"
- **AND** exit with code 1

### Requirement: Output Format

The completion command SHALL provide machine-parseable and human-readable output.

#### Scenario: Script generation output

- **WHEN** generating completion script to stdout
- **THEN** output only the completion script content (no extra messages)
- **AND** allow redirection to files: `openspec completion zsh > /path/to/_openspec`

#### Scenario: Installation success output

- **WHEN** installation completes successfully
- **THEN** display formatted success message with:
  - Checkmark indicator
  - Installation location
  - Next steps (shell reload instructions)
- **AND** use colors when terminal supports it (unless `--no-color` is set)

#### Scenario: Verbose installation output

- **WHEN** user provides `--verbose` flag during installation
- **THEN** display detailed steps:
  - Shell detection result
  - Target file paths
  - Configuration modifications
  - File creation confirmations

### Requirement: Testing Support

The completion implementation SHALL be testable with unit and integration tests.

#### Scenario: Mock shell environment

- **WHEN** writing tests for shell detection
- **THEN** allow overriding `$SHELL` environment variable
- **AND** use dependency injection for file system operations

#### Scenario: Generator output verification

- **WHEN** testing completion generators
- **THEN** verify generated scripts contain expected patterns
- **AND** test that command registry is properly consumed
- **AND** ensure dynamic completion placeholders are present

#### Scenario: Installation simulation

- **WHEN** testing installation logic
- **THEN** use temporary test directories instead of actual home directories
- **AND** verify file creation without modifying real shell configurations
- **AND** test path resolution logic independently

## Not in Scope

The following shells are **architecturally documented but not implemented** in this proposal. They will be added in future proposals:

- **Bash completion** - Will use bash-completion framework with `_init_completion`, `compgen`, and `COMPREPLY`
- **Fish completion** - Will use Fish's declarative `complete -c` syntax
- **PowerShell completion** - Will use `Register-ArgumentCompleter` with completion result objects

The plugin-based architecture (CompletionGenerator interface, command registry, dynamic providers) is designed to make adding these shells straightforward in follow-up changes.

## Why

Shell completions are essential for professional CLI tools and significantly improve developer experience by reducing friction, errors, and cognitive load during daily workflows.
