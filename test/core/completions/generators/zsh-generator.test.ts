import { describe, it, expect } from 'vitest';
import { ZshGenerator } from '../../../../src/core/completions/generators/zsh-generator.js';
import { CommandDefinition } from '../../../../src/core/completions/types.js';

describe('ZshGenerator', () => {
  let generator: ZshGenerator;

  beforeEach(() => {
    generator = new ZshGenerator();
  });

  describe('interface compliance', () => {
    it('should have shell property set to "zsh"', () => {
      expect(generator.shell).toBe('zsh');
    });

    it('should implement generate method', () => {
      expect(typeof generator.generate).toBe('function');
    });
  });

  describe('generate', () => {
    it('should generate valid zsh completion script with header', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize OpenSpec',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('#compdef openspec');
      expect(script).toContain('# Zsh completion script for OpenSpec CLI');
      expect(script).toContain('_openspec() {');
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

      expect(script).toContain("'init:Initialize OpenSpec'");
      expect(script).toContain("'validate:Validate specs'");
      expect(script).toContain("'show:Show a spec'");
    });

    it('should generate command completion functions', () => {
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
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_init() {');
      expect(script).toContain('_openspec_validate() {');
    });

    it('should handle commands with flags', () => {
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
      expect(script).toContain('[Enable strict mode]');
      expect(script).toContain('--json');
      expect(script).toContain('[Output as JSON]');
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

      expect(script).toContain("'(-r --requirement)'{-r,--requirement}'[Show specific requirement]:value:'");
      expect(script).toContain('[Show specific requirement]');
    });

    it('should handle flags that take values', () => {
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
      expect(script).toContain('[Specify item type]');
      expect(script).toContain(':value:(change spec)');
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
      expect(script).toContain('[Max concurrent validations]');
      expect(script).toContain(':value:');
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

      expect(script).toContain("'show:Show a change'");
      expect(script).toContain("'list:List changes'");
      expect(script).toContain('_openspec_change_show() {');
      expect(script).toContain('_openspec_change_list() {');
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

      expect(script).toContain("'*: :_openspec_complete_changes'");
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

      expect(script).toContain("'*: :_openspec_complete_specs'");
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

      expect(script).toContain("'*: :_openspec_complete_items'");
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

      expect(script).toContain("'*:path:_files'");
    });

    it('should escape special characters in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: "Test with 'quotes' and [brackets] and back\\slash and colon:",
          flags: [
            {
              name: 'flag',
              description: "Special chars: 'quotes' [brackets] back\\slash colon:",
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain("\\'quotes\\'");
      expect(script).toContain('\\[brackets\\]');
      expect(script).toContain('\\\\slash');
      expect(script).toContain('\\:');
    });

    it('should sanitize command names with hyphens for function names', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'my-command',
          description: 'A hyphenated command',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('_openspec_my_command() {');
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

      expect(script).toContain('_openspec_spec() {');
      expect(script).toContain('_openspec_spec_validate() {');
      expect(script).toContain('--strict');
      expect(script).toContain('--json');
      expect(script).toContain("'*: :_openspec_complete_specs'");
    });

    it('should generate script that ends with compdef registration', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script.trim().endsWith('compdef _openspec openspec')).toBe(true);
    });

    it('should handle empty command list', () => {
      const commands: CommandDefinition[] = [];

      const script = generator.generate(commands);

      expect(script).toContain('#compdef openspec');
      expect(script).toContain('_openspec() {');
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

      expect(script).toContain('_openspec_view() {');
      expect(script).toContain('_arguments');
    });
  });
});
