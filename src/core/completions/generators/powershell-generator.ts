import {
  CompletionGenerator,
  CommandDefinition,
  FlagDefinition,
  PositionalDefinition,
} from '../types.js';
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
        lines.push(...this.generateArgumentCompletion(subcmd, indent + '        ', 3));
        lines.push(`${indent}    }`);
      }

      lines.push(`${indent}}`);
    } else {
      // No subcommands
      lines.push(...this.generateArgumentCompletion(cmd, indent, 2));
    }

    return lines;
  }

  /**
   * Generate argument completion (flags and positional)
   */
  private generateArgumentCompletion(
    cmd: CommandDefinition,
    indent: string,
    firstPositionalTokenIndex: number
  ): string[] {
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
    if (cmd.positionals && cmd.positionals.length > 0) {
      lines.push(...this.generateIndexedPositionalCompletion(
        cmd.positionals,
        cmd.flags,
        firstPositionalTokenIndex,
        indent
      ));
    } else if (cmd.acceptsPositional) {
      lines.push(...this.generatePositionalCompletion(cmd.positionalType, indent));
    }

    return lines;
  }

  private generateIndexedPositionalCompletion(
    positionals: PositionalDefinition[],
    flags: FlagDefinition[],
    firstPositionalTokenIndex: number,
    indent: string
  ): string[] {
    const lines: string[] = [];
    const valueFlags = this.generateValueFlags(flags);

    if (valueFlags.length > 0) {
      const flagList = valueFlags.map((flag) => `"${flag}"`).join(', ');
      lines.push(`${indent}if (@(${flagList}) -contains $tokens[$commandCount - 2]) { return }`);
      lines.push('');
    }

    lines.push(`${indent}$positionalIndex = 0`);
    lines.push(`${indent}$skipNext = $false`);
    lines.push(`${indent}for ($i = ${firstPositionalTokenIndex}; $i -lt ($commandCount - 1); $i++) {`);
    lines.push(`${indent}    if ($skipNext) {`);
    lines.push(`${indent}        $skipNext = $false`);
    lines.push(`${indent}        continue`);
    lines.push(`${indent}    }`);
    lines.push(`${indent}    $token = $tokens[$i]`);

    if (valueFlags.length > 0) {
      const flagList = valueFlags.map((flag) => `"${flag}"`).join(', ');
      lines.push(`${indent}    if (@(${flagList}) -contains $token) {`);
      lines.push(`${indent}        $skipNext = $true`);
      lines.push(`${indent}        continue`);
      lines.push(`${indent}    }`);
      lines.push(`${indent}    if ($token -match "^(${valueFlags.map((flag) => this.escapeRegex(flag)).join('|')})=.*") { continue }`);
    }

    lines.push(`${indent}    if ($token -like "-*") { continue }`);
    lines.push(`${indent}    $positionalIndex++`);
    lines.push(`${indent}}`);
    lines.push('');
    lines.push(`${indent}switch ($positionalIndex) {`);

    for (const [index, positional] of positionals.entries()) {
      const completion = this.generatePositionalCompletion(positional.type, indent + '    ');
      if (completion.length === 0) continue;
      lines.push(`${indent}    ${index} {`);
      lines.push(...completion);
      lines.push(`${indent}    }`);
    }

    lines.push(`${indent}}`);

    return lines;
  }

  private generateValueFlags(flags: FlagDefinition[]): string[] {
    return flags
      .filter((flag) => flag.takesValue)
      .flatMap((flag) => [
        `--${flag.name}`,
        ...(flag.short ? [`-${flag.short}`] : []),
      ]);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      case 'schema-name':
        lines.push(`${indent}Get-OpenSpecSchemas | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {`);
        lines.push(`${indent}    [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", "Schema: $_")`);
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
