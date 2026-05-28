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
            description: 'Workspace product goal to store with the change',
            takesValue: true,
          },
          {
            name: 'areas',
            description: 'Comma-separated affected workspace link names',
            takesValue: true,
          },
          {
            name: 'initiative',
            description: 'Link the repo-local change to an initiative',
            takesValue: true,
          },
          {
            name: 'store',
            description: 'Context store id for --initiative',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root for --initiative',
            takesValue: true,
          },
          {
            name: 'schema',
            description: 'Workflow schema to use',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
    ],
  },
  {
    name: 'set',
    description: 'Set checked-in OpenSpec metadata',
    flags: [],
    subcommands: [
      {
        name: 'change',
        description: 'Set repo-local change metadata',
        acceptsPositional: true,
        positionalType: 'change-id',
        positionals: [{ name: 'name', type: 'change-id' }],
        flags: [
          {
            name: 'initiative',
            description: 'Link the repo-local change to an initiative',
            takesValue: true,
          },
          {
            name: 'store',
            description: 'Context store id for --initiative',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root for --initiative',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
    ],
  },
  {
    name: 'workspace',
    description: 'Set up and inspect coordination workspaces',
    flags: [],
    subcommands: [
      {
        name: 'setup',
        description: 'Set up a workspace and link existing repos or folders',
        flags: [
          {
            name: 'name',
            description: 'Workspace name',
            takesValue: true,
          },
          {
            name: 'link',
            description: 'Repo or folder link. Use <path> or <name>=<path>',
            takesValue: true,
          },
          {
            name: 'opener',
            description: 'Preferred opener: codex-cli, claude, github-copilot, or editor',
            takesValue: true,
            values: ['codex-cli', 'claude', 'github-copilot', 'editor'],
          },
          {
            name: 'tools',
            description: 'Install OpenSpec skills for agents (all, none, or comma-separated tool IDs)',
            takesValue: true,
          },
          COMMON_FLAGS.json,
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'list',
        description: 'List known OpenSpec workspaces',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'ls',
        description: 'List known OpenSpec workspaces',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'link',
        description: 'Link an existing repo or folder to a workspace',
        acceptsPositional: true,
        positionals: [
          { name: 'name-or-path', type: 'path', optional: true },
          { name: 'path', type: 'path', optional: true },
        ],
        flags: [
          {
            name: 'workspace',
            description: 'Workspace name from local workspace views',
            takesValue: true,
          },
          COMMON_FLAGS.json,
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'relink',
        description: 'Update the local path for an existing workspace link',
        acceptsPositional: true,
        positionals: [
          { name: 'name' },
          { name: 'path', type: 'path' },
        ],
        flags: [
          {
            name: 'workspace',
            description: 'Workspace name from local workspace views',
            takesValue: true,
          },
          COMMON_FLAGS.json,
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'doctor',
        description: 'Check what a workspace can resolve on this machine',
        flags: [
          {
            name: 'workspace',
            description: 'Workspace name from local workspace views',
            takesValue: true,
          },
          COMMON_FLAGS.json,
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'update',
        description: 'Refresh workspace-local OpenSpec guidance and agent skills',
        acceptsPositional: true,
        positionals: [{ name: 'name', optional: true }],
        flags: [
          {
            name: 'workspace',
            description: 'Workspace name from local workspace views',
            takesValue: true,
          },
          {
            name: 'tools',
            description: 'Select agents for workspace skills-only delivery; global profile selects workflows',
            takesValue: true,
          },
          COMMON_FLAGS.json,
          COMMON_FLAGS.noInteractive,
        ],
      },
      {
        name: 'open',
        description: 'Open a workspace in an agent or VS Code editor',
        acceptsPositional: true,
        positionals: [{ name: 'name', optional: true }],
        flags: [
          {
            name: 'workspace',
            description: 'Workspace name from local workspace views',
            takesValue: true,
          },
          {
            name: 'initiative',
            description: 'Open an initiative as a local workspace view',
            takesValue: true,
          },
          {
            name: 'store',
            description: 'Context store id for --initiative',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root for --initiative',
            takesValue: true,
          },
          {
            name: 'agent',
            description: 'Use an agent for this session: codex-cli, claude, or github-copilot',
            takesValue: true,
            values: ['codex-cli', 'claude', 'github-copilot'],
          },
          {
            name: 'editor',
            description: 'Open the workspace in VS Code editor mode',
          },
          {
            name: 'prepare-only',
            description: 'Unsupported: preview surfaces belong to a future context/query command',
          },
          COMMON_FLAGS.json,
          {
            name: 'change',
            description: 'Unsupported: change-scoped open belongs to future workspace change planning',
            takesValue: true,
          },
          COMMON_FLAGS.noInteractive,
        ],
      },
    ],
  },
  {
    name: 'context-store',
    description: 'Set up and inspect context stores',
    flags: [],
    subcommands: [
      {
        name: 'setup',
        description: 'Create or register a local context store',
        acceptsPositional: true,
        positionals: [{ name: 'id', optional: true }],
        flags: [
          {
            name: 'path',
            description: 'Directory to use for the context store',
            takesValue: true,
          },
          {
            name: 'init-git',
            description: 'Initialize a Git repository in the context store',
          },
          {
            name: 'no-init-git',
            description: 'Skip Git repository initialization',
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'register',
        description: 'Register an existing context store directory',
        acceptsPositional: true,
        positionals: [{ name: 'path', type: 'path', optional: true }],
        flags: [
          {
            name: 'id',
            description: 'Context store id',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'unregister',
        description: 'Forget a local context-store registration without deleting files',
        acceptsPositional: true,
        positionals: [{ name: 'id' }],
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'remove',
        description: 'Forget a local context-store registration and delete its local folder',
        acceptsPositional: true,
        positionals: [{ name: 'id' }],
        flags: [
          {
            name: 'yes',
            description: 'Confirm local context-store folder deletion',
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'list',
        description: 'List registered context stores',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'ls',
        description: 'List registered context stores',
        flags: [
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'doctor',
        description: 'Check local context-store registration and metadata',
        acceptsPositional: true,
        positionals: [{ name: 'id', optional: true }],
        flags: [
          COMMON_FLAGS.json,
        ],
      },
    ],
  },
  {
    name: 'initiative',
    description: 'Create and list coordinated initiatives',
    flags: [],
    subcommands: [
      {
        name: 'create',
        description: 'Create an initiative in a context store',
        acceptsPositional: true,
        positionals: [{ name: 'id', optional: true }],
        flags: [
          {
            name: 'store',
            description: 'Context store id from the local context-store registry',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root',
            takesValue: true,
          },
          {
            name: 'title',
            description: 'Initiative title',
            takesValue: true,
          },
          {
            name: 'summary',
            description: 'Initiative summary',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'show',
        description: 'Show where an initiative lives and how to read it',
        acceptsPositional: true,
        positionals: [{ name: 'id' }],
        flags: [
          {
            name: 'store',
            description: 'Context store id from the local context-store registry',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'list',
        description: 'List initiatives across registered context stores',
        flags: [
          {
            name: 'store',
            description: 'Context store id from the local context-store registry',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root',
            takesValue: true,
          },
          COMMON_FLAGS.json,
        ],
      },
      {
        name: 'ls',
        description: 'List initiatives across registered context stores',
        flags: [
          {
            name: 'store',
            description: 'Context store id from the local context-store registry',
            takesValue: true,
          },
          {
            name: 'store-path',
            description: 'Existing local context store root',
            takesValue: true,
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
