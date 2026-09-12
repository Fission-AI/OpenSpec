import { describe, it, expect } from 'vitest';
import { Command, Option } from 'commander';

import { isJsonRun, isCompletionRun, shouldDeferCompletionTip } from '../../src/cli/index.js';

/**
 * Reproduce the three ways `--json` reaches a command in the real CLI, so a
 * future refactor of the telemetry-notice guard can't silently reintroduce
 * first-run stdout pollution for `store --json` / `workset --json <sub>`.
 */
function buildProgram(capture: (command: Command) => void): Command {
  const program = new Command();
  program.name('openspec').exitOverride();
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  program.option('--no-color', 'Disable color output');
  program.hook('preAction', (_thisCommand, actionCommand) => {
    capture(actionCommand);
  });

  // 1. Leaf declares --json (e.g. `openspec status --json`).
  program
    .command('status')
    .option('--json', 'Output as JSON')
    .action(() => {});

  // 2. Permissive bare group that never declares --json and detects it from
  //    residual args (e.g. `openspec store --json`).
  const store = program.command('store');
  store.allowExcessArguments(true);
  store.allowUnknownOption(true);
  store.action(() => {});

  // 3. Parent group declares --json (read via optsWithGlobals) with its own
  //    subcommands (e.g. `openspec workset --json list`).
  const workset = program.command('workset');
  workset.addOption(new Option('--json', 'Output as JSON').hideHelp());
  workset
    .command('list')
    .option('--json', 'Output as JSON')
    .action(() => {});

  // 4. The completion group, whose runs must never carry the first-run tip.
  program.command('completion').command('install').action(() => {});

  return program;
}

describe('isJsonRun', () => {
  async function actionCommandFor(argv: string[]): Promise<Command> {
    let captured: Command | undefined;
    const program = buildProgram((command) => {
      captured = command;
    });
    await program.parseAsync(['node', 'openspec', ...argv]);
    if (!captured) throw new Error(`no action command captured for: ${argv.join(' ')}`);
    return captured;
  }

  it('detects --json declared on the leaf command', async () => {
    expect(isJsonRun(await actionCommandFor(['status', '--json']))).toBe(true);
  });

  it('detects --json as a residual arg on a permissive bare group', async () => {
    expect(isJsonRun(await actionCommandFor(['store', '--json']))).toBe(true);
  });

  it('detects --json on a parent group placed before the subcommand', async () => {
    expect(isJsonRun(await actionCommandFor(['workset', '--json', 'list']))).toBe(true);
  });

  it('detects --json declared on the subcommand leaf', async () => {
    expect(isJsonRun(await actionCommandFor(['workset', 'list', '--json']))).toBe(true);
  });

  it('is false when no --json is present', async () => {
    expect(isJsonRun(await actionCommandFor(['status']))).toBe(false);
  });

  it('is false for a bare group with unrelated residual args', async () => {
    expect(isJsonRun(await actionCommandFor(['store', 'bogus']))).toBe(false);
  });
});

describe('isCompletionRun', () => {
  /**
   * The completions tip must never fire for the commands that serve completions
   * themselves. `__complete` is the important one: generated completion scripts
   * call it on every Tab press with stderr redirected to /dev/null, so an
   * unsuppressed tip would be consumed invisibly and the user would never see it.
   */
  it.each([
    'completion',
    'completion:install',
    'completion:uninstall',
    'completion:generate',
    '__complete',
  ])('suppresses the completions tip for "%s"', (commandPath) => {
    expect(isCompletionRun(commandPath)).toBe(true);
  });

  it.each(['list', 'init', 'update', 'change:show', 'completions'])(
    'does not suppress the completions tip for "%s"',
    (commandPath) => {
      expect(isCompletionRun(commandPath)).toBe(false);
    }
  );
});

describe('shouldDeferCompletionTip', () => {
  /**
   * The tip must survive every run that cannot display it. Deferring (rather
   * than consuming) is what makes the one-shot hint actually reach a human:
   * agents and CI pipelines run this CLI far more often than people do.
   */
  function commandFor(argv: string[]): Command {
    let captured: Command | undefined;
    const program = buildProgram((command) => {
      captured = command;
    });
    program.parse(argv, { from: 'user' });
    if (!captured) {
      throw new Error(`no command captured for ${argv.join(' ')}`);
    }
    return captured;
  }

  it('shows the tip on a plain interactive run', () => {
    expect(shouldDeferCompletionTip(commandFor(['status']), true)).toBe(false);
  });

  it('defers when stderr is not a terminal', () => {
    expect(shouldDeferCompletionTip(commandFor(['status']), false)).toBe(true);
  });

  it('defers on a JSON run even with a terminal', () => {
    expect(shouldDeferCompletionTip(commandFor(['status', '--json']), true)).toBe(true);
  });

  it('defers on the completion commands themselves', () => {
    // isCompletionRun is unit-tested above, but nothing proved the policy
    // function actually consults it.
    expect(shouldDeferCompletionTip(commandFor(['completion', 'install']), true)).toBe(true);
  });
});
