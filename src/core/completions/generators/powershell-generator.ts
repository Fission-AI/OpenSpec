import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';

/**
 * Generates PowerShell completion scripts for the OpenSpec CLI.
 * Uses Register-ArgumentCompleter for command completion.
 */
export class PowerShellGenerator implements CompletionGenerator {
  readonly shell = 'powershell' as const;

  /**
   * Generate a PowerShell completion script
   *
   * @param commands - Command definitions to generate completions for
   * @returns PowerShell completion script as a string
   */
  generate(commands: CommandDefinition[]): string {
    const script: string[] = [];

    // Header comment
    script.push('# PowerShell completion script for OpenSpec CLI');
    script.push('# Auto-generated - do not edit manually');
    script.push('');

    // Helper functions for dynamic completions
    script.push(...this.generateDynamicCompletionHelpers());

    // Main completion scriptblock
    script.push('$openspecCompleter = {');
    script.push('    param($wordToComplete, $commandAst, $cursorPosition)');
    script.push('');
    script.push('    $tokens = $commandAst.ToString() -split "\\s+"');
    script.push('    $commandCount = ($tokens | Measure-Object).Count');
    script.push('');

    // Top-level command completion
    script.push('    # Top-level commands');
    script.push('    if ($commandCount -eq 1 -or ($commandCount -eq 2 -and $wordToComplete)) {');
    script.push('        $commands = @(');
    for (const cmd of commands) {
      script.push(`            @{Name="${cmd.name}"; Description="${this.escapeDescription(cmd.description)}"},`);
    }
    script.push('        )');
    script.push('        $commands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {');
    script.push('            [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, "ParameterValue", $_.Description)');
    script.push('        }');
    script.push('        return');
    script.push('    }');
    script.push('');

    // Command-specific completions
    script.push('    $command = $tokens[1]');
    script.push('');
    script.push('    switch ($command) {');

    for (const cmd of commands) {
      script.push(`        "${cmd.name}" {`);
      script.push(...this.generateCommandCase(cmd, '            '));
      script.push('        }');
    }

    script.push('    }');
    script.push('}');
    script.push('');

    // Register the completer
    script.push('Register-ArgumentCompleter -CommandName openspec -ScriptBlock $openspecCompleter');
    script.push('');

    return script.join('\n');
  }

  /**
   * Generate completion case for a command
   */
  private generateCommandCase(cmd: CommandDefinition, indent: string): string[] {
    const lines: string[] = [];

    if (cmd.subcommands && cmd.subcommands.length > 0) {
      // Handle subcommands
      lines.push(`${indent}if ($commandCount -eq 2 -or ($commandCount -eq 3 -and $wordToComplete)) {`);
      lines.push(`${indent}    $subcommands = @(`);
      for (const subcmd of cmd.subcommands) {
        lines.push(`${indent}        @{Name="${subcmd.name}"; Description="${this.escapeDescription(subcmd.description)}"},`);
      }
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
   * Generate dynamic completion helper functions
   */
  private generateDynamicCompletionHelpers(): string[] {
    const lines: string[] = [];

    lines.push('# Dynamic completion helpers');
    lines.push('');

    // Helper for change IDs
    lines.push('function Get-OpenSpecChanges {');
    lines.push('    $output = openspec __complete changes 2>$null');
    lines.push('    if ($output) {');
    lines.push('        $output | ForEach-Object {');
    lines.push('            ($_ -split "\\t")[0]');
    lines.push('        }');
    lines.push('    }');
    lines.push('}');
    lines.push('');

    // Helper for spec IDs
    lines.push('function Get-OpenSpecSpecs {');
    lines.push('    $output = openspec __complete specs 2>$null');
    lines.push('    if ($output) {');
    lines.push('        $output | ForEach-Object {');
    lines.push('            ($_ -split "\\t")[0]');
    lines.push('        }');
    lines.push('    }');
    lines.push('}');
    lines.push('');

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
