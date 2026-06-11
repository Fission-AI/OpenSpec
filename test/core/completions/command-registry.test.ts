import { describe, expect, it } from 'vitest';
import type { Command } from 'commander';

import { COMMAND_REGISTRY } from '../../../src/core/completions/command-registry.js';
import { COMMON_FLAGS } from '../../../src/core/completions/shared-flags.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { getCommandPath, program } from '../../../src/cli/index.js';
import type {
  CommandDefinition,
  FlagDefinition,
  PositionalDefinition,
} from '../../../src/core/completions/types.js';

function command(name: string) {
  return COMMAND_REGISTRY.find((entry) => entry.name === name);
}

describe('command completion registry', () => {
  function registryChildren(commandList: CommandDefinition[] | undefined): Map<string, CommandDefinition> {
    return new Map((commandList ?? []).map((entry) => [entry.name, entry]));
  }

  function visibleChildCommands(command: Command): Command[] {
    return command.commands.filter((child) => !(child as unknown as { _hidden?: boolean })._hidden);
  }

  function commandAliases(command: Command): string[] {
    return command.aliases();
  }

  interface FlagShape {
    name: string;
    short?: string;
    takesValue?: true;
  }

  interface PositionalShape {
    name: string;
    optional?: true;
  }

  function normalizeName(name: string): string {
    return name.replace(/[^a-z0-9]/giu, '').toLowerCase();
  }

  function toFlagShape(flag: FlagDefinition): FlagShape {
    return {
      name: flag.name,
      ...(flag.short ? { short: flag.short } : {}),
      ...(flag.takesValue ? { takesValue: true as const } : {}),
    };
  }

  function toCommanderFlagShape(command: Command): FlagShape[] {
    return command.options
      .filter((option) => !option.hidden)
      .map((option) => ({
        name: option.long.replace(/^--/u, ''),
        ...(option.short ? { short: option.short.replace(/^-/, '') } : {}),
        ...(option.required || option.optional ? { takesValue: true as const } : {}),
      }));
  }

  function sortedFlags(flags: FlagShape[]): FlagShape[] {
    return [...flags].sort((left, right) => left.name.localeCompare(right.name));
  }

  function toPositionalShape(positional: PositionalDefinition): PositionalShape {
    return {
      name: normalizeName(positional.name),
      ...(positional.optional ? { optional: true as const } : {}),
    };
  }

  function toCommanderPositionalShapes(command: Command): PositionalShape[] {
    return command.registeredArguments.map((argument) => ({
      name: normalizeName(argument.name()),
      ...(argument.required ? {} : { optional: true as const }),
    }));
  }

  function assertPositionalParity(
    commandPath: string,
    command: Command,
    entry: CommandDefinition
  ): void {
    const commandPositionals = toCommanderPositionalShapes(command);

    if (commandPositionals.length === 0) {
      expect(entry.acceptsPositional ?? false, `${commandPath} accepts positional`).toBe(false);
      expect(entry.positionals ?? [], `${commandPath} positionals`).toEqual([]);
      return;
    }

    expect(entry.acceptsPositional, `${commandPath} accepts positional`).toBe(true);
    expect(
      (entry.positionals ?? []).map(toPositionalShape),
      `${commandPath} positionals`
    ).toEqual(commandPositionals);
  }

  function assertCommandShape(
    commandPath: string,
    command: Command,
    entry: CommandDefinition
  ): void {
    expect(sortedFlags(entry.flags.map(toFlagShape)), `${commandPath} flags`).toEqual(
      sortedFlags(toCommanderFlagShape(command))
    );
    assertPositionalParity(commandPath, command, entry);
  }

  function assertRegistryParity(
    command: Command,
    registry: CommandDefinition[],
    parentPath = ''
  ): void {
    const registryByName = registryChildren(registry);

    for (const child of visibleChildCommands(command)) {
      const commandPath = parentPath ? `${parentPath} ${child.name()}` : child.name();
      const names = [child.name(), ...commandAliases(child)];
      for (const name of names) {
        expect(registryByName.has(name), `missing completion entry for ${commandPath} alias ${name}`).toBe(true);
      }

      const entry = registryByName.get(child.name());
      if (!entry) {
        continue;
      }

      assertCommandShape(commandPath, child, entry);

      for (const alias of commandAliases(child)) {
        const aliasEntry = registryByName.get(alias);
        expect(aliasEntry, `${commandPath} alias ${alias}`).toBeDefined();
        if (aliasEntry) {
          assertCommandShape(`${commandPath} alias ${alias}`, child, aliasEntry);
        }
      }

      assertRegistryParity(child, entry.subcommands ?? [], commandPath);
    }
  }

  it('matches visible Commander command flags and aliases', () => {
    assertRegistryParity(program, COMMAND_REGISTRY);
  });

  it('uses one --store description on every lifecycle command', () => {
    const expected = COMMON_FLAGS.store.description;
    const seen: string[] = [];

    function walk(command: Command, parentPath: string): void {
      for (const child of command.commands) {
        const commandPath = parentPath ? `${parentPath} ${child.name()}` : child.name();
        const storeOption = child.options.find((option) => option.long === '--store');
        if (storeOption) {
          seen.push(commandPath);
          expect(storeOption.description, `${commandPath} --store description`).toBe(expected);
        }
        walk(child, commandPath);
      }
    }

    walk(program, '');
    expect(seen.sort()).toEqual([
      'archive',
      'context',
      'doctor',
      'instructions',
      'list',
      'new change',
      'show',
      'status',
      'validate',
    ]);

    // The store-selection guidance interpolated into every generated skill
    // enumerates exactly these commands; drift here means agents are taught
    // a stale flag surface.
    for (const commandPath of seen) {
      expect(STORE_SELECTION_GUIDANCE, `guidance names ${commandPath}`).toContain(
        `\`${commandPath}\``
      );
    }
  });

  it('tracks store subcommands under the store: telemetry path', () => {
    const storeGroup = program.commands.find((child) => child.name() === 'store');
    expect(storeGroup).toBeDefined();
    const setup = storeGroup?.commands.find((child) => child.name() === 'setup');
    expect(setup).toBeDefined();
    expect(getCommandPath(setup as Command)).toBe('store:setup');
  });

  it('tracks top-level workflow commands', () => {
    for (const name of ['status', 'instructions', 'templates', 'schemas', 'new']) {
      expect(command(name), `${name} command`).toBeDefined();
    }

    expect(command('set'), 'set command should be removed').toBeUndefined();

    const newChange = command('new')?.subcommands?.find((entry) => entry.name === 'change');
    expect(newChange?.flags.map((flag) => flag.name)).toEqual([
      'description',
      'goal',
      'schema',
      'json',
      'store',
    ]);

    const storeFlag = newChange?.flags.find((flag) => flag.name === 'store');
    expect(storeFlag?.description).toContain('OpenSpec root');
    expect(newChange?.flags.map((flag) => flag.name)).not.toContain('initiative');
    expect(newChange?.flags.map((flag) => flag.name)).not.toContain('areas');
    expect(newChange?.flags.map((flag) => flag.name)).not.toContain('store-path');
  });

  it('advertises --store on the supported root-selection commands', () => {
    for (const name of ['list', 'show', 'validate', 'archive', 'status', 'instructions']) {
      const entry = command(name);
      const store = entry?.flags.find((flag) => flag.name === 'store');
      expect(store, `${name} --store flag`).toBeDefined();
      expect(store?.description).toContain('OpenSpec root');
      expect(entry?.flags.map((flag) => flag.name)).not.toContain('store-path');
    }
  });

  it('tracks store commands and aliases', () => {
    const store = command('store');

    expect(store?.subcommands?.map((entry) => entry.name)).toEqual([
      'setup',
      'register',
      'unregister',
      'remove',
      'list',
      'ls',
      'doctor',
    ]);

    const setup = store?.subcommands?.find((entry) => entry.name === 'setup');
    expect(setup?.flags.map((flag) => flag.name)).toEqual([
      'path',
      'init-git',
      'no-init-git',
      'remote',
      'json',
    ]);

    const remove = store?.subcommands?.find((entry) => entry.name === 'remove');
    expect(remove?.flags.map((flag) => flag.name)).toEqual([
      'yes',
      'json',
    ]);
  });
});
