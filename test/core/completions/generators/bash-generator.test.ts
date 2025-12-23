import { describe, it, expect, beforeEach } from 'vitest';
import { BashGenerator } from '../../../../src/core/completions/generators/bash-generator.js';
import { CommandDefinition } from '../../../../src/core/completions/types.js';

describe('BashGenerator', () => {
  let generator: BashGenerator;

  beforeEach(() => {
    generator = new BashGenerator();
  });

  describe('interface compliance', () => {
    it('should have shell property set to "bash"', () => {
      expect(generator.shell).toBe('bash');
    });

    it('should implement generate method', () => {
      expect(typeof generator.generate).toBe('function');
    });
  });

  describe('generate', () => {
    it('should generate valid bash completion script with header', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize OpenSpec',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('# Bash completion script for OpenSpec CLI');
      expect(script).toContain('_openspec_completion() {');
      expect(script).toContain('local cur prev words cword');
      expect(script).toContain('_init_completion || return');
    });

    it('should include all commands in the command list', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize OpenSpec',
          flags: [],
        },
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [],
        },
        {
          name: 'show',
          description: 'Show a spec',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('init');
      expect(script).toContain('validate');
      expect(script).toContain('show');
    });

    it('should handle commands with flags without short options', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [
            {
              name: 'strict',
              description: 'Enable strict mode',
            },
            {
              name: 'json',
              description: 'Output as JSON',
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('--strict');
      expect(script).toContain('--json');
    });

    it('should handle flags with short options', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'show',
          description: 'Show a spec',
          flags: [
            {
              name: 'requirement',
              short: 'r',
              description: 'Show specific requirement',
              takesValue: true,
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('-r');
      expect(script).toContain('--requirement');
    });

    it('should handle boolean flags vs value-taking flags', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [
            {
              name: 'strict',
              description: 'Enable strict mode',
            },
            {
              name: 'output',
              description: 'Output file',
              takesValue: true,
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('--strict');
      expect(script).toContain('--output');
    });

    it('should handle flags with enum values', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [
            {
              name: 'type',
              description: 'Specify item type',
              takesValue: true,
              values: ['change', 'spec'],
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('--type');
      expect(script).toContain('change');
      expect(script).toContain('spec');
    });

    it('should handle flags with takesValue but no specific values', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [
            {
              name: 'concurrency',
              description: 'Max concurrent validations',
              takesValue: true,
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('--concurrency');
    });

    it('should handle commands with subcommands', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'change',
          description: 'Manage changes',
          flags: [],
          subcommands: [
            {
              name: 'show',
              description: 'Show a change',
              flags: [],
            },
            {
              name: 'list',
              description: 'List changes',
              flags: [],
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('change)');
      expect(script).toContain('show');
      expect(script).toContain('list');
    });

    it('should handle positional arguments for change-id', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'archive',
          description: 'Archive a change',
          acceptsPositional: true,
          positionalType: 'change-id',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_complete_changes');
    });

    it('should handle positional arguments for spec-id', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'show-spec',
          description: 'Show a spec',
          acceptsPositional: true,
          positionalType: 'spec-id',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_complete_specs');
    });

    it('should handle positional arguments for change-or-spec-id', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'show',
          description: 'Show an item',
          acceptsPositional: true,
          positionalType: 'change-or-spec-id',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_complete_items');
    });

    it('should handle positional arguments for shell', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'generate',
          description: 'Generate completions',
          acceptsPositional: true,
          positionalType: 'shell',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('zsh');
      expect(script).toContain('bash');
      expect(script).toContain('fish');
      expect(script).toContain('powershell');
    });

    it('should handle positional arguments for paths', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize OpenSpec',
          acceptsPositional: true,
          positionalType: 'path',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('compgen -f');
    });

    it('should generate dynamic completion helper for changes', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'archive',
          description: 'Archive a change',
          acceptsPositional: true,
          positionalType: 'change-id',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_complete_changes() {');
      expect(script).toContain('openspec __complete changes 2>/dev/null');
      expect(script).toContain('cut -f1');
      expect(script).toContain('COMPREPLY=');
    });

    it('should generate dynamic completion helper for specs', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'show-spec',
          description: 'Show a spec',
          acceptsPositional: true,
          positionalType: 'spec-id',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_complete_specs() {');
      expect(script).toContain('openspec __complete specs 2>/dev/null');
      expect(script).toContain('cut -f1');
    });

    it('should generate dynamic completion helper for items (changes and specs)', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'show',
          description: 'Show an item',
          acceptsPositional: true,
          positionalType: 'change-or-spec-id',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_complete_items() {');
      expect(script).toContain('openspec __complete changes 2>/dev/null');
      expect(script).toContain('openspec __complete specs 2>/dev/null');
    });

    it('should handle complex nested subcommands with flags', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'spec',
          description: 'Manage specs',
          flags: [],
          subcommands: [
            {
              name: 'validate',
              description: 'Validate a spec',
              acceptsPositional: true,
              positionalType: 'spec-id',
              flags: [
                {
                  name: 'strict',
                  description: 'Enable strict mode',
                },
                {
                  name: 'json',
                  description: 'Output as JSON',
                },
              ],
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('spec)');
      expect(script).toContain('validate');
      expect(script).toContain('--strict');
      expect(script).toContain('--json');
      expect(script).toContain('_openspec_complete_specs');
    });

    it('should generate script that ends with complete registration', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script.trim().endsWith('complete -F _openspec_completion openspec')).toBe(true);
    });

    it('should handle empty command list', () => {
      const commands: CommandDefinition[] = [];

      const script = generator.generate(commands);

      expect(script).toContain('# Bash completion script');
      expect(script).toContain('_openspec_completion() {');
      expect(script).toContain('complete -F _openspec_completion openspec');
    });

    it('should handle commands with no flags', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'view',
          description: 'Display dashboard',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('view)');
    });
  });
});
