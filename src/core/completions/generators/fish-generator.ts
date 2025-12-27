import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';

/**
 * Generates Fish completion scripts for the OpenSpec CLI.
 * Follows Fish completion conventions using the complete command.
 */
export class FishGenerator implements CompletionGenerator {
  readonly shell = 'fish' as const;

  /**
   * Generate a Fish completion script
   *
   * @param commands - Command definitions to generate completions for
   * @returns Fish completion script as a string
   */
  generate(commands: CommandDefinition[]): string {
    const script: string[] = [];

    // Header comment
    script.push('# Fish completion script for OpenSpec CLI');
    script.push('# Auto-generated - do not edit manually');
    script.push('');

    // Helper functions for checking conditions
    script.push('# Helper function to check if a subcommand is present');
    script.push('function __fish_openspec_using_subcommand');
    script.push('    set -l cmd (commandline -opc)');
    script.push('    set -e cmd[1]');
    script.push('    for i in $argv');
    script.push('        if contains -- $i $cmd');
    script.push('            return 0');
    script.push('        end');
    script.push('    end');
    script.push('    return 1');
    script.push('end');
    script.push('');

    script.push('function __fish_openspec_no_subcommand');
    script.push('    set -l cmd (commandline -opc)');
    script.push('    test (count $cmd) -eq 1');
    script.push('end');
    script.push('');

    // Dynamic completion helpers
    script.push(...this.generateDynamicCompletionHelpers());

    // Top-level commands
    for (const cmd of commands) {
      script.push(`# ${cmd.name} command`);
      script.push(
        `complete -c openspec -n '__fish_openspec_no_subcommand' -a '${cmd.name}' -d '${this.escapeDescription(cmd.description)}'`
      );
    }
    script.push('');

    // Command-specific completions
    for (const cmd of commands) {
      script.push(...this.generateCommandCompletions(cmd));
      script.push('');
    }

    return script.join('\n');
  }

  /**
   * Generate completions for a specific command
   */
  private generateCommandCompletions(cmd: CommandDefinition): string[] {
    const lines: string[] = [];

    // If command has subcommands
    if (cmd.subcommands && cmd.subcommands.length > 0) {
      // Add subcommand completions
      for (const subcmd of cmd.subcommands) {
        lines.push(
          `complete -c openspec -n '__fish_openspec_using_subcommand ${cmd.name}; and not __fish_openspec_using_subcommand ${subcmd.name}' -a '${subcmd.name}' -d '${this.escapeDescription(subcmd.description)}'`
        );
      }
      lines.push('');

      // Add flags for parent command
      for (const flag of cmd.flags) {
        lines.push(...this.generateFlagCompletion(flag, `__fish_openspec_using_subcommand ${cmd.name}`));
      }

      // Add completions for each subcommand
      for (const subcmd of cmd.subcommands) {
        lines.push(`# ${cmd.name} ${subcmd.name} flags`);
        for (const flag of subcmd.flags) {
          lines.push(...this.generateFlagCompletion(flag, `__fish_openspec_using_subcommand ${cmd.name}; and __fish_openspec_using_subcommand ${subcmd.name}`));
        }

        // Add positional completions for subcommand
        if (subcmd.acceptsPositional) {
          lines.push(...this.generatePositionalCompletion(subcmd.positionalType, `__fish_openspec_using_subcommand ${cmd.name}; and __fish_openspec_using_subcommand ${subcmd.name}`));
        }
      }
    } else {
      // Command without subcommands
      lines.push(`# ${cmd.name} flags`);
      for (const flag of cmd.flags) {
        lines.push(...this.generateFlagCompletion(flag, `__fish_openspec_using_subcommand ${cmd.name}`));
      }

      // Add positional completions
      if (cmd.acceptsPositional) {
        lines.push(...this.generatePositionalCompletion(cmd.positionalType, `__fish_openspec_using_subcommand ${cmd.name}`));
      }
    }

    return lines;
  }

  /**
   * Generate flag completion
   */
  private generateFlagCompletion(flag: FlagDefinition, condition: string): string[] {
    const lines: string[] = [];
    const longFlag = `--${flag.name}`;
    const shortFlag = flag.short ? `-${flag.short}` : undefined;

    if (flag.takesValue && flag.values) {
      // Flag with enum values
      for (const value of flag.values) {
        if (shortFlag) {
          lines.push(
            `complete -c openspec -n '${condition}' -s ${flag.short} -l ${flag.name} -a '${value}' -d '${this.escapeDescription(flag.description)}'`
          );
        } else {
          lines.push(
            `complete -c openspec -n '${condition}' -l ${flag.name} -a '${value}' -d '${this.escapeDescription(flag.description)}'`
          );
        }
      }
    } else if (flag.takesValue) {
      // Flag that takes a value but no specific values defined
      if (shortFlag) {
        lines.push(
          `complete -c openspec -n '${condition}' -s ${flag.short} -l ${flag.name} -r -d '${this.escapeDescription(flag.description)}'`
        );
      } else {
        lines.push(
          `complete -c openspec -n '${condition}' -l ${flag.name} -r -d '${this.escapeDescription(flag.description)}'`
        );
      }
    } else {
      // Boolean flag
      if (shortFlag) {
        lines.push(
          `complete -c openspec -n '${condition}' -s ${flag.short} -l ${flag.name} -d '${this.escapeDescription(flag.description)}'`
        );
      } else {
        lines.push(
          `complete -c openspec -n '${condition}' -l ${flag.name} -d '${this.escapeDescription(flag.description)}'`
        );
      }
    }

    return lines;
  }

  /**
   * Generate positional argument completion
   */
  private generatePositionalCompletion(positionalType: string | undefined, condition: string): string[] {
    const lines: string[] = [];

    switch (positionalType) {
      case 'change-id':
        lines.push(`complete -c openspec -n '${condition}' -a '(__fish_openspec_changes)' -f`);
        break;
      case 'spec-id':
        lines.push(`complete -c openspec -n '${condition}' -a '(__fish_openspec_specs)' -f`);
        break;
      case 'change-or-spec-id':
        lines.push(`complete -c openspec -n '${condition}' -a '(__fish_openspec_items)' -f`);
        break;
      case 'shell':
        lines.push(`complete -c openspec -n '${condition}' -a 'zsh bash fish powershell' -f`);
        break;
      case 'path':
        // Fish automatically completes files, no need to specify
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
    lines.push('function __fish_openspec_changes');
    lines.push('    openspec __complete changes 2>/dev/null | while read -l id desc');
    lines.push('        echo "$id\\t$desc"');
    lines.push('    end');
    lines.push('end');
    lines.push('');

    // Helper for spec IDs
    lines.push('function __fish_openspec_specs');
    lines.push('    openspec __complete specs 2>/dev/null | while read -l id desc');
    lines.push('        echo "$id\\t$desc"');
    lines.push('    end');
    lines.push('end');
    lines.push('');

    // Helper for both changes and specs
    lines.push('function __fish_openspec_items');
    lines.push('    __fish_openspec_changes');
    lines.push('    __fish_openspec_specs');
    lines.push('end');
    lines.push('');

    return lines;
  }

  /**
   * Escape description text for Fish
   */
  private escapeDescription(description: string): string {
    return description
      .replace(/\\/g, '\\\\')  // Backslashes first
      .replace(/'/g, "\\'")    // Single quotes
      .replace(/\$/g, '\\$')   // Dollar signs (prevents $())
      .replace(/`/g, '\\`');   // Backticks
  }
}
