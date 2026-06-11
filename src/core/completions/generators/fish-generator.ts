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
    const topLevelLines: string[] = [];
    for (const cmd of commands) {
      topLevelLines.push(`# ${cmd.name} command`);
      topLevelLines.push(
        `complete -c openspec -n '__fish_openspec_no_subcommand' -f -a '${cmd.name}' -d '${this.escapeDescription(cmd.description)}'`
      );
    }
    const topLevelCommands = topLevelLines.join('\n');

    const commandCompletionLines: string[] = [];
    for (const cmd of commands) {
      commandCompletionLines.push(...this.generateCommandCompletions(cmd));
      commandCompletionLines.push('');
    }
    const commandCompletions = commandCompletionLines.join('\n');

    const helperFunctions = FISH_STATIC_HELPERS;
    const dynamicHelpers = FISH_DYNAMIC_HELPERS;

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

    if (cmd.subcommands && cmd.subcommands.length > 0) {
      for (const subcmd of cmd.subcommands) {
        lines.push(
          `complete -c openspec -n '__fish_openspec_using_subcommand ${cmd.name}; and not __fish_openspec_using_subcommand ${subcmd.name}' -f -a '${subcmd.name}' -d '${this.escapeDescription(subcmd.description)}'`
        );
      }
      lines.push('');

      for (const flag of cmd.flags) {
        lines.push(...this.generateFlagCompletion(flag, `__fish_openspec_using_subcommand ${cmd.name}`));
      }

      for (const subcmd of cmd.subcommands) {
        lines.push(`# ${cmd.name} ${subcmd.name} flags`);
        for (const flag of subcmd.flags) {
          lines.push(
            ...this.generateFlagCompletion(
              flag,
              `__fish_openspec_using_subcommand ${cmd.name}; and __fish_openspec_using_subcommand ${subcmd.name}`
            )
          );
        }

        if (subcmd.positionals?.length) {
          lines.push(
            ...this.generateIndexedPositionalCompletions(
              subcmd.positionals,
              `__fish_openspec_using_subcommand ${cmd.name}; and __fish_openspec_using_subcommand ${subcmd.name}`,
              this.collectValueFlags(cmd.flags, subcmd.flags),
              2
            )
          );
        } else if (subcmd.acceptsPositional) {
          lines.push(
            ...this.generatePositionalCompletion(
              subcmd.positionalType,
              `__fish_openspec_using_subcommand ${cmd.name}; and __fish_openspec_using_subcommand ${subcmd.name}`
            )
          );
        }
      }
    } else {
      lines.push(`# ${cmd.name} flags`);
      for (const flag of cmd.flags) {
        lines.push(...this.generateFlagCompletion(flag, `__fish_openspec_using_subcommand ${cmd.name}`));
      }

      if (cmd.positionals?.length) {
        lines.push(
          ...this.generateIndexedPositionalCompletions(
            cmd.positionals,
            `__fish_openspec_using_subcommand ${cmd.name}`,
            this.collectValueFlags(cmd.flags),
            1
          )
        );
      } else if (cmd.acceptsPositional) {
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
    const description = this.escapeDescription(flag.description);
    const shortFlag = flag.short ? `-s ${flag.short} ` : '';
    const flagOptions = `${shortFlag}-l ${flag.name}`;
    const fileFallback = flag.completionType === 'path' ? '-r' : '-r -f';

    if (flag.takesValue && flag.values) {
      for (const value of flag.values) {
        lines.push(
          `complete -c openspec -n '${condition}' ${flagOptions} -f -a '${value}' -d '${description}'`
        );
      }
    } else if (flag.takesValue) {
      lines.push(
        `complete -c openspec -n '${condition}' ${flagOptions} ${fileFallback} -d '${description}'`
      );
    } else {
      lines.push(`complete -c openspec -n '${condition}' ${flagOptions} -f -d '${description}'`);
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
      case 'schema-name':
        lines.push(`complete -c openspec -n '${condition}' -a '(__fish_openspec_schemas)' -f`);
        break;
      case 'shell':
        lines.push(`complete -c openspec -n '${condition}' -a 'zsh bash fish powershell' -f`);
        break;
      case 'path':
        // Emit the rule without -f so Fish can offer filesystem completions.
        lines.push(`complete -c openspec -n '${condition}'`);
        break;
      default:
        lines.push(`complete -c openspec -n '${condition}' -f`);
        break;
    }

    return lines;
  }

  /**
   * Generate indexed positional completions.
   */
  private generateIndexedPositionalCompletions(
    positionals: NonNullable<CommandDefinition['positionals']>,
    condition: string,
    valueFlags: string[],
    depth: number
  ): string[] {
    const lines: string[] = [];

    for (const [index, positional] of positionals.entries()) {
      const indexCondition = `${condition}; and __fish_openspec_positional_index ${index} ${depth}${valueFlags.length ? ` ${valueFlags.join(' ')}` : ''}`;
      lines.push(...this.generatePositionalCompletion(positional.type, indexCondition));
    }

    return lines;
  }

  /**
   * Collect the long and short names for flags that consume the next token.
   */
  private collectValueFlags(...flagGroups: FlagDefinition[][]): string[] {
    const flags = new Set<string>();

    for (const group of flagGroups) {
      for (const flag of group) {
        if (!flag.takesValue) {
          continue;
        }

        flags.add(`--${flag.name}`);
        if (flag.short) {
          flags.add(`-${flag.short}`);
        }
      }
    }

    return [...flags];
  }

  /**
   * Escape description text for Fish
   */
  private escapeDescription(description: string): string {
    return description
      .replace(/\\/g, '\\\\') // Backslashes first
      .replace(/'/g, "\\'") // Single quotes
      .replace(/\$/g, '\\$') // Dollar signs (prevents $())
      .replace(/`/g, '\\`'); // Backticks
  }
}
