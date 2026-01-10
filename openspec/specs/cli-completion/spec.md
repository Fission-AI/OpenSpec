# cli-completion Specification

## Purpose
Provide shell completion scripts for the OpenSpec CLI, enabling tab-completion for commands, flags, and dynamic values (change IDs, spec IDs) across multiple shells. Supports Zsh, Bash, Fish, and PowerShell.
## Requirements
### Requirement: Native Shell Behavior Integration

The completion system SHALL respect and integrate with each supported shell's native completion patterns and user interaction model.

#### Scenario: Zsh native completion

- **WHEN** generating Zsh completion scripts
- **THEN** use Zsh completion system with `_arguments`, `_describe`, and `compadd`
- **AND** completions SHALL trigger on single TAB (standard Zsh behavior)
- **AND** display as an interactive menu that users navigate with TAB/arrow keys
- **AND** support Oh My Zsh's enhanced menu styling automatically

#### Scenario: Bash native completion

- **WHEN** generating Bash completion scripts
- **THEN** use Bash completion with `complete` builtin and `COMPREPLY` array
- **AND** completions SHALL trigger on double TAB (standard Bash behavior)
- **AND** display as space-separated list or column format
- **AND** support both bash-completion v1 and v2 patterns

#### Scenario: Fish native completion

- **WHEN** generating Fish completion scripts
- **THEN** use Fish's `complete` command with conditions
- **AND** completions SHALL trigger on single TAB with auto-suggestion preview
- **AND** display with Fish's native coloring and description alignment
- **AND** leverage Fish's built-in caching automatically

#### Scenario: PowerShell native completion

- **WHEN** generating PowerShell completion scripts
- **THEN** use `Register-ArgumentCompleter` with scriptblock
- **AND** completions SHALL trigger on TAB with cycling behavior
- **AND** display with PowerShell's native completion UI
- **AND** support both Windows PowerShell 5.1 and PowerShell Core 7+

#### Scenario: No custom UX patterns

- **WHEN** implementing completion for any shell
- **THEN** do NOT attempt to customize completion trigger behavior
- **AND** do NOT override shell-specific navigation patterns
- **AND** ensure completions feel native to experienced users of that shell

### Requirement: Command Structure

The completion command SHALL follow a subcommand pattern for generating and managing completion scripts.

#### Scenario: Available subcommands

- **WHEN** user executes `openspec completion --help`
- **THEN** display available subcommands:
  - `generate [shell]` - Generate completion script for a shell (outputs to stdout)
  - `install [shell]` - Install completion for Zsh (auto-detects or requires explicit shell)
  - `uninstall [shell]` - Remove completion for Zsh (auto-detects or requires explicit shell)

### Requirement: Shell Detection

The completion system SHALL automatically detect the user's current shell environment.

#### Scenario: Detecting Zsh from environment

- **WHEN** no shell is explicitly specified
- **THEN** read the `$SHELL` environment variable
- **AND** extract the shell name from the path (e.g., `/bin/zsh` → `zsh`)
- **AND** validate the shell is one of: `zsh`, `bash`, `fish`, `powershell`
- **AND** throw an error if the shell is not supported

#### Scenario: Detecting Bash from environment

- **WHEN** `$SHELL` contains `bash` in the path
- **THEN** detect shell as `bash`
- **AND** proceed with bash-specific completion logic

#### Scenario: Detecting Fish from environment

- **WHEN** `$SHELL` contains `fish` in the path
- **THEN** detect shell as `fish`
- **AND** proceed with fish-specific completion logic

#### Scenario: Detecting PowerShell from environment

- **WHEN** `$PSModulePath` environment variable is present
- **THEN** detect shell as `powershell`
- **AND** proceed with PowerShell-specific completion logic

#### Scenario: Unsupported shell detection

- **WHEN** shell path indicates an unsupported shell
- **THEN** throw error: "Shell '<name>' is not supported. Supported shells: zsh, bash, fish, powershell"

### Requirement: Completion Generation

The completion command SHALL generate completion scripts for all supported shells on demand.

#### Scenario: Generating Zsh completion

- **WHEN** user executes `openspec completion generate zsh`
- **THEN** output a complete Zsh completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, completion
- **AND** include all command-specific flags and options
- **AND** use Zsh's `_arguments` and `_describe` built-in functions
- **AND** support dynamic completion for change and spec IDs

#### Scenario: Generating Bash completion

- **WHEN** user executes `openspec completion generate bash`
- **THEN** output a complete Bash completion script to stdout
- **AND** include completions for all commands and subcommands
- **AND** use `complete -F` with custom completion function
- **AND** populate `COMPREPLY` with appropriate suggestions
- **AND** support dynamic completion for change and spec IDs via `openspec __complete`

#### Scenario: Generating Fish completion

- **WHEN** user executes `openspec completion generate fish`
- **THEN** output a complete Fish completion script to stdout
- **AND** use `complete -c openspec` with conditions
- **AND** include command-specific completions with `--condition` predicates
- **AND** support dynamic completion for change and spec IDs via `openspec __complete`
- **AND** include descriptions for each completion option

#### Scenario: Generating PowerShell completion

- **WHEN** user executes `openspec completion generate powershell`
- **THEN** output a complete PowerShell completion script to stdout
- **AND** use `Register-ArgumentCompleter -CommandName openspec`
- **AND** implement scriptblock that handles command context
- **AND** support dynamic completion for change and spec IDs via `openspec __complete`
- **AND** return `[System.Management.Automation.CompletionResult]` objects

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

The completion command SHALL automatically install completion scripts into shell configuration files for all supported shells.

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

#### Scenario: Installing for Bash with bash-completion

- **WHEN** user executes `openspec completion install bash`
- **THEN** detect if bash-completion is installed by checking for `/usr/share/bash-completion` or `/etc/bash_completion.d`
- **AND** if bash-completion is available, write to `/etc/bash_completion.d/openspec` (with sudo) or `~/.local/share/bash-completion/completions/openspec`
- **AND** if bash-completion is not available, write to `~/.bash_completion.d/openspec` and source it from `~/.bashrc`
- **AND** add sourcing line to `~/.bashrc` using marker-based updates if needed
- **AND** display success message with instruction to run `exec bash` or restart terminal

#### Scenario: Installing for Fish

- **WHEN** user executes `openspec completion install fish`
- **THEN** create Fish completions directory at `~/.config/fish/completions/` if it doesn't exist
- **AND** write completion script to `~/.config/fish/completions/openspec.fish`
- **AND** Fish automatically loads completions from this directory (no config file modification needed)
- **AND** display success message indicating completions are immediately available

#### Scenario: Installing for PowerShell

- **WHEN** user executes `openspec completion install powershell`
- **THEN** detect PowerShell profile location via `$PROFILE` environment variable or default paths
- **AND** create profile directory if it doesn't exist
- **AND** add completion script import to profile using marker-based updates
- **AND** write completion script to PowerShell modules directory or alongside profile
- **AND** display success message with instruction to restart PowerShell or run `. $PROFILE`

#### Scenario: Auto-detecting shell for installation

- **WHEN** user executes `openspec completion install` without specifying a shell
- **THEN** detect current shell using shell detection logic
- **AND** install completion for the detected shell (zsh, bash, fish, or powershell)
- **AND** display which shell was detected

#### Scenario: Already installed

- **WHEN** completion is already installed for the target shell
- **THEN** display message indicating completion is already installed
- **AND** offer to reinstall/update by overwriting existing files
- **AND** exit with code 0

### Requirement: Uninstallation

The completion command SHALL remove installed completion scripts and configuration for all supported shells.

#### Scenario: Uninstalling Zsh completion

- **WHEN** user executes `openspec completion uninstall zsh`
- **THEN** prompt for confirmation before proceeding (unless `--yes` flag provided)
- **AND** if user declines, cancel uninstall and display "Uninstall cancelled."
- **AND** if user confirms, remove `~/.oh-my-zsh/custom/completions/_openspec` if Oh My Zsh is detected
- **AND** remove `~/.zsh/completions/_openspec` if standard Zsh setup is detected
- **AND** remove fpath modifications from `~/.zshrc` using marker-based removal
- **AND** display success message

#### Scenario: Uninstalling Bash completion

- **WHEN** user executes `openspec completion uninstall bash`
- **THEN** prompt for confirmation (unless `--yes` flag provided)
- **AND** if user confirms, remove completion file from bash-completion directory or `~/.bash_completion.d/`
- **AND** remove sourcing lines from `~/.bashrc` using marker-based removal
- **AND** display success message

#### Scenario: Uninstalling Fish completion

- **WHEN** user executes `openspec completion uninstall fish`
- **THEN** prompt for confirmation (unless `--yes` flag provided)
- **AND** if user confirms, remove `~/.config/fish/completions/openspec.fish`
- **AND** display success message (no config file modification needed)

#### Scenario: Uninstalling PowerShell completion

- **WHEN** user executes `openspec completion uninstall powershell`
- **THEN** prompt for confirmation (unless `--yes` flag provided)
- **AND** if user confirms, remove completion import from PowerShell profile using marker-based removal
- **AND** remove completion script file
- **AND** display success message

#### Scenario: Auto-detecting shell for uninstallation

- **WHEN** user executes `openspec completion uninstall` without specifying a shell
- **THEN** detect current shell and uninstall completion for that shell

#### Scenario: Not installed

- **WHEN** attempting to uninstall completion that isn't installed
- **THEN** display error message indicating completion is not installed
- **AND** exit with code 1

### Requirement: Architecture Patterns

The completion implementation SHALL follow clean architecture principles with TypeScript best practices, supporting multiple shells through a plugin-based pattern.

#### Scenario: Shell-specific generators

- **WHEN** implementing completion generators
- **THEN** create generator classes for each shell: `ZshGenerator`, `BashGenerator`, `FishGenerator`, `PowerShellGenerator`
- **AND** implement a common `CompletionGenerator` interface with method:
  - `generate(commands: CommandDefinition[]): string` - Returns complete shell script
- **AND** each generator handles shell-specific syntax, escaping, and patterns
- **AND** all generators consume the same `CommandDefinition[]` from the command registry

#### Scenario: Shell-specific installers

- **WHEN** implementing completion installers
- **THEN** create installer classes for each shell: `ZshInstaller`, `BashInstaller`, `FishInstaller`, `PowerShellInstaller`
- **AND** implement a common `CompletionInstaller` interface with methods:
  - `install(script: string): Promise<InstallationResult>` - Installs completion script
  - `uninstall(): Promise<{ success: boolean; message: string }>` - Removes completion
- **AND** each installer handles shell-specific paths, config files, and installation patterns

#### Scenario: Factory pattern for shell selection

- **WHEN** selecting shell-specific implementation
- **THEN** use `CompletionFactory` class with static methods:
  - `createGenerator(shell: SupportedShell): CompletionGenerator`
  - `createInstaller(shell: SupportedShell): CompletionInstaller`
- **AND** factory uses switch statements with TypeScript exhaustiveness checking
- **AND** adding new shell requires updating `SupportedShell` type and factory cases

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
  - `acceptsPositional: boolean` - Whether command takes positional arguments
  - `positionalType: string` - Type of positional (change-id, spec-id, path, shell)
  - `subcommands?: CommandDefinition[]` - Nested subcommands
- **AND** export a `COMMAND_REGISTRY` constant with all command definitions
- **AND** all generators consume this registry to ensure consistency across shells

#### Scenario: Type-safe shell detection

- **WHEN** implementing shell detection
- **THEN** define a `SupportedShell` type as literal type: `'zsh' | 'bash' | 'fish' | 'powershell'`
- **AND** implement `detectShell()` function in `src/utils/shell-detection.ts`
- **AND** return detected shell or throw error with supported shells list

### Requirement: Error Handling

The completion command SHALL provide clear error messages for common failure scenarios.

#### Scenario: Unsupported shell

- **WHEN** user requests completion for unsupported shell (e.g., ksh, csh, tcsh)
- **THEN** display error message: "Shell '<name>' is not supported yet. Currently supported: zsh, bash, fish, powershell"
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

- **WHEN** `openspec completion install` cannot detect current shell
- **THEN** display error: "Could not auto-detect shell. Please specify shell explicitly."
- **AND** display usage hint: "Usage: openspec completion <operation> [shell]"
- **AND** exit with code 1

### Requirement: Output Format

The completion command SHALL provide machine-parseable and human-readable output.

#### Scenario: Script generation output

- **WHEN** generating completion script to stdout
- **THEN** output only the completion script content (no extra messages)
- **AND** allow redirection to files: `openspec completion generate zsh > /path/to/_openspec`

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

The completion implementation SHALL be testable with unit and integration tests for all supported shells.

#### Scenario: Mock shell environment

- **WHEN** writing tests for shell detection
- **THEN** allow overriding `$SHELL` and `$PSModulePath` environment variables
- **AND** use dependency injection for file system operations
- **AND** test detection for all four shells independently

#### Scenario: Generator output verification

- **WHEN** testing completion generators
- **THEN** create test suite for each shell generator (zsh, bash, fish, powershell)
- **AND** verify generated scripts contain expected patterns for that shell
- **AND** test that command registry is properly consumed
- **AND** ensure dynamic completion placeholders are present
- **AND** verify shell-specific syntax and escaping

#### Scenario: Installer simulation

- **WHEN** testing installation logic
- **THEN** create test suite for each shell installer
- **AND** use temporary test directories instead of actual home directories
- **AND** verify file creation without modifying real shell configurations
- **AND** test path resolution logic independently
- **AND** mock file system operations to avoid side effects

#### Scenario: Cross-shell consistency

- **WHEN** testing completion behavior
- **THEN** verify all shells support the same commands and flags
- **AND** verify dynamic completions work consistently across shells
- **AND** ensure error messages are consistent across shells

