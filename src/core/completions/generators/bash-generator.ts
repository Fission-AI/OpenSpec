import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';

/**
 * Generates Bash completion scripts for the OpenSpec CLI.
 * Follows Bash completion conventions using complete builtin and COMPREPLY array.
 */
export class BashGenerator implements CompletionGenerator {
  readonly shell = 'bash' as const;

  /**
   * Generate a Bash completion script
   *
   * @param commands - Command definitions to generate completions for
   * @returns Bash completion script as a string
   */
  generate(commands: CommandDefinition[]): string {
    const script: string[] = [];

    // Header comment
    script.push('# Bash completion script for OpenSpec CLI');
    script.push('# Auto-generated - do not edit manually');
    script.push('');

    // Main completion function
    script.push('_openspec_completion() {');
    script.push('  local cur prev words cword');
    script.push('  _init_completion || return');
    script.push('');
    script.push('  local cmd="${words[1]}"');
    script.push('  local subcmd="${words[2]}"');
    script.push('');

    // Top-level commands
    script.push('  # Top-level commands');
    script.push('  if [[ $cword -eq 1 ]]; then');
    script.push('    local commands="' + commands.map(c => c.name).join(' ') + '"');
    script.push('    COMPREPLY=($(compgen -W "$commands" -- "$cur"))');
    script.push('    return 0');
    script.push('  fi');
    script.push('');

    // Command-specific completion
    script.push('  # Command-specific completion');
    script.push('  case "$cmd" in');

    for (const cmd of commands) {
      script.push(`    ${cmd.name})`);
      script.push(...this.generateCommandCase(cmd, '      '));
      script.push('      ;;');
    }

    script.push('  esac');
    script.push('');
    script.push('  return 0');
    script.push('}');
    script.push('');

    // Helper functions for dynamic completions
    script.push(...this.generateDynamicCompletionHelpers());

    // Register the completion function
    script.push('complete -F _openspec_completion openspec');
    script.push('');

    return script.join('\n');
  }

  /**
   * Generate completion case logic for a command
   */
  private generateCommandCase(cmd: CommandDefinition, indent: string): string[] {
    const lines: string[] = [];

    // Handle subcommands
    if (cmd.subcommands && cmd.subcommands.length > 0) {
      lines.push(`${indent}if [[ $cword -eq 2 ]]; then`);
      lines.push(`${indent}  local subcommands="` + cmd.subcommands.map(s => s.name).join(' ') + '"');
      lines.push(`${indent}  COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))`);
      lines.push(`${indent}  return 0`);
      lines.push(`${indent}fi`);
      lines.push('');
      lines.push(`${indent}case "$subcmd" in`);

      for (const subcmd of cmd.subcommands) {
        lines.push(`${indent}  ${subcmd.name})`);
        lines.push(...this.generateArgumentCompletion(subcmd, indent + '    '));
        lines.push(`${indent}    ;;`);
      }

      lines.push(`${indent}esac`);
    } else {
      // No subcommands, just complete arguments
      lines.push(...this.generateArgumentCompletion(cmd, indent));
    }

    return lines;
  }

  /**
   * Generate argument completion (flags and positional arguments)
   */
  private generateArgumentCompletion(cmd: CommandDefinition, indent: string): string[] {
    const lines: string[] = [];

    // Check for flag completion
    if (cmd.flags.length > 0) {
      lines.push(`${indent}if [[ "$cur" == -* ]]; then`);
      const flags = cmd.flags.map(f => {
        const parts: string[] = [];
        if (f.short) parts.push(`-${f.short}`);
        parts.push(`--${f.name}`);
        return parts.join(' ');
      }).join(' ');
      lines.push(`${indent}  local flags="${flags}"`);
      lines.push(`${indent}  COMPREPLY=($(compgen -W "$flags" -- "$cur"))`);
      lines.push(`${indent}  return 0`);
      lines.push(`${indent}fi`);
      lines.push('');
    }

    // Handle positional completions
    if (cmd.acceptsPositional) {
      lines.push(...this.generatePositionalCompletion(cmd.positionalType, indent));
    }

    return lines;
  }

  /**
   * Generate positional argument completion based on type
   */
  private generatePositionalCompletion(positionalType: string | undefined, indent: string): string[] {
    const lines: string[] = [];

    switch (positionalType) {
      case 'change-id':
        lines.push(`${indent}_openspec_complete_changes`);
        break;
      case 'spec-id':
        lines.push(`${indent}_openspec_complete_specs`);
        break;
      case 'change-or-spec-id':
        lines.push(`${indent}_openspec_complete_items`);
        break;
      case 'shell':
        lines.push(`${indent}local shells="zsh bash fish powershell"`);
        lines.push(`${indent}COMPREPLY=($(compgen -W "$shells" -- "$cur"))`);
        break;
      case 'path':
        lines.push(`${indent}COMPREPLY=($(compgen -f -- "$cur"))`);
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

    // Helper for completing change IDs
    lines.push('_openspec_complete_changes() {');
    lines.push('  local changes');
    lines.push('  changes=$(openspec __complete changes 2>/dev/null | cut -f1)');
    lines.push('  COMPREPLY=($(compgen -W "$changes" -- "$cur"))');
    lines.push('}');
    lines.push('');

    // Helper for completing spec IDs
    lines.push('_openspec_complete_specs() {');
    lines.push('  local specs');
    lines.push('  specs=$(openspec __complete specs 2>/dev/null | cut -f1)');
    lines.push('  COMPREPLY=($(compgen -W "$specs" -- "$cur"))');
    lines.push('}');
    lines.push('');

    // Helper for completing both changes and specs
    lines.push('_openspec_complete_items() {');
    lines.push('  local items');
    lines.push('  items=$(openspec __complete changes 2>/dev/null | cut -f1; openspec __complete specs 2>/dev/null | cut -f1)');
    lines.push('  COMPREPLY=($(compgen -W "$items" -- "$cur"))');
    lines.push('}');
    lines.push('');

    return lines;
  }
}
