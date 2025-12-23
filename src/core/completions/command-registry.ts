import { CommandDefinition, FlagDefinition } from './types.js';

/**
 * Common flags used across multiple commands
 */
const COMMON_FLAGS = {
  json: {
    name: 'json',
    description: 'Output as JSON',
  } as FlagDefinition,
  jsonValidation: {
    name: 'json',
    description: 'Output validation results as JSON',
  } as FlagDefinition,
  strict: {
    name: 'strict',
    description: 'Enable strict validation mode',
  } as FlagDefinition,
  noInteractive: {
    name: 'no-interactive',
    description: 'Disable interactive prompts',
  } as FlagDefinition,
  type: {
    name: 'type',
    description: 'Specify item type when ambiguous',
    takesValue: true,
    values: ['change', 'spec'],
  } as FlagDefinition,
} as const;

/**
 * Registry of all OpenSpec CLI commands with their flags and metadata.
 * This registry is used to generate shell completion scripts.
 */
export const COMMAND_REGISTRY: CommandDefinition[] = [
  {
    name: 'init',
    description: 'Initialize OpenSpec in your project',
    acceptsPositional: true,
    positionalType: 'path',
    flags: [
      {
        name: 'tools',
        description: 'Configure AI tools non-interactively (e.g., "all", "none", or comma-separated tool IDs)',
        takesValue: true,
      },
    ],
  },
  {
    name: 'update',
    description: 'Update OpenSpec instruction files',
    acceptsPositional: true,
    positionalType: 'path',
    flags: [],
  },
  {
    name: 'list',
    description: 'List items (changes by default, or specs with --specs)',
    flags: [
      {
        name: 'specs',
        description: 'List specs instead of changes',
      },
      {
        name: 'changes',
        description: 'List changes explicitly (default)',
      },
    ],
  },
  {
    name: 'view',
    description: 'Display an interactive dashboard of specs and changes',
    flags: [],
  },
  {
    name: 'validate',
    description: 'Validate changes and specs',
    acceptsPositional: true,
    positionalType: 'change-or-spec-id',
    flags: [
      {
        name: 'all',
        description: 'Validate all changes and specs',
      },
      {
        name: 'changes',
        description: 'Validate all changes',
      },
      {
        name: 'specs',
        description: 'Validate all specs',
      },
      COMMON_FLAGS.type,
      COMMON_FLAGS.strict,
      COMMON_FLAGS.jsonValidation,
      {
        name: 'concurrency',
        description: 'Max concurrent validations (defaults to env OPENSPEC_CONCURRENCY or 6)',
        takesValue: true,
      },
      COMMON_FLAGS.noInteractive,
    ],
  },
  {
    name: 'show',
    description: 'Show a change or spec',
    acceptsPositional: true,
    positionalType: 'change-or-spec-id',
    flags: [
      COMMON_FLAGS.json,
      COMMON_FLAGS.type,
      COMMON_FLAGS.noInteractive,
      {
        name: 'deltas-only',
        description: 'Show only deltas (JSON only, change-specific)',
      },
      {
        name: 'requirements-only',
        description: 'Alias for --deltas-only (deprecated, change-specific)',
      },
      {
        name: 'requirements',
        description: 'Show only requirements, exclude scenarios (JSON only, spec-specific)',
      },
      {
        name: 'no-scenarios',
        description: 'Exclude scenario content (JSON only, spec-specific)',
      },
      {
        name: 'requirement',
        short: 'r',
        description: 'Show specific requirement by ID (JSON only, spec-specific)',
        takesValue: true,
      },
    ],
  },
  {
    name: 'archive',
    description: 'Archive a completed change and update main specs',
    acceptsPositional: true,
    positionalType: 'change-id',
    flags: [
      {
        name: 'yes',
        short: 'y',
        description: 'Skip confirmation prompts',
      },
      {
        name: 'skip-specs',
        description: 'Skip spec update operations',
      },
      {
        name: 'no-validate',
        description: 'Skip validation (not recommended)',
      },
    ],
  },
  {
    name: 'change',
    description: 'Manage OpenSpec change proposals (deprecated)',
    flags: [],
    subcommands: [
      {
        name: 'show',
        description: 'Show a change proposal',
        acceptsPositional: true,
        positionalType: 'change-id',
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'deltas-only',
            description: 'Show only deltas (JSON only)',
          },
          {
            name: 'requirements-only',
            description: 'Alias for --deltas-only (deprecated)',
          },
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'list',
        description: 'List all active changes (deprecated)',
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'long',
            description: 'Show id and title with counts',
          },
        ],
      },
      {
        name: 'validate',
        description: 'Validate a change proposal',
        acceptsPositional: true,
        positionalType: 'change-id',
        flags: [
          COMMON_FLAGS.strict,
          COMMON_FLAGS.jsonValidation,
          COMMON_FLAGS.noInteractive,
        ],
      },
    ],
  },
  {
    name: 'spec',
    description: 'Manage OpenSpec specifications',
    flags: [],
    subcommands: [
      {
        name: 'show',
        description: 'Show a specification',
        acceptsPositional: true,
        positionalType: 'spec-id',
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'requirements',
            description: 'Show only requirements, exclude scenarios (JSON only)',
          },
          {
            name: 'no-scenarios',
            description: 'Exclude scenario content (JSON only)',
          },
          {
            name: 'requirement',
            short: 'r',
            description: 'Show specific requirement by ID (JSON only)',
            takesValue: true,
          },
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'list',
        description: 'List all specifications',
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'long',
            description: 'Show id and title with counts',
          },
        ],
      },
      {
        name: 'validate',
        description: 'Validate a specification',
        acceptsPositional: true,
        positionalType: 'spec-id',
        flags: [
          COMMON_FLAGS.strict,
          COMMON_FLAGS.jsonValidation,
          COMMON_FLAGS.noInteractive,
        ],
      },
    ],
  },
  {
    name: 'completion',
    description: 'Manage shell completions for OpenSpec CLI',
    flags: [],
    subcommands: [
      {
        name: 'generate',
        description: 'Generate completion script for a shell (outputs to stdout)',
        acceptsPositional: true,
        positionalType: 'shell',
        flags: [],
      },
      {
        name: 'install',
        description: 'Install completion script for a shell',
        acceptsPositional: true,
        positionalType: 'shell',
        flags: [
          {
            name: 'verbose',
            description: 'Show detailed installation output',
          },
        ],
      },
      {
        name: 'uninstall',
        description: 'Uninstall completion script for a shell',
        acceptsPositional: true,
        positionalType: 'shell',
        flags: [],
      },
    ],
  },
  {
    name: 'config',
    description: 'View and modify global OpenSpec configuration',
    flags: [
      {
        name: 'scope',
        description: 'Config scope (only "global" supported currently)',
        takesValue: true,
        values: ['global'],
      },
    ],
    subcommands: [
      {
        name: 'path',
        description: 'Show config file location',
        flags: [],
      },
      {
        name: 'list',
        description: 'Show all current settings',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'get',
        description: 'Get a specific value (raw, scriptable)',
        acceptsPositional: true,
        flags: [],
      },
      {
        name: 'set',
        description: 'Set a value (auto-coerce types)',
        acceptsPositional: true,
        flags: [
          {
            name: 'string',
            description: 'Force value to be stored as string',
          },
          {
            name: 'allow-unknown',
            description: 'Allow setting unknown keys',
          },
        ],
      },
      {
        name: 'unset',
        description: 'Remove a key (revert to default)',
        acceptsPositional: true,
        flags: [],
      },
      {
        name: 'reset',
        description: 'Reset configuration to defaults',
        flags: [
          {
            name: 'all',
            description: 'Reset all configuration (required)',
          },
          {
            name: 'yes',
            short: 'y',
            description: 'Skip confirmation prompts',
          },
        ],
      },
      {
        name: 'edit',
        description: 'Open config in $EDITOR',
        flags: [],
      },
    ],
  },
];
