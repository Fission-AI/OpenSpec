import { describe, it, expect, beforeEach } from 'vitest';
import { PowerShellGenerator } from '../../../../src/core/completions/generators/powershell-generator.js';
import { CommandDefinition } from '../../../../src/core/completions/types.js';

describe('PowerShellGenerator', () => {
	let generator: PowerShellGenerator;

	beforeEach(() => {
		generator = new PowerShellGenerator();
	});

	describe('interface compliance', () => {
		it('should have shell property set to "powershell"', () => {
			expect(generator.shell).toBe('powershell');
		});

		it('should implement generate method', () => {
			expect(typeof generator.generate).toBe('function');
		});
	});

	describe('generate', () => {
		it('should generate valid PowerShell completion script with header', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'init',
					description: 'Initialize OpenSpec',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			expect(script).toContain('# PowerShell completion script for OpenSpec CLI');
			expect(script).toContain('$openspecCompleter = {');
			expect(script).toContain('Register-ArgumentCompleter');
		});

		it('should register argument completer for openspec command', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'init',
					description: 'Initialize OpenSpec',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			expect(script).toContain('Register-ArgumentCompleter -CommandName openspec');
			expect(script).toContain('-ScriptBlock $openspecCompleter');
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

			expect(script).toContain('"init"');
			expect(script).toContain('Initialize OpenSpec');
			expect(script).toContain('"validate"');
			expect(script).toContain('Validate specs');
			expect(script).toContain('"show"');
			expect(script).toContain('Show a spec');
		});

		it('should use CompletionResult objects for completions', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'init',
					description: 'Initialize OpenSpec',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			expect(script).toContain('[System.Management.Automation.CompletionResult]::new(');
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
			expect(script).toContain('Enable strict mode');
			expect(script).toContain('--json');
			expect(script).toContain('Output as JSON');
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
			expect(script).toContain('Show specific requirement');
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
			expect(script).toContain('Enable strict mode');
			expect(script).toContain('Output file');
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

			expect(script).toContain('"change"');
			expect(script).toContain('"show"');
			expect(script).toContain('"list"');
			expect(script).toContain('Manage changes');
			expect(script).toContain('Show a change');
			expect(script).toContain('List changes');
		});

		it('should offer parent flags when command has both flags and subcommands', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'config',
					description: 'Manage configuration',
					flags: [
						{
							name: 'scope',
							short: 's',
							description: 'Configuration scope',
						},
						{
							name: 'json',
							description: 'Output as JSON',
						},
					],
					subcommands: [
						{
							name: 'set',
							description: 'Set a config value',
							flags: [],
						},
						{
							name: 'get',
							description: 'Get a config value',
							flags: [],
						},
					],
				},
			];

			const script = generator.generate(commands);

			// Should check for flag prefix before offering subcommands
			expect(script).toContain('if ($wordToComplete -like "-*")');
			// Should include parent command flags
			expect(script).toContain('-s');
			expect(script).toContain('--scope');
			expect(script).toContain('--json');
			// Should also include subcommands
			expect(script).toContain('"set"');
			expect(script).toContain('"get"');
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

			expect(script).toContain('Get-OpenSpecChanges');
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

			expect(script).toContain('Get-OpenSpecSpecs');
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

			expect(script).toContain('Get-OpenSpecChanges');
			expect(script).toContain('Get-OpenSpecSpecs');
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

		it('should not include path completion helpers (PowerShell handles natively)', () => {
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

			// PowerShell handles path completion natively, so we just check the command is present
			expect(script).toContain('"init"');
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

			expect(script).toContain('function Get-OpenSpecChanges');
			expect(script).toContain('openspec __complete changes 2>$null');
			expect(script).toContain('-split');
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

			expect(script).toContain('function Get-OpenSpecSpecs');
			expect(script).toContain('openspec __complete specs 2>$null');
		});

		it('should escape double quotes in descriptions', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'test',
					description: 'Test with "quotes"',
					flags: [
						{
							name: 'flag',
							description: 'Special chars: "quotes"',
						},
					],
				},
			];

			const script = generator.generate(commands);

			// PowerShell escapes double quotes by doubling them
			expect(script).toContain('""quotes""');
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

			expect(script).toContain('"spec"');
			expect(script).toContain('"validate"');
			expect(script).toContain('--strict');
			expect(script).toContain('--json');
			expect(script).toContain('Get-OpenSpecSpecs');
		});

		it('should not emit trailing commas in @() arrays', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'config',
					description: 'Manage configuration',
					flags: [
						{
							name: 'scope',
							short: 's',
							description: 'Configuration scope',
						},
					],
					subcommands: [
						{
							name: 'get',
							description: 'Get a config value',
							flags: [],
						},
					],
				},
			];

			const script = generator.generate(commands);

			// PowerShell array literals (@(...)) can't have a trailing comma on the last element.
			expect(script).not.toMatch(/\},\s*\r?\n\s*\)/);
		});

		it('should handle empty command list', () => {
			const commands: CommandDefinition[] = [];

			const script = generator.generate(commands);

			expect(script).toContain('# PowerShell completion script');
			expect(script).toContain('$openspecCompleter = {');
			expect(script).toContain('Register-ArgumentCompleter');
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

			expect(script).toContain('"view"');
			expect(script).toContain('Display dashboard');
		});

		it('should generate helper function that splits on tab character', () => {
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

			expect(script).toContain('function Get-OpenSpecChanges');
			// PowerShell uses -split with \\t for tab character
			expect(script).toContain('-split');
			expect(script).toContain('[0]');
		});
	});

	describe('security - command injection prevention', () => {
		it('should escape $() subexpressions in descriptions', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'test',
					description: 'Test command $(Get-Process)',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			// Should contain escaped version (backtick before $)
			expect(script).toContain('`$');
			// Should have backtick before $( to escape it
			expect(script).toMatch(/`\$\(Get-Process\)/);
		});

		it('should escape backticks in descriptions', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'test',
					description: 'Test with `n newline escape',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			// Should escape backticks (PowerShell escape character)
			expect(script).toContain('``');
		});

		it('should escape dollar signs in descriptions', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'test',
					description: 'Test with $env:PATH variable',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			// Should escape dollar signs
			expect(script).toContain('`$');
		});

		it('should escape double quotes in descriptions', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'test',
					description: 'Test with "quotes"',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			// Should escape double quotes (PowerShell string delimiter)
			expect(script).toContain('""');
		});

		it('should handle multiple PowerShell metacharacters together', () => {
			const commands: CommandDefinition[] = [
				{
					name: 'test',
					description: 'Dangerous: $(Remove-Item -Force) `n $env:HOME "quoted"',
					flags: [],
				},
			];

			const script = generator.generate(commands);

			// Should contain escaped versions of dangerous patterns
			expect(script).toContain('`$');  // Escaped dollar signs
			expect(script).toContain('``');  // Escaped backticks
			expect(script).toContain('""');  // Escaped double quotes

			// The escaped patterns should be present (backtick before $ and n)
			expect(script).toMatch(/`\$\(/);  // `$( instead of $(
			expect(script).toMatch(/``n/);     // ``n instead of `n
		});
	});
});
