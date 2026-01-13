import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';
import { POWERSHELL_DYNAMIC_HELPERS } from '../templates/powershell-templates.js';

/**
 * Generates PowerShell completion scripts for the OpenSpec CLI.
 * Uses Register-ArgumentCompleter for command completion.
 */
export class PowerShellGenerator implements CompletionGenerator {
  readonly shell = 'powershell' as const;

  private stripTrailingCommaFromLastLine(lines: string[]): void {
    if (lines.length === 0) return;
    lines[lines.length - 1] = lines[lines.length - 1].replace(/,\s*$/, '');
  }

  /**
   * Generate a PowerShell completion script
   *
   * @param commands - Command definitions to generate completions for
   * @returns PowerShell completion script as a string
   */
  generate(commands: CommandDefinition[]): string {
    // Build top-level commands using push() for loop clarity
    const commandLines: string[] = [];
    for (const cmd of commands) {
      commandLines.push(`            @{Name="${cmd.name}"; Description="${this.escapeDescription(cmd.description)}"},`);
    }
    this.stripTrailingCommaFromLastLine(commandLines);
    const topLevelCommands = commandLines.join('\n');

    // Build command cases using push() for loop clarity
    const commandCaseLines: string[] = [];
    for (const cmd of commands) {
      commandCaseLines.push(`        "${cmd.name}" {`);
      commandCaseLines.push(...this.generateCommandCase(cmd, '            '));
      commandCaseLines.push('        }');
    }
    const commandCases = commandCaseLines.join('\n');

    // Dynamic completion helpers from template
    const helpers = POWERSHELL_DYNAMIC_HELPERS;

    // Assemble final script with template literal
    return `# PowerShell completion script for OpenSpec CLI
# Auto-generated - do not edit manually

${helpers}
$openspecCompleter = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $tokens = $commandAst.ToString() -split "\\s+"
    $commandCount = ($tokens | Measure-Object).Count

    # Top-level commands
    if ($commandCount -eq 1 -or ($commandCount -eq 2 -and $wordToComplete)) {
        $commands = @(
${topLevelCommands}
        )
        $commands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, "ParameterValue", $_.Description)
        }
        return
    }

    $command = $tokens[1]

    switch ($command) {
${commandCases}
    }
}

Register-ArgumentCompleter -CommandName openspec -ScriptBlock $openspecCompleter
`;
  }

  /**
   * Generate completion case for a command
   */
  private generateCommandCase(cmd: CommandDefinition, indent: string): string[] {
    const lines: string[] = [];

    if (cmd.subcommands && cmd.subcommands.length > 0) {
      // First, check if user is typing a flag for the parent command
      if (cmd.flags.length > 0) {
        lines.push(`${indent}if ($wordToComplete -like "-*") {`);
        lines.push(`${indent}    $flags = @(`);
        for (const flag of cmd.flags) {
          const longFlag = `--${flag.name}`;
          const shortFlag = flag.short ? `-${flag.short}` : undefined;
          if (shortFlag) {
            lines.push(`${indent}        @{Name="${longFlag}"; Description="${this.escapeDescription(flag.description)}"},`);
            lines.push(`${indent}        @{Name="${shortFlag}"; Description="${this.escapeDescription(flag.description)}"},`);
          } else {
            lines.push(`${indent}        @{Name="${longFlag}"; Description="${this.escapeDescription(flag.description)}"},`);
          }
        }
        this.stripTrailingCommaFromLastLine(lines);
        lines.push(`${indent}    )`);
        lines.push(`${indent}    $flags | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {`);
        lines.push(`${indent}        [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, "ParameterName", $_.Description)`);
        lines.push(`${indent}    }`);
        lines.push(`${indent}    return`);
        lines.push(`${indent}}`);
        lines.push('');
      }

      // Handle subcommands
      lines.push(`${indent}if ($commandCount -eq 2 -or ($commandCount -eq 3 -and $wordToComplete)) {`);
      lines.push(`${indent}    $subcommands = @(`);
      for (const subcmd of cmd.subcommands) {
        lines.push(`${indent}        @{Name="${subcmd.name}"; Description="${this.escapeDescription(subcmd.description)}"},`);
      }
      this.stripTrailingCommaFromLastLine(lines);
      lines.push(`${indent}    )`);
      lines.push(`${indent}    $subcommands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {`);
      lines.push(`${indent}        [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, "ParameterValue", $_.Description)`);
      lines.push(`${indent}    }`);
      lines.push(`${indent}    return`);
      lines.push(`${indent}}`);
      lines.push('');
      lines.push(`${indent}$subcommand = if ($commandCount -gt 2) { $tokens[2] } else { "" }`);
      lines.push(`${indent}switch ($subcommand) {`);

      for (const subcmd of cmd.subcommands) {
        lines.push(`${indent}    "${subcmd.name}" {`);
        lines.push(...this.generateArgumentCompletion(subcmd, indent + '        '));
        lines.push(`${indent}    }`);
      }

      lines.push(`${indent}}`);
    } else {
      // No subcommands
      lines.push(...this.generateArgumentCompletion(cmd, indent));
    }

    return lines;
  }

  /**
   * Generate argument completion (flags and positional)
   */
  private generateArgumentCompletion(cmd: CommandDefinition, indent: string): string[] {
    const lines: string[] = [];

    // Flag completion
    if (cmd.flags.length > 0) {
      lines.push(`${indent}if ($wordToComplete -like "-*") {`);
      lines.push(`${indent}    $flags = @(`);
      for (const flag of cmd.flags) {
        const longFlag = `--${flag.name}`;
        const shortFlag = flag.short ? `-${flag.short}` : undefined;
        if (shortFlag) {
          lines.push(`${indent}        @{Name="${longFlag}"; Description="${this.escapeDescription(flag.description)}"},`);
          lines.push(`${indent}        @{Name="${shortFlag}"; Description="${this.escapeDescription(flag.description)}"},`);
        } else {
          lines.push(`${indent}        @{Name="${longFlag}"; Description="${this.escapeDescription(flag.description)}"},`);
        }
      }
      this.stripTrailingCommaFromLastLine(lines);
      lines.push(`${indent}    )`);
      lines.push(`${indent}    $flags | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {`);
      lines.push(`${indent}        [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, "ParameterName", $_.Description)`);
      lines.push(`${indent}    }`);
      lines.push(`${indent}    return`);
      lines.push(`${indent}}`);
      lines.push('');
    }

    // Positional completion
    if (cmd.acceptsPositional) {
      lines.push(...this.generatePositionalCompletion(cmd.positionalType, indent));
    }

    return lines;
  }

  /**
   * Generate positional argument completion
   */
  private generatePositionalCompletion(positionalType: string | undefined, indent: string): string[] {
    const lines: string[] = [];

    switch (positionalType) {
      case 'change-id':
        lines.push(`${indent}Get-OpenSpecChanges | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {`);
        lines.push(`${indent}    [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", "Change: $_")`);
        lines.push(`${indent}}`);
        break;
      case 'spec-id':
        lines.push(`${indent}Get-OpenSpecSpecs | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {`);
        lines.push(`${indent}    [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", "Spec: $_")`);
        lines.push(`${indent}}`);
        break;
      case 'change-or-spec-id':
        lines.push(`${indent}$items = @(Get-OpenSpecChanges) + @(Get-OpenSpecSpecs)`);
        lines.push(`${indent}$items | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {`);
        lines.push(`${indent}    [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", $_)`);
        lines.push(`${indent}}`);
        break;
      case 'shell':
        lines.push(`${indent}$shells = @("zsh", "bash", "fish", "powershell")`);
        lines.push(`${indent}$shells | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {`);
        lines.push(`${indent}    [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", "Shell: $_")`);
        lines.push(`${indent}}`);
        break;
      case 'path':
        // PowerShell handles file path completion automatically
        break;
    }

    return lines;
  }

  /**
   * Escape description text for PowerShell
   */
  private escapeDescription(description: string): string {
    return description
      .replace(/`/g, '``')     // Backticks (escape sequences)
      .replace(/\$/g, '`$')    // Dollar signs (prevents $())
      .replace(/"/g, '""');    // Double quotes
  }
}
