import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';
import { ZSH_DYNAMIC_HELPERS } from '../templates/zsh-templates.js';

/**
 * Generates Zsh completion scripts for the OpenSpec CLI.
 * Follows Zsh completion system conventions using the _openspec function.
 */
export class ZshGenerator implements CompletionGenerator {
  readonly shell = 'zsh' as const;

  /**
   * Generate a Zsh completion script
   *
   * @param commands - Command definitions to generate completions for
   * @returns Zsh completion script as a string
   */
  generate(commands: CommandDefinition[]): string {
    // Build command list using push() for loop clarity
    const commandLines: string[] = [];
    for (const cmd of commands) {
      const escapedDesc = this.escapeDescription(cmd.description);
      commandLines.push(`    '${cmd.name}:${escapedDesc}'`);
    }
    const commandList = commandLines.join('\n');

    // Build command cases using push() for loop clarity
    const commandCaseLines: string[] = [];
    for (const cmd of commands) {
      commandCaseLines.push(`        ${cmd.name})`);
      commandCaseLines.push(`          _openspec_${this.sanitizeFunctionName(cmd.name)}`);
      commandCaseLines.push('          ;;');
    }
    const commandCases = commandCaseLines.join('\n');

    // Build command functions using push() for loop clarity
    const commandFunctionLines: string[] = [];
    for (const cmd of commands) {
      commandFunctionLines.push(...this.generateCommandFunction(cmd));
      commandFunctionLines.push('');
    }
    const commandFunctions = commandFunctionLines.join('\n');

    // Dynamic completion helpers from template
    const helpers = ZSH_DYNAMIC_HELPERS;

    // Assemble final script with template literal
    return `#compdef openspec

# Zsh completion script for OpenSpec CLI
# Auto-generated - do not edit manually

_openspec() {
  local context state line
  typeset -A opt_args

  local -a commands
  commands=(
${commandList}
  )

  _arguments -C \\
    "1: :->command" \\
    "*::arg:->args"

  case $state in
    command)
      _describe "openspec command" commands
      ;;
    args)
      case $words[1] in
${commandCases}
      esac
      ;;
  esac
}

${commandFunctions}
${helpers}
compdef _openspec openspec
`;
  }

  /**
   * Generate completion function for a specific command
   */
  private generateCommandFunction(cmd: CommandDefinition): string[] {
    const funcName = `_openspec_${this.sanitizeFunctionName(cmd.name)}`;
    const lines: string[] = [];

    lines.push(`${funcName}() {`);

    // If command has subcommands, handle them
    if (cmd.subcommands && cmd.subcommands.length > 0) {
      lines.push('  local context state line');
      lines.push('  typeset -A opt_args');
      lines.push('');
      lines.push('  local -a subcommands');
      lines.push('  subcommands=(');

      for (const subcmd of cmd.subcommands) {
        const escapedDesc = this.escapeDescription(subcmd.description);
        lines.push(`    '${subcmd.name}:${escapedDesc}'`);
      }

      lines.push('  )');
      lines.push('');
      lines.push('  _arguments -C \\');

      // Add command flags
      for (const flag of cmd.flags) {
        lines.push('    ' + this.generateFlagSpec(flag) + ' \\');
      }

      lines.push('    "1: :->subcommand" \\');
      lines.push('    "*::arg:->args"');
      lines.push('');
      lines.push('  case $state in');
      lines.push('    subcommand)');
      lines.push('      _describe "subcommand" subcommands');
      lines.push('      ;;');
      lines.push('    args)');
      lines.push('      case $words[1] in');

      for (const subcmd of cmd.subcommands) {
        lines.push(`        ${subcmd.name})`);
        lines.push(`          _openspec_${this.sanitizeFunctionName(cmd.name)}_${this.sanitizeFunctionName(subcmd.name)}`);
        lines.push('          ;;');
      }

      lines.push('      esac');
      lines.push('      ;;');
      lines.push('  esac');
    } else {
      // Command without subcommands
      lines.push('  _arguments \\');

      // Add flags
      for (const flag of cmd.flags) {
        lines.push('    ' + this.generateFlagSpec(flag) + ' \\');
      }

      // Add positional argument completion
      if (cmd.acceptsPositional) {
        const positionalSpec = this.generatePositionalSpec(cmd.positionalType);
        lines.push('    ' + positionalSpec);
      } else {
        // Remove trailing backslash from last flag
        if (lines[lines.length - 1].endsWith(' \\')) {
          lines[lines.length - 1] = lines[lines.length - 1].slice(0, -2);
        }
      }
    }

    lines.push('}');

    // Generate subcommand functions if they exist
    if (cmd.subcommands) {
      for (const subcmd of cmd.subcommands) {
        lines.push('');
        lines.push(...this.generateSubcommandFunction(cmd.name, subcmd));
      }
    }

    return lines;
  }

  /**
   * Generate completion function for a subcommand
   */
  private generateSubcommandFunction(parentName: string, subcmd: CommandDefinition): string[] {
    const funcName = `_openspec_${this.sanitizeFunctionName(parentName)}_${this.sanitizeFunctionName(subcmd.name)}`;
    const lines: string[] = [];

    lines.push(`${funcName}() {`);
    lines.push('  _arguments \\');

    // Add flags
    for (const flag of subcmd.flags) {
      lines.push('    ' + this.generateFlagSpec(flag) + ' \\');
    }

    // Add positional argument completion
    if (subcmd.acceptsPositional) {
      const positionalSpec = this.generatePositionalSpec(subcmd.positionalType);
      lines.push('    ' + positionalSpec);
    } else {
      // Remove trailing backslash from last flag
      if (lines[lines.length - 1].endsWith(' \\')) {
        lines[lines.length - 1] = lines[lines.length - 1].slice(0, -2);
      }
    }

    lines.push('}');

    return lines;
  }

  /**
   * Generate flag specification for _arguments
   */
  private generateFlagSpec(flag: FlagDefinition): string {
    const parts: string[] = [];

    // Handle mutually exclusive short and long forms
    if (flag.short) {
      parts.push(`'(-${flag.short} --${flag.name})'{-${flag.short},--${flag.name}}'`);
    } else {
      parts.push(`'--${flag.name}`);
    }

    // Add description
    const escapedDesc = this.escapeDescription(flag.description);
    parts.push(`[${escapedDesc}]`);

    // Add value completion if flag takes a value
    if (flag.takesValue) {
      if (flag.values && flag.values.length > 0) {
        // Provide specific value completions
        const valueList = flag.values.map(v => this.escapeValue(v)).join(' ');
        parts.push(`:value:(${valueList})`);
      } else {
        // Generic value placeholder
        parts.push(':value:');
      }
    }

    // Close the quote (needed for both short and long forms)
    parts.push("'");

    return parts.join('');
  }

  /**
   * Generate positional argument specification
   */
  private generatePositionalSpec(positionalType?: string): string {
    switch (positionalType) {
      case 'change-id':
        return "'*: :_openspec_complete_changes'";
      case 'spec-id':
        return "'*: :_openspec_complete_specs'";
      case 'change-or-spec-id':
        return "'*: :_openspec_complete_items'";
      case 'path':
        return "'*:path:_files'";
      case 'shell':
        return "'*:shell:(zsh bash fish powershell)'";
      default:
        return "'*: :_default'";
    }
  }

  /**
   * Escape special characters in descriptions
   */
  private escapeDescription(desc: string): string {
    return desc
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\[/g, '\\[')
      .replace(/]/g, '\\]')
      .replace(/:/g, '\\:');
  }

  /**
   * Escape special characters in values
   */
  private escapeValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/ /g, '\\ ');
  }

  /**
   * Sanitize command names for use in function names
   */
  private sanitizeFunctionName(name: string): string {
    return name.replace(/-/g, '_');
  }
}
