import {
  CompletionGenerator,
  CommandDefinition,
  FlagDefinition,
  PositionalDefinition,
} from '../types.js';
import { BASH_DYNAMIC_HELPERS } from '../templates/bash-templates.js';

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
    // Build command list for top-level completions
    const commandList = commands.map(c => this.escapeCommandName(c.name)).join(' ');

    // Build command cases using push() for loop clarity
    const caseLines: string[] = [];
    for (const cmd of commands) {
      caseLines.push(`    ${cmd.name})`);
      caseLines.push(...this.generateCommandCase(cmd, '      '));
      caseLines.push('      ;;');
    }
    const commandCases = caseLines.join('\n');

    // Dynamic completion helpers from template
    const helpers = BASH_DYNAMIC_HELPERS;

    // Assemble final script with template literal
    return `# Bash completion script for OpenSpec CLI
# Auto-generated - do not edit manually

_openspec_completion() {
  local cur prev words cword

  # Use _init_completion if available (from bash-completion package)
  # The -n : option prevents colons from being treated as word separators
  # (important for spec/change IDs that may contain colons)
  # Otherwise, fall back to manual initialization
  if declare -F _init_completion >/dev/null 2>&1; then
    _init_completion -n : || return
  else
    # Manual fallback when bash-completion is not installed
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  fi

  local cmd="\${words[1]}"
  local subcmd="\${words[2]}"

  # Top-level commands
  if [[ $cword -eq 1 ]]; then
    local commands="${commandList}"
    COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    return 0
  fi

  # Command-specific completion
  case "$cmd" in
${commandCases}
  esac

  return 0
}

${helpers}
complete -F _openspec_completion openspec
`;
  }

  /**
   * Generate completion case logic for a command
   */
  private generateCommandCase(cmd: CommandDefinition, indent: string): string[] {
    const lines: string[] = [];

    // Handle subcommands
    if (cmd.subcommands && cmd.subcommands.length > 0) {
      // First, check if user is typing a flag for the parent command
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

      lines.push(`${indent}if [[ $cword -eq 2 ]]; then`);
      lines.push(`${indent}  local subcommands="` + cmd.subcommands.map(s => this.escapeCommandName(s.name)).join(' ') + '"');
      lines.push(`${indent}  COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))`);
      lines.push(`${indent}  return 0`);
      lines.push(`${indent}fi`);
      lines.push('');
      lines.push(`${indent}case "$subcmd" in`);

      for (const subcmd of cmd.subcommands) {
        lines.push(`${indent}  ${subcmd.name})`);
        lines.push(...this.generateArgumentCompletion(subcmd, indent + '    ', 3));
        lines.push(`${indent}    ;;`);
      }

      lines.push(`${indent}esac`);
    } else {
      // No subcommands, just complete arguments
      lines.push(...this.generateArgumentCompletion(cmd, indent, 2));
    }

    return lines;
  }

  /**
   * Generate argument completion (flags and positional arguments)
   */
  private generateArgumentCompletion(
    cmd: CommandDefinition,
    indent: string,
    firstPositionalWordIndex: number
  ): string[] {
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
    if (cmd.positionals && cmd.positionals.length > 0) {
      lines.push(...this.generateIndexedPositionalCompletion(
        cmd.positionals,
        cmd.flags,
        firstPositionalWordIndex,
        indent
      ));
    } else if (cmd.acceptsPositional) {
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
      case 'schema-name':
        lines.push(`${indent}_openspec_complete_schemas`);
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

  private generateIndexedPositionalCompletion(
    positionals: PositionalDefinition[],
    flags: FlagDefinition[],
    firstPositionalWordIndex: number,
    indent: string
  ): string[] {
    const lines: string[] = [];
    const valueFlagCases = this.generateValueFlagCases(flags);

    if (valueFlagCases.length > 0) {
      lines.push(`${indent}case "$prev" in`);
      lines.push(`${indent}  ${valueFlagCases.join('|')}) return 0 ;;`);
      lines.push(`${indent}esac`);
      lines.push('');
    }

    lines.push(`${indent}local positional_index=0`);
    lines.push(`${indent}local skip_next=0`);
    lines.push(`${indent}local i`);
    lines.push(`${indent}for ((i = ${firstPositionalWordIndex}; i < cword; i++)); do`);
    lines.push(`${indent}  if [[ $skip_next -eq 1 ]]; then`);
    lines.push(`${indent}    skip_next=0`);
    lines.push(`${indent}    continue`);
    lines.push(`${indent}  fi`);
    lines.push(`${indent}  case "\${words[i]}" in`);

    if (valueFlagCases.length > 0) {
      lines.push(`${indent}    ${valueFlagCases.join('|')}) skip_next=1 ;;`);
      lines.push(`${indent}    ${valueFlagCases.map((flag) => `${flag}=*`).join('|')}) ;;`);
    }

    lines.push(`${indent}    -*) ;;`);
    lines.push(`${indent}    *) ((positional_index++)) ;;`);
    lines.push(`${indent}  esac`);
    lines.push(`${indent}done`);
    lines.push('');
    lines.push(`${indent}case "$positional_index" in`);

    for (const [index, positional] of positionals.entries()) {
      const completion = this.generateIndexedPositionalCase(positional, indent + '  ');
      if (completion.length === 0) continue;
      lines.push(`${indent}  ${index})`);
      lines.push(...completion);
      lines.push(`${indent}    ;;`);
    }

    lines.push(`${indent}esac`);

    return lines;
  }

  private generateValueFlagCases(flags: FlagDefinition[]): string[] {
    return flags
      .filter((flag) => flag.takesValue)
      .flatMap((flag) => [
        `--${flag.name}`,
        ...(flag.short ? [`-${flag.short}`] : []),
      ]);
  }

  private generateIndexedPositionalCase(
    positional: PositionalDefinition,
    indent: string
  ): string[] {
    return this.generatePositionalCompletion(positional.type, indent);
  }


  /**
   * Escape command/subcommand names for safe use in Bash scripts
   */
  private escapeCommandName(name: string): string {
    // Escape shell metacharacters to prevent command injection
    return name.replace(/["\$`\\]/g, '\\$&');
  }
}
