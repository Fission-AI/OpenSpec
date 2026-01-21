import { CompletionGenerator, CommandDefinition, FlagDefinition } from '../types.js';
import { FISH_STATIC_HELPERS, FISH_DYNAMIC_HELPERS } from '../templates/fish-templates.js';

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
    // Build top-level commands using push() for loop clarity
    const topLevelLines: string[] = [];
    for (const cmd of commands) {
      topLevelLines.push(`# ${cmd.name} command`);
      topLevelLines.push(
        `complete -c openspec -n '__fish_openspec_no_subcommand' -a '${cmd.name}' -d '${this.escapeDescription(cmd.description)}'`
      );
    }
    const topLevelCommands = topLevelLines.join('\n');

    // Build command-specific completions using push() for loop clarity
    const commandCompletionLines: string[] = [];
    for (const cmd of commands) {
      commandCompletionLines.push(...this.generateCommandCompletions(cmd));
      commandCompletionLines.push('');
    }
    const commandCompletions = commandCompletionLines.join('\n');

    // Static helper functions from template
    const helperFunctions = FISH_STATIC_HELPERS;

    // Dynamic completion helpers from template
    const dynamicHelpers = FISH_DYNAMIC_HELPERS;

    // Assemble final script with template literal
    return `# Fish completion script for OpenSpec CLI
# Auto-generated - do not edit manually

${helperFunctions}
${dynamicHelpers}
${topLevelCommands}

${commandCompletions}`;
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
