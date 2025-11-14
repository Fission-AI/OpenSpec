import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';

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
    const script: string[] = [];

    // Header comment
    script.push('#compdef openspec');
    script.push('');
    script.push('# Zsh completion script for OpenSpec CLI');
    script.push('# Auto-generated - do not edit manually');
    script.push('');

    // Main completion function
    script.push('_openspec() {');
    script.push('  local context state line');
    script.push('  typeset -A opt_args');
    script.push('');

    // Generate main command argument specification
    script.push('  local -a commands');
    script.push('  commands=(');
    for (const cmd of commands) {
      const escapedDesc = this.escapeDescription(cmd.description);
      script.push(`    '${cmd.name}:${escapedDesc}'`);
    }
    script.push('  )');
    script.push('');

    // Main _arguments call
    script.push('  _arguments -C \\');
    script.push('    "1: :->command" \\');
    script.push('    "*::arg:->args"');
    script.push('');

    // Command dispatch logic
    script.push('  case $state in');
    script.push('    command)');
    script.push('      _describe "openspec command" commands');
    script.push('      ;;');
    script.push('    args)');
    script.push('      case $words[1] in');

    // Generate completion for each command
    for (const cmd of commands) {
      script.push(`        ${cmd.name})`);
      script.push(`          _openspec_${this.sanitizeFunctionName(cmd.name)}`);
      script.push('          ;;');
    }

    script.push('      esac');
    script.push('      ;;');
    script.push('  esac');
    script.push('}');
    script.push('');

    // Generate individual command completion functions
    for (const cmd of commands) {
      script.push(...this.generateCommandFunction(cmd));
      script.push('');
    }

    // Add dynamic completion helper functions
    script.push(...this.generateDynamicCompletionHelpers());

    // Register the completion function
    script.push('compdef _openspec openspec');
    script.push('');

    return script.join('\n');
  }

  /**
   * Generate a single completion function
   *
   * @param functionName - Name of the completion function
   * @param varName - Name of the local array variable
   * @param varLabel - Label for the completion items
   * @param commandLines - Command line(s) to populate the array
   * @param comment - Optional comment describing the function
   */
  private generateCompletionFunction(
    functionName: string,
    varName: string,
    varLabel: string,
    commandLines: string[],
    comment?: string
  ): string[] {
    const lines: string[] = [];

    if (comment) {
      lines.push(comment);
    }

    lines.push(`${functionName}() {`);
    lines.push(`  local -a ${varName}`);

    if (commandLines.length === 1) {
      lines.push(`  ${commandLines[0]}`);
    } else {
      lines.push(`  ${varName}=(`);
      for (let i = 0; i < commandLines.length; i++) {
        const suffix = i < commandLines.length - 1 ? ' \\' : '';
        lines.push(`    ${commandLines[i]}${suffix}`);
      }
      lines.push('  )');
    }

    lines.push(`  _describe "${varLabel}" ${varName}`);
    lines.push('}');
    lines.push('');

    return lines;
  }

  /**
   * Generate dynamic completion helper functions for change and spec IDs
   */
  private generateDynamicCompletionHelpers(): string[] {
    const lines: string[] = [];

    lines.push('# Dynamic completion helpers');
    lines.push('');

    // Helper function for completing change IDs
    lines.push('# Use openspec __complete to get available changes');
    lines.push('_openspec_complete_changes() {');
    lines.push('  local -a changes');
    lines.push('  while IFS=$\'\\t\' read -r id desc; do');
    lines.push('    changes+=("$id:$desc")');
    lines.push('  done < <(openspec __complete changes 2>/dev/null)');
    lines.push('  _describe "change" changes');
    lines.push('}');
    lines.push('');

    // Helper function for completing spec IDs
    lines.push('# Use openspec __complete to get available specs');
    lines.push('_openspec_complete_specs() {');
    lines.push('  local -a specs');
    lines.push('  while IFS=$\'\\t\' read -r id desc; do');
    lines.push('    specs+=("$id:$desc")');
    lines.push('  done < <(openspec __complete specs 2>/dev/null)');
    lines.push('  _describe "spec" specs');
    lines.push('}');
    lines.push('');

    // Helper function for completing both changes and specs
    lines.push('# Get both changes and specs');
    lines.push('_openspec_complete_items() {');
    lines.push('  local -a items');
    lines.push('  while IFS=$\'\\t\' read -r id desc; do');
    lines.push('    items+=("$id:$desc")');
    lines.push('  done < <(openspec __complete changes 2>/dev/null)');
    lines.push('  while IFS=$\'\\t\' read -r id desc; do');
    lines.push('    items+=("$id:$desc")');
    lines.push('  done < <(openspec __complete specs 2>/dev/null)');
    lines.push('  _describe "item" items');
    lines.push('}');
    lines.push('');

    return lines;
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
        return "'*:shell:(zsh)'";
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
