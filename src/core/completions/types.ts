import { SupportedShell } from '../../utils/shell-detection.js';

/**
 * Definition of a command-line flag/option
 */
export interface FlagDefinition {
  /**
   * Flag name without dashes (e.g., "json", "strict", "no-interactive")
   */
  name: string;

  /**
   * Short flag name without dash (e.g., "y" for "-y")
   */
  short?: string;

  /**
   * Human-readable description of what the flag does
   */
  description: string;

  /**
   * Whether the flag takes an argument value
   */
  takesValue?: boolean;

  /**
   * Possible values for the flag (for completion suggestions)
   */
  values?: string[];
}

/**
 * Definition of a CLI command
 */
export interface CommandDefinition {
  /**
   * Command name (e.g., "init", "validate", "show")
   */
  name: string;

  /**
   * Human-readable description of the command
   */
  description: string;

  /**
   * Flags/options supported by this command
   */
  flags: FlagDefinition[];

  /**
   * Subcommands (e.g., "change show", "spec validate")
   */
  subcommands?: CommandDefinition[];

  /**
   * Whether this command accepts a positional argument (e.g., item name, path)
   */
  acceptsPositional?: boolean;

  /**
   * Type of positional argument for dynamic completion
   * - 'change-id': Complete with active change IDs
   * - 'spec-id': Complete with spec IDs
   * - 'change-or-spec-id': Complete with both changes and specs
   * - 'path': Complete with file paths
   * - 'shell': Complete with supported shell names
   * - 'schema-name': Complete with available schema names
   * - undefined: No specific completion
   */
  positionalType?: 'change-id' | 'spec-id' | 'change-or-spec-id' | 'path' | 'shell' | 'schema-name';
}

/**
 * Interface for shell-specific completion script generators
 */
export interface CompletionGenerator {
  /**
   * The shell type this generator targets
   */
  readonly shell: SupportedShell;

  /**
   * Generate the completion script content
   *
   * @param commands - Command definitions to generate completions for
   * @returns The shell-specific completion script as a string
   */
  generate(commands: CommandDefinition[]): string;
}
