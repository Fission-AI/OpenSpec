import { describe, expect, it } from 'vitest';
import { COMMAND_REGISTRY } from '../../../src/core/completions/command-registry.js';
import { CompletionFactory } from '../../../src/core/completions/factory.js';

describe('validation report completions', () => {
  const validate = COMMAND_REGISTRY.find((command) => command.name === 'validate')!;

  it('registers the report flag and both supported values', () => {
    expect(validate.flags.find((flag) => flag.name === 'report')).toMatchObject({
      takesValue: true,
      values: ['full', 'findings'],
    });
  });

  it.each(['zsh', 'bash', 'fish', 'powershell'] as const)(
    'includes the report flag in %s completions',
    (shell) => {
      const script = CompletionFactory.createGenerator(shell).generate([validate]);
      expect(script).toContain(shell === 'fish' ? '-l report' : '--report');
    },
  );

  it('offers both report values in zsh', () => {
    const script = CompletionFactory.createGenerator('zsh').generate([validate]);
    const reportLine = script.split('\n').find((line) => line.includes("'--report["));
    expect(reportLine).toContain('(full findings)');
  });

  it('offers both report values in fish', () => {
    const script = CompletionFactory.createGenerator('fish').generate([validate]);
    for (const value of ['full', 'findings']) {
      expect(script).toContain(`-l report -r -f -a '${value}'`);
    }
  });
});
