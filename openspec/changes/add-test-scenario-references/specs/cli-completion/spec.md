## MODIFIED Requirements

### Requirement: Completion Generation

The completion command SHALL generate completion scripts for all supported shells on demand.

#### Scenario: Generating Zsh completion

- **WHEN** user executes `openspec completion generate zsh`
- **THEN** output a complete Zsh completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, coverage, completion
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
