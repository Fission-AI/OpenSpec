import { afterEach, describe, expect, it } from 'vitest';
import { runCLI } from '../../helpers/run-cli.js';
import { workspaceSandbox, type WorkspaceSandbox } from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace sandbox CLI compatibility', () => {
  it('runs CLI JSON commands inside attached repos without spinner noise', async () => {
    const sandbox = await createSandbox();

    const result = await runCLI(['list', '--json'], {
      cwd: sandbox.repoPaths.app,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});
