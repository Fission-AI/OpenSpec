import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cliProjectRoot, runCLI } from '../../helpers/run-cli.js';

describe('workspace guidance surfaces', () => {
  it('documents when workspace mode fits and the supported flow in shipped help and docs', async () => {
    const helpResult = await runCLI(['workspace', '--help']);
    const workspaceGuide = await fs.readFile(path.join(cliProjectRoot, 'docs', 'workspace.md'), 'utf-8');
    const cliReference = await fs.readFile(path.join(cliProjectRoot, 'docs', 'cli.md'), 'utf-8');
    const readme = await fs.readFile(path.join(cliProjectRoot, 'README.md'), 'utf-8');

    expect(helpResult.exitCode).toBe(0);
    expect(helpResult.stderr).toBe('');
    expect(helpResult.stdout).toContain('Manage OpenSpec workspaces for cross-repo planning');
    expect(helpResult.stdout).toContain('update-repo [options] <alias>');
    expect(helpResult.stdout).toContain('targets [options] <change>');
    expect(helpResult.stdout).toContain('open [options]');

    expect(workspaceGuide).toContain('## When To Use Workspace Mode');
    expect(workspaceGuide).toContain('## Supported CLI Flow');
    expect(workspaceGuide).toContain('## Re-Enter An Existing Workspace');
    expect(workspaceGuide).toContain('## Hand Off Work To Another Repo Owner');
    expect(workspaceGuide).toContain('Plan centrally, execute locally, preserve repo ownership.');
    expect(workspaceGuide).toContain('openspec workspace update-repo <alias>');
    expect(workspaceGuide).toContain('openspec workspace targets <id> --add <alias-a,alias-b>');
    expect(workspaceGuide).toContain('fails instead of silently mutating the workspace target set');

    expect(cliReference).toContain(
      'Coordinate cross-repo planning without collapsing repo ownership'
    );
    expect(cliReference).toContain('workspace update-repo');
    expect(cliReference).toContain('workspace targets');
    expect(cliReference).toContain('workspace open');
    expect(cliReference).toContain('fails instead of silently rewriting the target set');

    expect(readme).toContain('docs/workspace.md');
    expect(readme).toContain('Workspace Mode');
  });
});
