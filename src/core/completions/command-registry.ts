import { COMMON_FLAGS } from './shared-flags.js';
import type { CommandDefinition } from './types.js';
export const COMMAND_REGISTRY: CommandDefinition[] = [
  {
    name: 'init',
    description: 'Initialize OpenSpec in your project',
    acceptsPositional: true,
    positionalType: 'path',
    positionals: [{ name: 'path', type: 'path', optional: true }],
    flags: [
      {
        name: 'tools',
        description: 'Configure AI tools non-interactively (e.g., "all", "none", or comma-separated tool IDs)',
        takesValue: true,
      },
      {
        name: 'force',
        description: 'Auto-cleanup legacy files without prompting',
      },
      {
        name: 'profile',
        description: 'Override global config profile (core or custom)',
        takesValue: true,
        values: ['core', 'custom'],
      },
    ],
  },
  {
    name: 'update',
    description: 'Update OpenSpec instruction files',
    acceptsPositional: true,
    positionalType: 'path',
    positionals: [{ name: 'path', type: 'path', optional: true }],
    flags: [
      {
        name: 'force',
        description: 'Force update even when tools are up to date',
      },
    ],
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
      {
        name: 'sort',
        description: 'Sort order: "recent" (default) or "name"',
        takesValue: true,
        values: ['recent', 'name'],
      },
      COMMON_FLAGS.json,
      COMMON_FLAGS.store,
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
    positionals: [{ name: 'item-name', type: 'change-or-spec-id', optional: true }],
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
      COMMON_FLAGS.store,
    ],
  },
  {
    name: 'show',
    description: 'Show a change or spec',
    acceptsPositional: true,
    positionalType: 'change-or-spec-id',
    positionals: [{ name: 'item-name', type: 'change-or-spec-id', optional: true }],
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
      COMMON_FLAGS.store,
    ],
  },
  {
    name: 'archive',
    description: 'Archive a completed change and update main specs',
    acceptsPositional: true,
    positionalType: 'change-id',
    positionals: [{ name: 'change-name', type: 'change-id', optional: true }],
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
      {
        name: 'json',
        description: 'Output as JSON (non-interactive)',
      },
      COMMON_FLAGS.store,
    ],
  },
  {
    name: 'status',
    description: 'Display artifact completion status for a change',
    flags: [
      {
        name: 'change',
        description: 'Change name to show status for',
        takesValue: true,
      },
      {
        name: 'schema',
        description: 'Schema override',
        takesValue: true,
      },
      COMMON_FLAGS.json,
      COMMON_FLAGS.store,
    ],
  },
  {
    name: 'instructions',
    description: 'Output enriched instructions for creating an artifact or applying tasks',
    acceptsPositional: true,
    positionals: [{ name: 'artifact', optional: true }],
    flags: [
      {
        name: 'change',
        description: 'Change name',
        takesValue: true,
      },
      {
        name: 'schema',
        description: 'Schema override',
        takesValue: true,
      },
      COMMON_FLAGS.json,
      COMMON_FLAGS.store,
    ],
  },
  {
    name: 'templates',
    description: 'Show resolved template paths for all artifacts in a schema',
    flags: [
      {
        name: 'schema',
        description: 'Schema to use',
        takesValue: true,
      },
      COMMON_FLAGS.json,
    ],
  },
  {
    name: 'schemas',
    description: 'List available workflow schemas with descriptions',
    flags: [
      COMMON_FLAGS.json,
    ],
  },
  {
    name: 'new',
    description: 'Create new items',
    flags: [],
    subcommands: [
      {
        name: 'change',
        description: 'Create a new change directory',
        acceptsPositional: true,
        positionals: [{ name: 'name' }],
        flags: [
          {
            name: 'description',
            description: 'Description to add to README.md',
            takesValue: true,
          },
          {
            name: 'goal',
            description: 'Optional goal metadata to store with the change',
            takesValue: true,
          },
          {
            name: 'schema',
            description: 'Workflow schema to use',
            takesValue: true,
          },
          COMMON_FLAGS.json,
          COMMON_FLAGS.store,
        ],
      },
    ],
  },
  {
    name: 'store',
    description:
      'Create and manage stores - standalone OpenSpec repos you register on this machine',
    flags: [],
    subcommands: [
      {
        name: 'setup',
        description: 'Create or register a local store',
        acceptsPositional: true,
        positionals: [{ name: 'id', optional: true }],
        flags: [
          {
            name: 'path',
            description: 'Directory to use for the store',
            takesValue: true,
          },
          {
            name: 'init-git',
            description: 'Initialize a Git repository in the store',
          },
          {
            name: 'no-init-git',
            description: 'Skip Git repository initialization',
          },
          {
            name: 'remote',
            description: 'Canonical clone source recorded in store.yaml',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'register',
        description: 'Register an existing store directory',
        acceptsPositional: true,
        positionals: [{ name: 'path', type: 'path', optional: true }],
        flags: [
          {
            name: 'id',
            description: 'Store id',
            takesValue: true,
          },
          {
            name: 'yes',
            description: 'Confirm creating store identity metadata',
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'unregister',
        description: 'Forget a local store registration without deleting files',
        acceptsPositional: true,
        positionals: [{ name: 'id' }],
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'remove',
        description: 'Forget a local store registration and delete its local folder',
        acceptsPositional: true,
        positionals: [{ name: 'id' }],
        flags: [
          {
            name: 'yes',
            description: 'Confirm local store folder deletion',
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'list',
        description: 'List registered stores',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'ls',
        description: 'List registered stores',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'doctor',
        description: 'Check local store registration and metadata',
        acceptsPositional: true,
        positionals: [{ name: 'id', optional: true }],
        flags: [
          COMMON_FLAGS.json,
        ],
      },
    ],
  },
  {
    name: 'context',
    description: 'Print the working context for the resolved OpenSpec root',
    flags: [
      COMMON_FLAGS.json,
      COMMON_FLAGS.store,
      {
        name: 'code-workspace',
        description: 'Also write a VS Code workspace file for the set',
        takesValue: true,
      },
      {
        name: 'force',
        description: 'Overwrite an existing --code-workspace file',
      },
    ],
  },
  {
    name: 'doctor',
    description: 'Report relationship health for the resolved OpenSpec root',
    flags: [
      COMMON_FLAGS.json,
      COMMON_FLAGS.store,
    ],
  },
  {
    name: 'workset',
    description: 'Compose, keep, and open personal working views (purely local)',
    flags: [],
    subcommands: [
      {
        name: 'create',
        description: 'Compose and save a named working view of folders you choose',
        acceptsPositional: true,
        positionals: [{ name: 'name', optional: true }],
        flags: [
          {
            name: 'member',
            description:
              'Member folder as <path> or <name>=<path>; repeatable, first is the primary',
            takesValue: true,
          },
          {
            name: 'tool',
            description: 'Preferred tool to open this workset with',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'list',
        description: 'Show saved worksets with their members',
        flags: [COMMON_FLAGS.json],
      },
      {
        name: 'ls',
        description: 'Show saved worksets with their members',
        flags: [COMMON_FLAGS.json],
      },
      {
        name: 'open',
        description:
          'Open a saved workset in your tool (editor window or agent session)',
        acceptsPositional: true,
        positionals: [{ name: 'name' }],
        flags: [
          {
            name: 'tool',
            description: 'Open with this tool just this once',
            takesValue: true,
          },
        ],
      },
      {
        name: 'remove',
        description: 'Delete a saved workset (member folders are never touched)',
        acceptsPositional: true,
        positionals: [{ name: 'name' }],
        flags: [
          {
            name: 'yes',
            description: 'Confirm removal non-interactively',
          },
          COMMON_FLAGS.json,
        ],
      },
    ],
  },
  {
    name: 'feedback',
    description: 'Submit feedback about OpenSpec',
    acceptsPositional: true,
    positionals: [{ name: 'message' }],
    flags: [
      {
        name: 'body',
        description: 'Detailed description for the feedback',
        takesValue: true,
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
        positionals: [{ name: 'change-name', type: 'change-id', optional: true }],
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
        positionals: [{ name: 'change-name', type: 'change-id', optional: true }],
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
        positionals: [{ name: 'spec-id', type: 'spec-id', optional: true }],
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
        positionals: [{ name: 'spec-id', type: 'spec-id', optional: true }],
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
        positionals: [{ name: 'shell', type: 'shell', optional: true }],
        flags: [],
      },
      {
        name: 'install',
        description: 'Install completion script for a shell',
        acceptsPositional: true,
        positionalType: 'shell',
        positionals: [{ name: 'shell', type: 'shell', optional: true }],
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
        positionals: [{ name: 'shell', type: 'shell', optional: true }],
        flags: [
          {
            name: 'yes',
            short: 'y',
            description: 'Skip confirmation prompts',
          },
        ],
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
        positionals: [{ name: 'key' }],
        flags: [],
      },
      {
        name: 'set',
        description: 'Set a value (auto-coerce types)',
        acceptsPositional: true,
        positionals: [{ name: 'key' }, { name: 'value' }],
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
        positionals: [{ name: 'key' }],
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
      {
        name: 'profile',
        description: 'Configure workflow profile (interactive picker or preset shortcut)',
        acceptsPositional: true,
        positionals: [{ name: 'preset', optional: true }],
        flags: [],
      },
    ],
  },
  {
    name: 'schema',
    description: 'Manage workflow schemas',
    flags: [],
    subcommands: [
      {
        name: 'which',
        description: 'Show where a schema resolves from',
        acceptsPositional: true,
        positionalType: 'schema-name',
        positionals: [{ name: 'name', type: 'schema-name', optional: true }],
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'all',
            description: 'List all schemas with their resolution sources',
          },
        ],
      },
      {
        name: 'validate',
        description: 'Validate a schema structure and templates',
        acceptsPositional: true,
        positionalType: 'schema-name',
        positionals: [{ name: 'name', type: 'schema-name', optional: true }],
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'verbose',
            description: 'Show detailed validation steps',
          },
        ],
      },
      {
        name: 'fork',
        description: 'Copy an existing schema to project for customization',
        acceptsPositional: true,
        positionalType: 'schema-name',
        positionals: [
          { name: 'source', type: 'schema-name' },
          { name: 'name', optional: true },
        ],
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'force',
            description: 'Overwrite existing destination',
          },
        ],
      },
      {
        name: 'init',
        description: 'Create a new project-local schema',
        acceptsPositional: true,
        positionals: [{ name: 'name' }],
        flags: [
          COMMON_FLAGS.json,
          {
            name: 'description',
            description: 'Schema description',
            takesValue: true,
          },
          {
            name: 'artifacts',
            description: 'Comma-separated artifact IDs',
            takesValue: true,
          },
          {
            name: 'default',
            description: 'Set as project default schema',
          },
          {
            name: 'no-default',
            description: 'Do not prompt to set as default',
          },
          {
            name: 'force',
            description: 'Overwrite existing schema',
          },
        ],
      },
    ],
  },
];
