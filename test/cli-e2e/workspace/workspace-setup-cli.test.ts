import { describe, expect, it } from 'vitest';
import { runCLI } from '../../helpers/run-cli.js';

describe('workspace setup CLI e2e', () => {
  it('fails cleanly outside interactive mode', async () => {
    const result = await runCLI(['workspace', 'setup']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('\n');
    expect(result.stderr).toContain(
      'Interactive mode required. Run `openspec workspace setup` in an interactive terminal.'
    );
  });
});
